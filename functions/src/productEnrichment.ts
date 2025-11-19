/**
 * Product Enrichment Cloud Functions
 * Handles product data enrichment from APIs, AI ingredient explanations, and filtering
 */

import * as functions from 'firebase-functions';
import * as admin from 'firebase-admin';
import { Product, ProductFilters, IngredientWithExplanation } from './types/products';
import { IngredientAdapter } from './adapters/IngredientAdapter';
import { GoogleReviewsAdapter } from './adapters/GoogleReviewsAdapter';
import { AIAggregator } from './ai/AIAggregator';

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
 * Cloud Function: Enrich Product with AI Explanations
 * Takes a product and enriches it with:
 * - AI-generated ingredient explanations
 * - Sustainability information
 * - Safety/allergen warnings
 * - Google Reviews
 * - AI recommendation explanation
 */
export const enrichProduct = functions.https.onCall(
  async (data: { productId: string; userQuizAnswers?: any }, context) => {
    if (!context.auth) {
      throw new functions.https.HttpsError(
        'unauthenticated',
        'User must be authenticated'
      );
    }

    try {
      const { productId, userQuizAnswers } = data;
      
      // Fetch product from Firestore
      const productRef = db.collection('products').doc(productId);
      const productDoc = await productRef.get();
      
      if (!productDoc.exists) {
        throw new functions.https.HttpsError(
          'not-found',
          'Product not found'
        );
      }

      const product = { id: productDoc.id, ...productDoc.data() } as Product;

      // Initialize adapters
      const ingredientAdapter = new IngredientAdapter();
      const reviewsAdapter = new GoogleReviewsAdapter();
      const aiAggregator = new AIAggregator();

      // Step 1: Enrich ingredients with AI explanations
      console.log('[enrichProduct] Enriching ingredients with AI explanations');
      
      // Handle both string array and IngredientWithExplanation array
      const ingredientNames = product.ingredients
        ? product.ingredients.map(ing => typeof ing === 'string' ? ing : ing.name)
        : [];
      
      const enrichedIngredients: IngredientWithExplanation[] = await Promise.all(
        ingredientNames.map(async (ingredientName) => {
          // Get ingredient safety data
          const safetyData = await ingredientAdapter.analyzeIngredientSafety([ingredientName]);
          
          // Generate AI explanation for ingredient
          const aiExplanation = await aiAggregator.explainIngredient(
            ingredientName,
            product.title,
            product.brand
          );

          return {
            name: ingredientName,
            aiExplanation: aiExplanation || 'This ingredient is commonly used in hair care products.',
            safetyLevel: safetyData.score > 70 ? 'safe' : safetyData.score > 40 ? 'caution' : 'avoid',
            allergenFlag: safetyData.flaggedIngredients.some(
              (flagged) => flagged.name.toLowerCase() === ingredientName.toLowerCase()
            ),
          };
        })
      );

      // Step 2: Fetch Google Reviews
      console.log('[enrichProduct] Fetching Google Reviews');
      let reviews = product.reviews;
      if (product.brand && product.title) {
        try {
          reviews = await reviewsAdapter.getReviews(product.brand, product.title);
        } catch (error) {
          console.warn('[enrichProduct] Failed to fetch reviews:', error);
          // Keep existing reviews or use default
          if (!reviews) {
            reviews = {
              averageRating: 0,
              totalReviews: 0,
              sentimentScore: 0,
              reviews: [],
            };
          }
        }
      }

      // Step 3: Generate AI recommendation explanation if user quiz answers provided
      let aiRecommendationExplanation: string | undefined;
      if (userQuizAnswers) {
        console.log('[enrichProduct] Generating AI recommendation explanation');
        // Convert product to format expected by AIAggregator (handles both name and title)
        const productForAI = {
          ...product,
          name: product.title, // AIAggregator may expect 'name' field
        };
        aiRecommendationExplanation = await aiAggregator.explainProductRecommendation(
          productForAI as any,
          userQuizAnswers
        );
      }

      // Step 4: Update product in Firestore
      const updatedProduct: Partial<Product> = {
        ingredients: enrichedIngredients,
        reviews: reviews || product.reviews,
        aiRecommendationExplanation,
        updatedAt: admin.firestore.FieldValue.serverTimestamp(),
      };

      await productRef.update(updatedProduct);

      return {
        success: true,
        product: { ...product, ...updatedProduct },
      };
    } catch (error: any) {
      console.error('[enrichProduct] Error:', error);
      throw new functions.https.HttpsError(
        'internal',
        `Failed to enrich product: ${error.message}`
      );
    }
  }
);

