/**
 * Products Page Firebase Functions
 * Handles product details, reviews, filtering, and user favorites
 */

import { onCall, HttpsError } from 'firebase-functions/v2/https';
import * as admin from 'firebase-admin';
import { BeautyFeedsAdapter } from './adapters/BeautyFeedsAdapter';
import { OpenBeautyFactsAdapter } from './adapters/OpenBeautyFactsAdapter';
import { GoogleReviewsAdapter } from './adapters/GoogleReviewsAdapter';
import { IngredientAdapter } from './adapters/IngredientAdapter';
import { SustainabilityTagger } from './utils/sustainabilityTagger';
import { IngredientAnalyzer } from './utils/ingredientAnalyzer';
import { ProductFilters } from './types/products';
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
 * Get detailed product information
 * Fetches from BeautyFeeds, enriches with Open Food Facts, generates sustainability tags,
 * analyzes ingredients with AI, and stores/caches in Firestore
 */
export const getProductDetails = onCall(
  { 
    enforceAppCheck: false,
    region: 'northamerica-northeast1'
  },
  async (request) => {
    if (!request.auth) {
      throw new HttpsError('unauthenticated', 'User must be authenticated');
    }

    const productId = request.data.productId;
    if (!productId) {
      throw new HttpsError('invalid-argument', 'Product ID is required');
    }

    try {
      console.log(`[getProductDetails] Fetching product ${productId}`);

      // Check Firestore cache first
      const cachedDoc = await db.collection('products').doc(productId).get();
      if (cachedDoc.exists) {
        const cachedData = cachedDoc.data();
        // Check if cache is still fresh (24 hours)
        const cacheAge = Date.now() - (cachedData?.updatedAt?.toMillis() || 0);
        if (cacheAge < 24 * 60 * 60 * 1000) {
          console.log('[getProductDetails] Returning cached product');
          return { product: cachedData };
        }
      }

      // Initialize adapters
      const bfAdapter = new BeautyFeedsAdapter();
      const obfAdapter = new OpenBeautyFactsAdapter();
      const ingredientAdapter = new IngredientAdapter();
      const reviewsAdapter = new GoogleReviewsAdapter();
      const sustainabilityTagger = new SustainabilityTagger();
      const ingredientAnalyzer = new IngredientAnalyzer();

      // Step 1: Fetch from BeautyFeeds API
      let product: Product | null = await bfAdapter.getProductById(productId);
      
      if (!product) {
        // Try to fetch by name if ID doesn't work
        throw new HttpsError('not-found', 'Product not found in BeautyFeeds');
      }

      // Step 2: Enrich with Open Food Facts if we have UPC
      if (product.upc) {
        const obfProduct = await obfAdapter.getProductByBarcode(product.upc);
        if (obfProduct) {
          // Merge data from Open Beauty Facts
          product = {
            ...product,
            ingredients: product.ingredients || obfProduct.ingredients || [],
            tags: [...new Set([...product.tags, ...(obfProduct.tags || [])])],
            description: product.description || obfProduct.description,
          };
        }
      }

      // Step 3: Generate sustainability tags
      const sustainabilityTags = sustainabilityTagger.generateTags(product);
      const sustainabilityExplanation = sustainabilityTagger.generateExplanation(sustainabilityTags);

      // Step 4: Analyze ingredients with AI
      const ingredients = product.ingredients || [];
      let ingredientAnalyses: Array<{
        name: string;
        aiExplanation: string;
        safetyLevel: 'safe' | 'caution' | 'avoid';
        allergenFlag?: boolean;
        whatItDoes: string;
        sensitiveScalpSafe?: boolean;
      }> = [];
      
      if (ingredients.length > 0) {
        // Analyze ingredients (limit to first 20 for performance)
        // Convert to string array if needed
        const ingredientsToAnalyze = ingredients
          .slice(0, 20)
          .map((ing: any) => typeof ing === 'string' ? ing : ing.name || '')
          .filter((s: string) => s.length > 0);
        ingredientAnalyses = await ingredientAnalyzer.analyzeIngredients(
          ingredientsToAnalyze,
          product.name,
          product.brand
        );
      }

      // Step 5: Get ingredient safety data
      const ingredientSafety = await ingredientAdapter.analyzeIngredientSafety(ingredients);

      // Step 6: Get reviews
      const reviews = await reviewsAdapter.getReviews(product.brand, product.name);

      // Step 7: Generate AI summary for reviews if available
      let reviewSummary = null;
      if (reviews && reviews.reviews && reviews.reviews.length > 0) {
        reviewSummary = await generateReviewSummary(reviews);
      }

      // Step 8: Build enriched product
      const enrichedProduct: any = {
        id: product.id,
        name: product.name,
        title: product.name, // Also include title for compatibility
        brand: product.brand,
        imageUrl: product.imageUrl,
        tags: product.tags,
        description: product.description,
        price: product.price,
        currency: product.currency || 'USD',
        upc: product.upc,
        category: product.tags?.find(t => ['shampoo', 'conditioner', 'styling', 'treatment'].includes(t.toLowerCase())),
        
        // Ingredients with AI explanations
        ingredients: ingredientAnalyses.map(analysis => ({
          name: analysis.name,
          aiExplanation: analysis.aiExplanation,
          safetyLevel: analysis.safetyLevel,
          allergenFlag: analysis.allergenFlag,
          whatItDoes: analysis.whatItDoes,
          sensitiveScalpSafe: analysis.sensitiveScalpSafe,
        })),
        
        // Sustainability
        sustainability: {
          ecoFriendly: sustainabilityTags.ecoFriendly,
          sustainable: sustainabilityTags.sustainable,
          crueltyFree: sustainabilityTags.crueltyFree,
          locallyOwned: sustainabilityTags.locallyOwned,
          smallBrand: sustainabilityTags.smallBrand,
          recyclablePackaging: sustainabilityTags.recyclablePackaging,
          plantBased: sustainabilityTags.plantBased,
          harmfulChemicals: sustainabilityTags.harmfulChemicals,
          tags: sustainabilityTags.tags,
          explanation: sustainabilityExplanation,
        },
        
        // Safety
        safety: {
          overallScore: ingredientSafety.score,
          allergenWarnings: ingredientSafety.flaggedIngredients
            ?.filter(ing => ing.concern.toLowerCase().includes('allergen'))
            .map(ing => ({
              ingredient: ing.name,
              severity: ing.severity,
              description: ing.concern,
            })) || [],
          flaggedIngredients: ingredientSafety.flaggedIngredients || [],
        },
        
        // Reviews
        reviews: reviews ? {
          averageRating: reviews.averageRating,
          totalReviews: reviews.totalReviews,
          sentimentScore: reviews.sentimentScore,
          reviews: reviews.reviews.slice(0, 10), // Top 10 reviews
          aiSummary: reviewSummary,
        } : {
          averageRating: 0,
          totalReviews: 0,
          sentimentScore: 0,
          reviews: [],
        },
        
        // Metadata
        source: product.source,
        sourceId: product.sourceId,
        url: product.url,
        createdAt: admin.firestore.FieldValue.serverTimestamp(),
        updatedAt: admin.firestore.FieldValue.serverTimestamp(),
        enriched: true,
        enrichedAt: admin.firestore.FieldValue.serverTimestamp(),
      };

      // Step 9: Store in Firestore
      await db.collection('products').doc(productId).set(enrichedProduct, { merge: true });

      console.log(`[getProductDetails] Successfully enriched product ${productId}`);

      return { product: enrichedProduct };
    } catch (error: any) {
      console.error('[getProductDetails] Error:', error);
      if (error instanceof HttpsError) {
        throw error;
      }
      throw new HttpsError('internal', `Failed to get product details: ${error.message}`);
    }
  }
);

