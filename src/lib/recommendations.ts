/**
 * Client-side recommendation system
 * Works without Firebase Functions - uses OpenAI directly from client
 */

import { openAIService } from './openai';
import { db } from './firebase';
import { collection, doc, setDoc, getDocs, query, orderBy, limit } from 'firebase/firestore';
import { OpenBeautyFactsAdapter } from './adapters/OpenBeautyFactsAdapter';
import { BeautyFeedsAdapter } from './adapters/BeautyFeedsAdapter';
import { IngredientAdapter } from './adapters/IngredientAdapter';

// Type definitions for quiz answers and recommendations
export interface UserQuizAnswers {
  hairType: 'straight' | 'wavy' | 'curly' | 'coily' | 'mixed';
  porosity: 'low' | 'medium' | 'high';
  waterType: 'hard' | 'soft' | 'neutral';
  concerns: string[];
  preferences: {
    vegan?: boolean;
    crueltyFree?: boolean;
    organic?: boolean;
    fragranceFree?: boolean;
  };
  allergens?: string[];
  budget?: 'low' | 'medium' | 'high';
}

export interface RecommendationResult {
  userId: string;
  timestamp: string;
  quizAnswers: UserQuizAnswers;
  recommendations: Array<{
    product: any;
    deterministicScore: number;
    scoreBreakdown: {
      tagMatch: number;
      sustainability: number;
      ingredientSafety: number;
      reviewSentiment: number;
      priceMatch: number;
    };
    aiScore?: number;
    aiExplanation?: string;
    finalRank?: number;
  }>;
  metadata: {
    totalProductsFound: number;
    productsAfterFiltering: number;
    processingTimeMs: number;
    cacheHit: boolean;
  };
}

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

  // Add common product types
  tags.push('shampoo', 'conditioner', 'hair-care');

  return tags;
}

/**
 * Simple scoring function (simplified version)
 */
function scoreProduct(product: any, quizAnswers: UserQuizAnswers, ingredientSafety: number): {
  deterministicScore: number;
  scoreBreakdown: any;
} {
  // Tag match score
  let tagMatch = 50;
  if (product.tags && product.tags.length > 0) {
    const matchingTags = product.tags.filter((tag: string) => 
      buildProductTags(quizAnswers).some(qTag => 
        tag.toLowerCase().includes(qTag.toLowerCase())
      )
    ).length;
    tagMatch = Math.min(100, (matchingTags / buildProductTags(quizAnswers).length) * 100);
  }

  // Sustainability score (simplified)
  let sustainability = 50;
  if (product.tags) {
    if (product.tags.some((t: string) => t.includes('vegan'))) sustainability += 20;
    if (product.tags.some((t: string) => t.includes('cruelty-free'))) sustainability += 20;
    if (product.tags.some((t: string) => t.includes('organic'))) sustainability += 10;
  }
  sustainability = Math.min(100, sustainability);

  // Price match score
  let priceMatch = 50;
  if (product.price && quizAnswers.budget) {
    const budgetRanges = {
      low: { min: 0, max: 15 },
      medium: { min: 15, max: 35 },
      high: { min: 35, max: Infinity },
    };
    const range = budgetRanges[quizAnswers.budget];
    if (product.price >= range.min && product.price <= range.max) {
      priceMatch = 100;
    }
  }

  // Calculate weighted score
  const deterministicScore = 
    tagMatch * 0.35 +
    sustainability * 0.25 +
    ingredientSafety * 0.20 +
    50 * 0.15 + // Review sentiment (placeholder)
    priceMatch * 0.05;

  return {
    deterministicScore: Math.max(0, Math.min(100, deterministicScore)),
    scoreBreakdown: {
      tagMatch,
      sustainability,
      ingredientSafety,
      reviewSentiment: 50, // Placeholder
      priceMatch,
    },
  };
}

/**
 * Generate product recommendations based on quiz answers
 */