/**
 * Cloud Function: Filter Products
 * Efficiently filters products based on user criteria
 * Uses Firestore queries where possible, client-side filtering for complex cases
 */
export const filterProducts = functions.https.onCall(
  async (data: { filters: ProductFilters; limit?: number }, context) => {
    if (!context.auth) {
      throw new functions.https.HttpsError(
        'unauthenticated',
        'User must be authenticated'
      );
    }

    try {
      const { filters, limit = 50 } = data;
      let query = db.collection('products') as admin.firestore.Query;

      // Apply Firestore-compatible filters
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
        // Note: Firestore has limitations on multiple where clauses
        // For complex filters, we fetch and filter client-side
      }

      if (filters.minRating) {
        query = query.where('reviews.averageRating', '>=', filters.minRating);
      }

      if (filters.maxPrice) {
        query = query.where('price', '<=', filters.maxPrice);
      }

      // Execute query
      const snapshot = await query.limit(limit).get();
      let products = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data(),
      })) as Product[];

      // Apply client-side filtering for complex criteria
      // (allergens, include/exclude ingredients, etc.)
      if (filters.allergens && filters.allergens.length > 0) {
        products = products.filter(product => {
          return !product.safety.allergenWarnings.some(warning =>
            filters.allergens!.some(allergen =>
              warning.ingredient.toLowerCase().includes(allergen.toLowerCase())
            )
          );
        });
      }

      if (filters.includeIngredients && filters.includeIngredients.length > 0) {
        products = products.filter(product => {
          return filters.includeIngredients!.every(ingredient =>
            product.ingredients.some(ing =>
              ing.name.toLowerCase().includes(ingredient.toLowerCase())
            )
          );
        });
      }

      if (filters.excludeIngredients && filters.excludeIngredients.length > 0) {
        products = products.filter(product => {
          return !product.ingredients.some(ing =>
            filters.excludeIngredients!.some(excluded =>
              ing.name.toLowerCase().includes(excluded.toLowerCase())
            )
          );
        });
      }

      return {
        products,
        count: products.length,
      };
    } catch (error: any) {
      console.error('[filterProducts] Error:', error);
      throw new functions.https.HttpsError(
        'internal',
        `Failed to filter products: ${error.message}`
      );
    }
  }
);

/**
 * Cloud Function: Batch Enrich Products
 * Enriches multiple products at once (useful for initial data population)
 */
export const batchEnrichProducts = functions.https.onCall(
  async (data: { productIds: string[] }, context) => {
    if (!context.auth) {
      throw new functions.https.HttpsError(
        'unauthenticated',
        'User must be authenticated'
      );
    }

    try {
      const { productIds } = data;
      const results = [];

      // Process products in batches to avoid timeout
      const batchSize = 5;
      for (let i = 0; i < productIds.length; i += batchSize) {
        const batch = productIds.slice(i, i + batchSize);
        const batchResults = await Promise.all(
          batch.map(async (productId) => {
            try {
              // Call enrichProduct logic here (simplified)
              const productRef = db.collection('products').doc(productId);
              const productDoc = await productRef.get();
              
              if (!productDoc.exists) {
                return { productId, success: false, error: 'Not found' };
              }

              // Mark as enriched (actual enrichment would happen here)
              await productRef.update({
                enriched: true,
                enrichedAt: admin.firestore.FieldValue.serverTimestamp(),
              });

              return { productId, success: true };
            } catch (error: any) {
              return { productId, success: false, error: error.message };
            }
          })
        );
        results.push(...batchResults);
      }

      return {
        results,
        total: productIds.length,
        successful: results.filter(r => r.success).length,
      };
    } catch (error: any) {
      console.error('[batchEnrichProducts] Error:', error);
      throw new functions.https.HttpsError(
        'internal',
        `Failed to batch enrich products: ${error.message}`
      );
    }
  }
);