/**
 * Get Google Reviews for a product
 * Scrapes Google Reviews and generates AI sentiment summary
 */
export const getGoogleReviews = onCall(
  { 
    enforceAppCheck: false,
    region: 'northamerica-northeast1'
  },
  async (request) => {
    if (!request.auth) {
      throw new HttpsError('unauthenticated', 'User must be authenticated');
    }

    const productName = request.data.productName;
    const brand = request.data.brand;
    
    if (!productName) {
      throw new HttpsError('invalid-argument', 'Product name is required');
    }

    try {
      console.log(`[getGoogleReviews] Fetching reviews for ${brand} ${productName}`);

      const reviewsAdapter = new GoogleReviewsAdapter();
      const reviews = await reviewsAdapter.getReviews(brand || '', productName);

      if (!reviews || reviews.reviews.length === 0) {
        return {
          reviews: {
            averageRating: 0,
            totalReviews: 0,
            sentimentScore: 0,
            reviews: [],
            aiSummary: null,
          },
        };
      }

      // Generate AI summary
      const aiSummary = await generateReviewSummary(reviews);

      return {
        reviews: {
          ...reviews,
          aiSummary,
        },
      };
    } catch (error: any) {
      console.error('[getGoogleReviews] Error:', error);
      throw new HttpsError('internal', `Failed to get reviews: ${error.message}`);
    }
  }
);