export async function generateRecommendations(
  quizAnswers: UserQuizAnswers,
  userId?: string
): Promise<RecommendationResult> {
  const startTime = Date.now();

  try {
    console.log('[generateRecommendations] Starting...');

    // Initialize adapters
    const obfAdapter = new OpenBeautyFactsAdapter();
    const bfAdapter = new BeautyFeedsAdapter();
    const ingredientAdapter = new IngredientAdapter();

    // Step 1: Query products from multiple sources
    console.log('[generateRecommendations] Step 1: Querying product sources');
    const productTags = buildProductTags(quizAnswers);

    const [obfProducts, bfProducts] = await Promise.all([
      obfAdapter.searchProducts(productTags, 30),
      bfAdapter.searchProducts(productTags, 30),
    ]);

    console.log(`[generateRecommendations] Found ${obfProducts.length} from OpenBeautyFacts, ${bfProducts.length} from BeautyFeeds`);

    // Step 2: Combine and deduplicate products (simple deduplication by name+brand)
    const allProducts = [...obfProducts, ...bfProducts];
    const uniqueProducts = allProducts.filter((product, index, self) =>
      index === self.findIndex((p) => 
        p.name.toLowerCase() === product.name.toLowerCase() &&
        p.brand.toLowerCase() === product.brand.toLowerCase()
      )
    );

    console.log(`[generateRecommendations] ${uniqueProducts.length} unique products after deduplication`);

    // Step 3: Enrich with ingredient safety
    console.log('[generateRecommendations] Step 3: Analyzing ingredient safety');
    const enrichedProducts = await Promise.all(
      uniqueProducts.map(async (product) => {
        let ingredientSafety = 50;
        if (product.ingredients && product.ingredients.length > 0) {
          const safetyData = await ingredientAdapter.analyzeIngredientSafety(product.ingredients);
          ingredientSafety = safetyData.score;
        }
        return { ...product, ingredientSafety };
      })
    );

    // Step 4: Score products
    console.log('[generateRecommendations] Step 4: Scoring products');
    const scoredProducts = enrichedProducts.map((product) => {
      const score = scoreProduct(product, quizAnswers, product.ingredientSafety || 50);
      return {
        product,
        ...score,
      };
    });

    // Sort by score
    scoredProducts.sort((a, b) => b.deterministicScore - a.deterministicScore);

    // Step 5: Use OpenAI to re-rank and generate explanations
    console.log('[generateRecommendations] Step 5: AI re-ranking');
    const topK = 10;
    const aiRankedProducts = await openAIService.reRankAndExplain(scoredProducts, topK);

    const result: RecommendationResult = {
      userId: userId || 'anonymous',
      timestamp: new Date().toISOString(),
      quizAnswers,
      recommendations: aiRankedProducts,
      metadata: {
        totalProductsFound: uniqueProducts.length,
        productsAfterFiltering: scoredProducts.length,
        processingTimeMs: Date.now() - startTime,
        cacheHit: false,
      },
    };

    // Save to Firestore if userId provided
    if (userId) {
      try {
        await setDoc(
          doc(db, 'users', userId, 'recommendations', result.timestamp),
          result
        );
        console.log('[generateRecommendations] Saved to Firestore');
      } catch (error) {
        console.warn('[generateRecommendations] Failed to save to Firestore:', error);
      }
    }

    console.log(`[generateRecommendations] Completed in ${result.metadata.processingTimeMs}ms`);
    return result;
  } catch (error: any) {
    console.error('Error generating recommendations:', error);
    throw new Error(`Failed to generate recommendations: ${error.message}`);
  }
}

/**
 * Get user's recommendation history from Firestore
 */
export async function getRecommendationHistory(userId: string): Promise<RecommendationResult[]> {
  try {
    const recommendationsRef = collection(db, 'users', userId, 'recommendations');
    const q = query(recommendationsRef, orderBy('timestamp', 'desc'), limit(10));
    const querySnapshot = await getDocs(q);

    return querySnapshot.docs.map(doc => doc.data() as RecommendationResult);
  } catch (error: any) {
    console.error('Error fetching recommendation history:', error);
    return [];
  }
}
