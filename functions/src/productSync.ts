/**
 * Product Sync Cloud Function
 * Fetches products from BeautyFeeds.io and Open Beauty Facts,
 * enriches them with ingredient safety, reviews, and AI explanations,
 * then stores in Firestore
 */

import { onCall, HttpsError } from 'firebase-functions/v2/https';
import * as admin from 'firebase-admin';
import { OpenBeautyFactsAdapter } from './adapters/OpenBeautyFactsAdapter';
import { BeautyFeedsAdapter } from './adapters/BeautyFeedsAdapter';
import { IngredientAdapter } from './adapters/IngredientAdapter';
import { GoogleReviewsAdapter } from './adapters/GoogleReviewsAdapter';
import { AIAggregator } from './ai/AIAggregator';
import { Product } from './types';

// Initialize Firebase Admin if not already initialized
try {
  if (!admin.apps.length) {
    admin.initializeApp();
  }
} catch (error: any) {
  // App already initialized, ignore error
  if (error.code !== 'app/duplicate-app') {
    throw error;
  }
}

const db = admin.firestore();

/**
 * Cloud Function: Sync Products from APIs
 * Fetches products from BeautyFeeds.io and Open Beauty Facts,
 * enriches with ingredient safety, reviews, sustainability info,
 * and stores in Firestore
 */
export const syncProducts = onCall(
  { 
    enforceAppCheck: false,
    region: 'northamerica-northeast1'
  },
  async (request) => {
    if (!request.auth) {
      throw new HttpsError(
        'unauthenticated',
        'User must be authenticated'
      );
    }

    try {
      const { tags = ['shampoo', 'conditioner', 'hair-care'], limit = 50 } = request.data;
      
      console.log(`[syncProducts] Starting sync with tags: ${tags.join(', ')}`);

      // Initialize adapters
      const obfAdapter = new OpenBeautyFactsAdapter();
      const bfAdapter = new BeautyFeedsAdapter();
      const ingredientAdapter = new IngredientAdapter();
      const reviewsAdapter = new GoogleReviewsAdapter();
      const aiAggregator = new AIAggregator();

      // Step 1: Fetch products from both sources
      console.log('[syncProducts] Fetching products from APIs');
      const [obfProducts, bfProducts] = await Promise.all([
        obfAdapter.searchProducts(tags, limit),
        bfAdapter.searchProducts(tags, limit),
      ]);

      console.log(
        `[syncProducts] Found ${obfProducts.length} from OpenBeautyFacts, ` +
        `${bfProducts.length} from BeautyFeeds`
      );

      // Step 2: Combine and deduplicate
      const allProducts = [...obfProducts, ...bfProducts];
      const uniqueProducts = allProducts.filter((product, index, self) =>
        index === self.findIndex((p) =>
          p.name.toLowerCase() === product.name.toLowerCase() &&
          p.brand.toLowerCase() === product.brand.toLowerCase()
        )
      );

      console.log(`[syncProducts] ${uniqueProducts.length} unique products after deduplication`);

      // Step 3: Enrich each product and store in Firestore
      const batch = db.batch();
      let enrichedCount = 0;

      for (const product of uniqueProducts.slice(0, limit)) {
        try {
          const enrichedProduct = await enrichSingleProduct(
            product,
            ingredientAdapter,
            reviewsAdapter,
            aiAggregator
          );

          // Store in Firestore
          const productRef = db.collection('products').doc(enrichedProduct.id);
          batch.set(productRef, {
            ...enrichedProduct,
            createdAt: admin.firestore.FieldValue.serverTimestamp(),
            updatedAt: admin.firestore.FieldValue.serverTimestamp(),
          }, { merge: true });

          enrichedCount++;
        } catch (error: any) {
          console.error(`[syncProducts] Error enriching product ${product.id}:`, error.message);
          // Continue with other products
        }
      }

      // Commit batch
      await batch.commit();

      console.log(`[syncProducts] Successfully synced ${enrichedCount} products`);

      return {
        success: true,
        productsSynced: enrichedCount,
        totalFound: uniqueProducts.length,
      };
    } catch (error: any) {
      console.error('[syncProducts] Error:', error);
      throw new HttpsError(
        'internal',
        `Failed to sync products: ${error.message}`
      );
    }
  }
);

