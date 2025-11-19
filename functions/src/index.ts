/**
 * Firebase Cloud Functions - Hair-Care Product Recommendations
 * Main entry point for the recommendation system
 */

import * as functions from 'firebase-functions';
import * as admin from 'firebase-admin';
import { UserQuizAnswers, RecommendationResult, Product } from './types';
import { OpenBeautyFactsAdapter } from './adapters/OpenBeautyFactsAdapter';
import { BeautyFeedsAdapter } from './adapters/BeautyFeedsAdapter';
import { IngredientAdapter } from './adapters/IngredientAdapter';
import { GoogleReviewsAdapter } from './adapters/GoogleReviewsAdapter';
import { ScoringEngine } from './scoring/ScoringEngine';
import { AIAggregator } from './ai/AIAggregator';
import { ProductDeduplicator } from './utils/deduplicator';

// Initialize Firebase Admin
admin.initializeApp();

const db = admin.firestore();

/**
 * Main Cloud Function: Generate Product Recommendations
 * Triggered by HTTP request or Firestore document creation
 */
export const generateRecommendations = functions.https.onCall(
  async (data: { quizAnswers: UserQuizAnswers; userId: string }, context) => {
    const startTime = Date.now();

    // Verify authentication
    if (!context.auth) {
      throw new functions.https.HttpsError(
        'unauthenticated',
        'User must be authenticated to generate recommendations'
      );
    }

    const userId = data.userId || context.auth.uid;
    const quizAnswers = data.quizAnswers;

    if (!quizAnswers) {
      throw new functions.https.HttpsError(
        'invalid-argument',
        'Quiz answers are required'
      );
    }

    try {
      console.log(`[generateRecommendations] Starting for user ${userId}`);

      // Initialize adapters
      const obfAdapter = new OpenBeautyFactsAdapter();
      const bfAdapter = new BeautyFeedsAdapter();
      const ingredientAdapter = new IngredientAdapter();
      const reviewsAdapter = new GoogleReviewsAdapter();
      const scoringEngine = new ScoringEngine();
      const aiAggregator = new AIAggregator();
      const deduplicator = new ProductDeduplicator();

      // Step 1: Query products from multiple sources
      console.log('[generateRecommendations] Step 1: Querying product sources');
      const productTags = buildProductTags(quizAnswers);

      const [obfProducts, bfProducts] = await Promise.all([
        obfAdapter.searchProducts(productTags, 50),
        bfAdapter.searchProducts(productTags, 50),
      ]);

      console.log(`[generateRecommendations] Found ${obfProducts.length} from OpenBeautyFacts, ${bfProducts.length} from BeautyFeeds`);

      // Step 2: Deduplicate products
      console.log('[generateRecommendations] Step 2: Deduplicating products');
      const allProducts = deduplicator.deduplicate([...obfProducts, ...bfProducts]);
      console.log(`[generateRecommendations] ${allProducts.length} unique products after deduplication`);

      // Step 3: Enrich products with ingredient safety and reviews
      console.log('[generateRecommendations] Step 3: Enriching product data');
      const enrichedProducts = await enrichProducts(
        allProducts,
        ingredientAdapter,
        reviewsAdapter
      );

      // Step 4: Score products
      console.log('[generateRecommendations] Step 4: Scoring products');
      const scoredProducts = await scoringEngine.scoreProducts(enrichedProducts, quizAnswers);

      // Step 5: AI re-ranking and explanations
      console.log('[generateRecommendations] Step 5: AI re-ranking');
      const topK = 20; // Get top 20 for AI processing
      const aiRankedProducts = await aiAggregator.reRankAndExplain(scoredProducts, topK);

      // Step 6: Prepare result
      const processingTime = Date.now() - startTime;
      const result: RecommendationResult = {
        userId,
        timestamp: new Date().toISOString(),
        quizAnswers,
        recommendations: aiRankedProducts,
        metadata: {
          totalProductsFound: allProducts.length,
          productsAfterFiltering: scoredProducts.length,
          processingTimeMs: processingTime,
          cacheHit: false, // Could be enhanced to track cache usage
        },
      };

      // Step 7: Store in Firestore
      console.log('[generateRecommendations] Step 6: Storing recommendations');
      await db
        .collection('users')
        .doc(userId)
        .collection('recommendations')
        .doc(result.timestamp)
        .set(result);

      console.log(`[generateRecommendations] Completed in ${processingTime}ms`);

      return result;
    } catch (error: any) {
      console.error('[generateRecommendations] Error:', error);
      throw new functions.https.HttpsError(
        'internal',
        `Failed to generate recommendations: ${error.message}`
      );
    }
  }
);

/**
 * Build product search tags from quiz answers
 */
function buildProductTags(quizAnswers: UserQuizAnswers): string[] {
  const tags: string[] = [];

  // Hair type tags
  tags.push(quizAnswers.hairType);
  tags.push(`hair-${quizAnswers.hairType}`);

  // Porosity tags
  tags.push(quizAnswers.porosity);
  tags.push(`${quizAnswers.porosity}-porosity`);

  // Concern tags
  tags.push(...quizAnswers.concerns);

  // Preference tags
  if (quizAnswers.preferences.vegan) tags.push('vegan');
  if (quizAnswers.preferences.crueltyFree) tags.push('cruelty-free');
  if (quizAnswers.preferences.organic) tags.push('organic');
  if (quizAnswers.preferences.fragranceFree) tags.push('fragrance-free');

  // Water type
  tags.push(quizAnswers.waterType);

  return tags;
}

/**
 * Enrich products with ingredient safety and reviews
 */
async function enrichProducts(
  products: Product[],
  ingredientAdapter: IngredientAdapter,
  reviewsAdapter: GoogleReviewsAdapter
): Promise<Product[]> {
  const enriched = await Promise.all(
    products.map(async (product) => {
      // Enrich with ingredient safety
      if (product.ingredients && product.ingredients.length > 0 && !product.ingredientSafety) {
        product.ingredientSafety = await ingredientAdapter.analyzeIngredientSafety(
          product.ingredients
        );
      }

      // Enrich with reviews
      if (!product.reviews) {
        product.reviews = await reviewsAdapter.getProductReviews(
          product.name,
          product.brand,
          product.upc
        ) || undefined;
      }

      return product;
    })
  );

  return enriched;
}

// Export helper functions for testing
export { buildProductTags, enrichProducts };

