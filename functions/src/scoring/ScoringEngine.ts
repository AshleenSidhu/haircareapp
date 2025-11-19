/**
 * Hybrid Scoring Engine
 * Combines deterministic scoring with AI re-ranking
 */

import { Product, ProductScore, UserQuizAnswers } from '../types';
import { IngredientAdapter } from '../adapters/IngredientAdapter';
import { GoogleReviewsAdapter } from '../adapters/GoogleReviewsAdapter';

export class ScoringEngine {
  private ingredientAdapter: IngredientAdapter;
  private reviewsAdapter: GoogleReviewsAdapter;

  // Scoring weights (must sum to 100%)
  private readonly WEIGHTS = {
    TAG_MATCH: 35,
    SUSTAINABILITY: 25,
    INGREDIENT_SAFETY: 20,
    REVIEW_SENTIMENT: 15,
    PRICE_MATCH: 5,
  };

  // Blacklisted brands (hard filter)
  private readonly BLACKLISTED_BRANDS = [
    // Add brands to blacklist here
  ];

  constructor() {
    this.ingredientAdapter = new IngredientAdapter();
    this.reviewsAdapter = new GoogleReviewsAdapter();
  }

  /**
   * Score all products based on user quiz answers
   */
  async scoreProducts(
    products: Product[],
    quizAnswers: UserQuizAnswers
  ): Promise<ProductScore[]> {
    const scoredProducts: ProductScore[] = [];

    for (const product of products) {
      // Hard filters - skip blacklisted brands
      if (this.isBlacklisted(product, quizAnswers)) {
        continue;
      }

      // Calculate deterministic score
      const score = await this.calculateDeterministicScore(product, quizAnswers);
      scoredProducts.push(score);
    }

    // Sort by deterministic score (descending)
    scoredProducts.sort((a, b) => b.deterministicScore - a.deterministicScore);

    return scoredProducts;
  }

  /**
   * Check if product should be filtered out (hard filters)
   */
  private isBlacklisted(product: Product, quizAnswers: UserQuizAnswers): boolean {
    // Check brand blacklist
    if (this.BLACKLISTED_BRANDS.some(bl => product.brand.toLowerCase().includes(bl.toLowerCase()))) {
      return true;
    }

    // Check allergen matches
    if (quizAnswers.allergens && quizAnswers.allergens.length > 0) {
      if (product.ingredientSafety?.allergenMatches) {
        const hasAllergen = quizAnswers.allergens.some(allergen =>
          product.ingredientSafety!.allergenMatches!.some(match =>
            match.toLowerCase().includes(allergen.toLowerCase())
          )
        );
        if (hasAllergen) {
          return true;
        }
      }
    }

    return false;
  }

  /**
   * Calculate deterministic score for a product
   */
  private async calculateDeterministicScore(
    product: Product,
    quizAnswers: UserQuizAnswers
  ): Promise<ProductScore> {
    // 1. Tag Match Score (35%)
    const tagMatchScore = this.calculateTagMatchScore(product, quizAnswers);

    // 2. Sustainability Score (25%)
    const sustainabilityScore = this.calculateSustainabilityScore(product, quizAnswers);

    // 3. Ingredient Safety Score (20%)
    const ingredientSafetyScore = await this.calculateIngredientSafetyScore(product);

    // 4. Review Sentiment Score (15%)
    const reviewSentimentScore = await this.calculateReviewSentimentScore(product);

    // 5. Price Match Score (5%)
    const priceMatchScore = this.calculatePriceMatchScore(product, quizAnswers);

    // Calculate weighted total
    const deterministicScore =
      tagMatchScore * (this.WEIGHTS.TAG_MATCH / 100) +
      sustainabilityScore * (this.WEIGHTS.SUSTAINABILITY / 100) +
      ingredientSafetyScore * (this.WEIGHTS.INGREDIENT_SAFETY / 100) +
      reviewSentimentScore * (this.WEIGHTS.REVIEW_SENTIMENT / 100) +
      priceMatchScore * (this.WEIGHTS.PRICE_MATCH / 100);

    return {
      product,
      deterministicScore: Math.max(0, Math.min(100, deterministicScore)),
      scoreBreakdown: {
        tagMatch: tagMatchScore,
        sustainability: sustainabilityScore,
        ingredientSafety: ingredientSafetyScore,
        reviewSentiment: reviewSentimentScore,
        priceMatch: priceMatchScore,
      },
    };
  }

