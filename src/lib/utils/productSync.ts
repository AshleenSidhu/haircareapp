/**
 * Client-side Product Sync Utility
 * Fetches products from APIs and stores them in Firestore
 * Works without Cloud Functions - runs directly from the client
 */

import { db } from '../firebase';
import { collection, doc, setDoc, getDocs, query, where, limit as firestoreLimit } from 'firebase/firestore';
import { OpenBeautyFactsAdapter } from '../adapters/OpenBeautyFactsAdapter';
import { BeautyFeedsAdapter } from '../adapters/BeautyFeedsAdapter';
import { IngredientAdapter } from '../adapters/IngredientAdapter';
import { Product } from '../types/products';
import { openAIService } from '../openai';

/**
 * Remove undefined values from an object recursively
 * Firestore doesn't allow undefined values - they must be null or omitted
 */
export function removeUndefinedFields(obj: any): any {
  if (obj === null || obj === undefined) {
    return null;
  }
  
  if (Array.isArray(obj)) {
    return obj.map(item => removeUndefinedFields(item));
  }
  
  if (typeof obj === 'object' && obj.constructor === Object) {
    const cleaned: any = {};
    for (const [key, value] of Object.entries(obj)) {
      if (value !== undefined) {
        cleaned[key] = removeUndefinedFields(value);
      }
    }
    return cleaned;
  }
  
  return obj;
}

/**
 * Sync products from APIs to Firestore
 */
export async function syncProductsToFirestore(
  tags: string[] = ['shampoo', 'conditioner', 'hair-care'],
  limit: number = 150
): Promise<{ success: boolean; productsSynced: number; totalFound: number; errors?: string[] }> {
  const errors: string[] = [];
  let productsSynced = 0;

  try {
    console.log(`[syncProducts] Starting sync with tags: ${tags.join(', ')}`);

    // Initialize adapters
    const obfAdapter = new OpenBeautyFactsAdapter();
    const bfAdapter = new BeautyFeedsAdapter();
    const ingredientAdapter = new IngredientAdapter();

    // Step 1: Fetch products from both sources
    console.log('[syncProducts] Fetching products from APIs...');
    let obfProducts: any[] = [];
    let bfProducts: any[] = [];
    
    try {
      obfProducts = await obfAdapter.searchProducts(tags, limit);
      console.log(`[syncProducts] OpenBeautyFacts returned ${obfProducts.length} products`);
      if (obfProducts.length > 0) {
        console.log(`[syncProducts] Sample OBF product:`, obfProducts[0]);
      }
    } catch (error: any) {
      console.error('[syncProducts] Error fetching from OpenBeautyFacts:', error);
    }
    
    try {
      bfProducts = await bfAdapter.searchProducts(tags, limit);
      console.log(`[syncProducts] BeautyFeeds returned ${bfProducts.length} products`);
      if (bfProducts.length > 0) {
        console.log(`[syncProducts] Sample BF product:`, bfProducts[0]);
      }
    } catch (error: any) {
      console.error('[syncProducts] Error fetching from BeautyFeeds:', error);
    }

    console.log(`[syncProducts] Total found: ${obfProducts.length} from OpenBeautyFacts, ${bfProducts.length} from BeautyFeeds`);

    // Step 2: Combine and deduplicate
    const allProducts = [...obfProducts, ...bfProducts];
    const uniqueProducts = allProducts.filter((product, index, self) =>
      index === self.findIndex((p) =>
        (p.name || '').toLowerCase() === (product.name || '').toLowerCase() &&
        (p.brand || '').toLowerCase() === (product.brand || '').toLowerCase()
      )
    );

    console.log(`[syncProducts] ${uniqueProducts.length} unique products after deduplication`);

    // Step 3: Enrich and store each product
    console.log(`[syncProducts] Starting to enrich and store ${Math.min(uniqueProducts.length, limit)} products...`);
    
    for (const product of uniqueProducts.slice(0, limit)) {
      try {
        console.log(`[syncProducts] Processing product: ${(product as any).name || 'Unknown'}`);
        const enrichedProduct = await enrichSingleProduct(product, ingredientAdapter);
        
        // Store in Firestore
        const productRef = doc(db, 'products', enrichedProduct.id);
        
        // Remove undefined values - Firestore doesn't allow undefined
        const cleanProductData = removeUndefinedFields({
          ...enrichedProduct,
          createdAt: new Date(),
          updatedAt: new Date(),
        });
        
        console.log(`[syncProducts] Attempting to save to Firestore: ${enrichedProduct.title} (ID: ${enrichedProduct.id})`);
        
        try {
          await setDoc(productRef, cleanProductData, { merge: true });
          console.log(`[syncProducts] ✓ Successfully saved product: ${enrichedProduct.title}`);
          productsSynced++;
        } catch (firestoreError: any) {
          console.error(`[syncProducts] ✗ Firestore error saving ${enrichedProduct.title}:`, firestoreError);
          console.error(`[syncProducts] Error code: ${firestoreError.code}, message: ${firestoreError.message}`);
          throw firestoreError; // Re-throw to be caught by outer catch
        }
        
        console.log(`[syncProducts] Progress: ${productsSynced}/${Math.min(uniqueProducts.length, limit)} products synced`);
      } catch (error: any) {
        // product from adapters uses 'name', not 'title'
        const productName = (product as any).name || 'Unknown';
        const errorMsg = `Error syncing product ${productName}: ${error.message}`;
        console.error(`[syncProducts] ${errorMsg}`);
        errors.push(errorMsg);
      }
    }

    console.log(`[syncProducts] Successfully synced ${productsSynced} products`);

    return {
      success: true,
      productsSynced,
      totalFound: uniqueProducts.length,
      errors: errors.length > 0 ? errors : undefined,
    };
  } catch (error: any) {
    console.error('[syncProducts] Error:', error);
    return {
      success: false,
      productsSynced,
      totalFound: 0,
      errors: [error.message],
    };
  }
}