/**
 * Filter products based on criteria
 * Queries Firestore with filters for ingredients, allergens, sustainability, etc.
 */
export const filterProducts = onCall(
  { 
    enforceAppCheck: false,
    region: 'northamerica-northeast1'
  },
  async (request) => {
    if (!request.auth) {
      throw new HttpsError('unauthenticated', 'User must be authenticated');
    }

    const filters: ProductFilters = request.data.filters || {};

    try {
      console.log('[filterProducts] Applying filters:', filters);

      let query: admin.firestore.Query = db.collection('products');

      // Filter by sustainability tags
      if (filters.sustainability) {
        if (filters.sustainability.ecoFriendly) {
          query = query.where('sustainability.ecoFriendly', '==', true);
        }
        if (filters.sustainability.crueltyFree) {
          query = query.where('sustainability.crueltyFree', '==', true);
        }
        if (filters.sustainability.locallyOwned) {
          query = query.where('sustainability.locallyOwned', '==', true);
        }
      }

      // Filter by minimum rating
      if (filters.minRating) {
        query = query.where('reviews.averageRating', '>=', filters.minRating);
      }

      // Filter by maximum price
      if (filters.maxPrice) {
        query = query.where('price', '<=', filters.maxPrice);
      }

      // Filter by tags
      if (filters.tags && filters.tags.length > 0) {
        query = query.where('tags', 'array-contains-any', filters.tags);
      }

      // Execute query
      const snapshot = await query.limit(100).get();
      let products = snapshot.docs.map(doc => doc.data() as Product);

      // Apply client-side filters that can't be done in Firestore
      // (ingredient filters, allergen filters)
      if (filters.excludeIngredients && filters.excludeIngredients.length > 0) {
        products = products.filter(product => {
          const ingredientList = product.ingredients || [];
          const ingredientNames = ingredientList.map((i: any) => 
            (typeof i === 'string' ? i : i.name || '').toLowerCase()
          ).filter((s: string) => s.length > 0);
          return !filters.excludeIngredients!.some(excluded =>
            ingredientNames.some(ing => ing.includes(excluded.toLowerCase()))
          );
        });
      }

      if (filters.includeIngredients && filters.includeIngredients.length > 0) {
        products = products.filter(product => {
          const ingredientList = product.ingredients || [];
          const ingredientNames = ingredientList.map((i: any) => 
            (typeof i === 'string' ? i : i.name || '').toLowerCase()
          ).filter((s: string) => s.length > 0);
          return filters.includeIngredients!.some(included =>
            ingredientNames.some(ing => ing.includes(included.toLowerCase()))
          );
        });
      }

      if (filters.allergens && filters.allergens.length > 0) {
        products = products.filter(product => {
          // Handle both Product types - check if safety exists
          const productAny = product as any;
          const allergenWarnings = productAny.safety?.allergenWarnings || [];
          return !allergenWarnings.some((warning: any) =>
            filters.allergens!.some(allergen =>
              warning.ingredient.toLowerCase().includes(allergen.toLowerCase())
            )
          );
        });
      }

      console.log(`[filterProducts] Found ${products.length} products matching filters`);

      return { products };
    } catch (error: any) {
      console.error('[filterProducts] Error:', error);
      throw new HttpsError('internal', `Failed to filter products: ${error.message}`);
    }
  }
);

/**
 * Like a product (add to user's favorites)
 */