/**
 * Enrich a single product with all data
 */
async function enrichSingleProduct(
  product: Product,
  ingredientAdapter: IngredientAdapter,
  reviewsAdapter: GoogleReviewsAdapter,
  aiAggregator: AIAggregator
): Promise<any> {
  // Step 1: Analyze ingredient safety
  const ingredients = product.ingredients || [];
  // Convert ingredients to string array if needed
  const ingredientStrings = ingredients.map((ing: any) =>
    typeof ing === 'string' ? ing : ing.name || ''
  ).filter((s: string) => s.length > 0);
  const safetyData = await ingredientAdapter.analyzeIngredientSafety(ingredientStrings);

  // Step 2: Fetch reviews
  let reviews;
  try {
    reviews = await reviewsAdapter.getReviews(product.brand, product.name);
  } catch (error) {
    console.warn(`[enrichSingleProduct] Failed to fetch reviews for ${product.name}:`, error);
    reviews = {
      averageRating: 0,
      totalReviews: 0,
      sentimentScore: 0,
      reviews: [],
    };
  }

  // Step 3: Extract sustainability info from tags and Open Beauty Facts data
  const sustainability = extractSustainabilityInfo(product);

  // Step 4: Enrich ingredients with AI explanations
  const enrichedIngredients = await Promise.all(
    ingredientStrings.map(async (ingredientStr: string) => {
      const aiExplanation = await aiAggregator.explainIngredient(
        ingredientStr,
        product.name,
        product.brand
      );

      // Find safety info for this ingredient
      const ingredientSafety = safetyData.flaggedIngredients.find(
        (flagged) => flagged.name.toLowerCase() === ingredientStr.toLowerCase()
      );

      return {
        name: ingredientStr,
        aiExplanation: aiExplanation || 'This ingredient is commonly used in hair care products.',
        safetyLevel: ingredientSafety
          ? ingredientSafety.severity === 'high'
            ? 'avoid'
            : ingredientSafety.severity === 'medium'
            ? 'caution'
            : 'safe'
          : 'safe',
        allergenFlag: safetyData.allergenMatches?.includes(ingredientStr) || false,
      };
    })
  );

  // Step 5: Build safety info
  const safety = {
    overallScore: safetyData.score,
    allergenWarnings: safetyData.flaggedIngredients.map((flagged) => ({
      ingredient: flagged.name,
      severity: flagged.severity,
      description: flagged.concern,
    })),
    flaggedIngredients: safetyData.flaggedIngredients,
  };

  // Return enriched product
  return {
    ...product,
    title: product.name, // Use 'title' for consistency with frontend
    ingredients: enrichedIngredients,
    safety,
    reviews,
    sustainability,
    tags: product.tags || [],
  };
}

/**
 * Extract sustainability information from product tags and data
 */
function extractSustainabilityInfo(product: Product): any {
  const tags = (product.tags || []).map(tag => tag.toLowerCase());
  
  return {
    ecoFriendly: tags.some(tag => 
      tag.includes('eco') || tag.includes('sustainable') || tag.includes('green')
    ),
    sustainable: tags.some(tag => 
      tag.includes('sustainable') || tag.includes('eco-friendly')
    ),
    crueltyFree: tags.some(tag => 
      tag.includes('cruelty-free') || tag.includes('not tested on animals')
    ),
    locallyOwned: false, // Would need additional data source
    smallBrand: false, // Would need additional data source
    explanation: tags.includes('vegan') 
      ? 'This product is vegan and cruelty-free, made with sustainable practices.'
      : tags.includes('cruelty-free')
      ? 'This product is cruelty-free and not tested on animals.'
      : tags.includes('eco')
      ? 'This product uses eco-friendly packaging and sustainable ingredients.'
      : undefined,
  };
}