/**
 * Enrich a single product with ingredient safety and other data
 */
async function enrichSingleProduct(
  product: any,
  ingredientAdapter: IngredientAdapter
): Promise<Product> {
  // Extract ingredients
  const ingredients = product.ingredients || [];
  
  // Analyze ingredient safety
  const safetyData = await ingredientAdapter.analyzeIngredientSafety(
    ingredients.map((ing: any) => typeof ing === 'string' ? ing : ing.name || '')
  );

  // Enrich ingredients with basic info (AI explanations would be added later)
  const enrichedIngredients = ingredients.map((ingredientName: any) => {
    const name = typeof ingredientName === 'string' ? ingredientName : ingredientName.name || '';
    const ingredientSafety = safetyData.flaggedIngredients.find(
      (flagged) => flagged.name.toLowerCase() === name.toLowerCase()
    );

    return {
      name,
      aiExplanation: `This ingredient is commonly used in hair care products.`, // Will be enriched with AI later
      safetyLevel: ingredientSafety
        ? ingredientSafety.severity === 'high'
          ? 'avoid'
          : ingredientSafety.severity === 'medium'
          ? 'caution'
          : 'safe'
        : 'safe',
      allergenFlag: safetyData.allergenMatches?.includes(name) || false,
    };
  });

  // Extract sustainability info from tags
  const tags = product.tags || [];
  const sustainability = {
    ecoFriendly: tags.some((tag: string) => 
      tag.toLowerCase().includes('eco') || tag.toLowerCase().includes('sustainable')
    ),
    sustainable: tags.some((tag: string) => 
      tag.toLowerCase().includes('sustainable') || tag.toLowerCase().includes('green')
    ),
    crueltyFree: tags.some((tag: string) => 
      tag.toLowerCase().includes('cruelty-free') || tag.toLowerCase().includes('not tested')
    ),
    locallyOwned: false,
    smallBrand: false,
    explanation: tags.some((tag: string) => tag.toLowerCase().includes('vegan'))
      ? 'This product is vegan and cruelty-free.'
      : tags.some((tag: string) => tag.toLowerCase().includes('cruelty-free'))
      ? 'This product is cruelty-free and not tested on animals.'
      : null,
  };

  // Build safety info
  const safety = {
    overallScore: safetyData.score,
    allergenWarnings: safetyData.flaggedIngredients.map((flagged) => ({
      ingredient: flagged.name,
      severity: flagged.severity,
      description: flagged.concern,
    })),
    flaggedIngredients: safetyData.flaggedIngredients,
  };

  // Mock reviews (will be replaced with real reviews if Google API is configured)
  const reviews = {
    averageRating: 4.0 + Math.random() * 1.0, // 4.0-5.0
    totalReviews: Math.floor(Math.random() * 100) + 10,
    sentimentScore: 0.7,
    reviews: [
      {
        author: 'Sarah M.',
        rating: 5,
        text: 'This product works great for my hair type!',
        date: new Date().toISOString(),
      },
    ],
  };

  // Generate stable ID from name and brand (or use existing ID)
  const productName = product.name || product.title || 'Unknown Product';
  const productBrand = product.brand || 'Unknown Brand';
  const stableId = product.id || `product_${productName.toLowerCase().replace(/[^a-z0-9]/g, '_')}_${productBrand.toLowerCase().replace(/[^a-z0-9]/g, '_')}`;

  // Return enriched product
  return {
    id: stableId,
    title: productName,
    brand: productBrand,
    imageUrl: product.imageUrl || product.image || null,
    tags: tags,
    description: product.description || null,
    price: product.price ?? null,
    currency: product.currency || 'USD',
    upc: product.upc || null,
    ingredients: enrichedIngredients,
    sustainability,
    safety,
    reviews,
    source: (product.source as 'openbeautyfacts' | 'beautyfeeds' | 'manual') || 'beautyfeeds',
    sourceId: product.sourceId || null,
    url: product.url || null,
  } as Product;
}