export const likeProduct = onCall(
  { 
    enforceAppCheck: false,
    region: 'northamerica-northeast1'
  },
  async (request) => {
    if (!request.auth) {
      throw new HttpsError('unauthenticated', 'User must be authenticated');
    }

    const userId = request.auth.uid;
    const productId = request.data.productId;
    const notes = request.data.notes;

    if (!productId) {
      throw new HttpsError('invalid-argument', 'Product ID is required');
    }

    try {
      // Get product details
      const productDoc = await db.collection('products').doc(productId).get();
      if (!productDoc.exists) {
        throw new HttpsError('not-found', 'Product not found');
      }

      const product = productDoc.data() as Product;

      // Add to user's liked products
      await db
        .collection('users')
        .doc(userId)
        .collection('likedProducts')
        .doc(productId)
        .set({
          productId,
          productName: product.name,
          productBrand: product.brand,
          productImageUrl: product.imageUrl,
          likedAt: admin.firestore.FieldValue.serverTimestamp(),
          notes: notes || null,
          addedToRegimen: false,
        });

      console.log(`[likeProduct] User ${userId} liked product ${productId}`);

      return { success: true };
    } catch (error: any) {
      console.error('[likeProduct] Error:', error);
      if (error instanceof HttpsError) {
        throw error;
      }
      throw new HttpsError('internal', `Failed to like product: ${error.message}`);
    }
  }
);

/**
 * Unlike a product (remove from user's favorites)
 */
export const unlikeProduct = onCall(
  { 
    enforceAppCheck: false,
    region: 'northamerica-northeast1'
  },
  async (request) => {
    if (!request.auth) {
      throw new HttpsError('unauthenticated', 'User must be authenticated');
    }

    const userId = request.auth.uid;
    const productId = request.data.productId;

    if (!productId) {
      throw new HttpsError('invalid-argument', 'Product ID is required');
    }

    try {
      await db
        .collection('users')
        .doc(userId)
        .collection('likedProducts')
        .doc(productId)
        .delete();

      console.log(`[unlikeProduct] User ${userId} unliked product ${productId}`);

      return { success: true };
    } catch (error: any) {
      console.error('[unlikeProduct] Error:', error);
      throw new HttpsError('internal', `Failed to unlike product: ${error.message}`);
    }
  }
);

/**
 * Get user's liked products
 */
export const getLikedProducts = onCall(
  { 
    enforceAppCheck: false,
    region: 'northamerica-northeast1'
  },
  async (request) => {
    if (!request.auth) {
      throw new HttpsError('unauthenticated', 'User must be authenticated');
    }

    const userId = request.auth.uid;

    try {
      const snapshot = await db
        .collection('users')
        .doc(userId)
        .collection('likedProducts')
        .orderBy('likedAt', 'desc')
        .get();

      const likedProducts = snapshot.docs.map(doc => doc.data());

      return { products: likedProducts };
    } catch (error: any) {
      console.error('[getLikedProducts] Error:', error);
      throw new HttpsError('internal', `Failed to get liked products: ${error.message}`);
    }
  }
);

/**
 * Generate AI summary for reviews
 */
async function generateReviewSummary(reviews: any): Promise<any> {
  try {
    // Note: In a full implementation, you would call AI service here
    // For now, we'll generate a simple summary based on the data
    const positiveReviews = reviews.reviews.filter((r: any) => r.rating >= 4);
    const negativeReviews = reviews.reviews.filter((r: any) => r.rating <= 2);

    return {
      overallSentiment:
        reviews.sentimentScore > 0.3
          ? 'positive'
          : reviews.sentimentScore < -0.3
          ? 'negative'
          : 'neutral',
      whatPeopleLove: positiveReviews.slice(0, 5).map((r: any) => r.text.substring(0, 100)),
      whatPeopleHate: negativeReviews.slice(0, 5).map((r: any) => r.text.substring(0, 100)),
      commonPatterns: [
        `Average rating: ${reviews.averageRating.toFixed(1)}/5`,
        `Total reviews: ${reviews.totalReviews}`,
      ],
    };
  } catch (error) {
    console.error('[generateReviewSummary] Error:', error);
    return null;
  }
}