  /**
   * Calculate tag match score (0-100)
   */
  private calculateTagMatchScore(product: Product, quizAnswers: UserQuizAnswers): number {
    if (!product.tags || product.tags.length === 0) {
      return 50; // Neutral if no tags
    }

    let matchCount = 0;
    let totalChecks = 0;

    // Check hair type match
    totalChecks++;
    if (product.tags.some(tag => tag.toLowerCase().includes(quizAnswers.hairType.toLowerCase()))) {
      matchCount++;
    }

    // Check porosity match
    totalChecks++;
    if (product.tags.some(tag => tag.toLowerCase().includes(quizAnswers.porosity.toLowerCase()))) {
      matchCount++;
    }

    // Check concerns match
    totalChecks += quizAnswers.concerns.length;
    for (const concern of quizAnswers.concerns) {
      if (product.tags.some(tag => tag.toLowerCase().includes(concern.toLowerCase()))) {
        matchCount++;
      }
    }

    // Check water type match
    totalChecks++;
    if (product.tags.some(tag => tag.toLowerCase().includes(quizAnswers.waterType.toLowerCase()))) {
      matchCount++;
    }

    return totalChecks > 0 ? (matchCount / totalChecks) * 100 : 50;
  }

  /**
   * Calculate sustainability score (0-100)
   */
  private calculateSustainabilityScore(product: Product, quizAnswers: UserQuizAnswers): number {
    let score = 50; // Start neutral

    // Check product sustainability data
    if (product.sustainability) {
      score = product.sustainability.score;
    } else {
      // Fallback: check preferences
      if (quizAnswers.preferences.vegan && product.tags?.some(t => t.includes('vegan'))) {
        score += 20;
      }
      if (quizAnswers.preferences.crueltyFree && product.tags?.some(t => t.includes('cruelty-free'))) {
        score += 20;
      }
      if (quizAnswers.preferences.organic && product.tags?.some(t => t.includes('organic'))) {
        score += 10;
      }
    }

    return Math.max(0, Math.min(100, score));
  }

  /**
   * Calculate ingredient safety score (0-100)
   */
  private async calculateIngredientSafetyScore(product: Product): Promise<number> {
    if (product.ingredientSafety) {
      return product.ingredientSafety.score;
    }

    // Analyze ingredients if not already done
    if (product.ingredients && product.ingredients.length > 0) {
      const safetyData = await this.ingredientAdapter.analyzeIngredientSafety(product.ingredients);
      product.ingredientSafety = safetyData;
      return safetyData.score;
    }

    return 50; // Neutral if no ingredient data
  }

  /**
   * Calculate review sentiment score (0-100)
   * Converts -1 to 1 sentiment to 0-100 scale
   */
  private async calculateReviewSentimentScore(product: Product): Promise<number> {
    if (product.reviews) {
      // Convert sentiment (-1 to 1) to score (0 to 100)
      return ((product.reviews.sentimentScore + 1) / 2) * 100;
    }

    // Fetch reviews if not available
    const reviewData = await this.reviewsAdapter.getProductReviews(
      product.name,
      product.brand,
      product.upc
    );

    if (reviewData) {
      product.reviews = reviewData;
      return ((reviewData.sentimentScore + 1) / 2) * 100;
    }

    return 50; // Neutral if no reviews
  }

  /**
   * Calculate price match score (0-100)
   */
  private calculatePriceMatchScore(product: Product, quizAnswers: UserQuizAnswers): number {
    if (!product.price || !quizAnswers.budget) {
      return 50; // Neutral if no price/budget data
    }

    const budgetRanges = {
      low: { min: 0, max: 15 },
      medium: { min: 15, max: 35 },
      high: { min: 35, max: Infinity },
    };

    const range = budgetRanges[quizAnswers.budget];
    const price = product.price;

    if (price >= range.min && price <= range.max) {
      return 100; // Perfect match
    } else if (price < range.min) {
      return 70; // Below budget (still acceptable)
    } else {
      // Above budget - calculate penalty
      const overage = price - range.max;
      return Math.max(0, 50 - (overage / range.max) * 50);
    }
  }
}

