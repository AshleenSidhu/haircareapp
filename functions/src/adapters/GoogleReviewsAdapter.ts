/**
 * Adapter for Google Reviews / Product Reviews
 * Note: Google Reviews API requires authentication and may have restrictions
 * This is a placeholder implementation that can be extended
 */

import axios from 'axios';
import { ReviewData } from '../types';
import { cache } from '../utils/cache';

// Placeholder - Google Reviews API or alternative review aggregator
const REVIEWS_API = 'https://api.reviews-aggregator.com/v1'; // Update with actual endpoint

export class GoogleReviewsAdapter {
  /**
   * Get reviews and sentiment for a product
   */
  async getProductReviews(
    productName: string,
    brand: string,
    upc?: string
  ): Promise<ReviewData | null> {
    try {
      const cacheKey = cache.getReviewKey(`${brand}_${productName}`, 'google');
      const cached = cache.get<ReviewData>(cacheKey);
      if (cached) {
        return cached;
      }

      // Try to fetch from API
      const reviewData = await this.fetchReviews(productName, brand, upc);

      if (reviewData) {
        cache.set(cacheKey, reviewData, 1800); // 30 min cache
        return reviewData;
      }

      // Fallback to mock data for development
      return this.getMockReviews();
    } catch (error: any) {
      console.error('[GoogleReviewsAdapter] Error fetching reviews:', error.message);
      return this.getMockReviews();
    }
  }

  /**
   * Fetch reviews from API
   */
  private async fetchReviews(
    productName: string,
    brand: string,
    upc?: string
  ): Promise<ReviewData | null> {
    try {
      // Attempt to fetch from reviews API
      const response = await axios.get(REVIEWS_API + '/reviews', {
        params: {
          product: `${brand} ${productName}`,
          upc,
        },
        timeout: 10000,
      });

      if (response.data) {
        return this.parseReviewData(response.data);
      }

      return null;
    } catch (error: any) {
      // API not available - return null to trigger fallback
      if (error.code === 'ENOTFOUND' || error.response?.status === 404) {
        return null;
      }
      throw error;
    }
  }

  /**
   * Parse API response to ReviewData format
   */
  private parseReviewData(data: any): ReviewData {
    const reviews = data.reviews || [];
    const ratings = reviews.map((r: any) => r.rating || 0).filter((r: number) => r > 0);

    const averageRating = ratings.length > 0
      ? ratings.reduce((a: number, b: number) => a + b, 0) / ratings.length
      : 0;

    // Calculate sentiment score (-1 to 1)
    // Positive reviews (4-5 stars) contribute positively, negative (1-2 stars) negatively
    const sentimentScore = this.calculateSentiment(reviews);

    return {
      averageRating,
      totalReviews: reviews.length,
      sentimentScore,
      recentReviews: reviews.slice(0, 10).map((r: any) => ({
        rating: r.rating || 0,
        text: r.text || '',
        date: r.date || new Date().toISOString(),
      })),
    };
  }

  /**
   * Calculate sentiment score from reviews
   */
  private calculateSentiment(reviews: any[]): number {
    if (reviews.length === 0) return 0;

    let sentimentSum = 0;
    for (const review of reviews) {
      const rating = review.rating || 0;
      // Convert 1-5 star rating to -1 to 1 sentiment
      // 5 stars = 1.0, 4 stars = 0.5, 3 stars = 0, 2 stars = -0.5, 1 star = -1.0
      const sentiment = (rating - 3) / 2;
      sentimentSum += sentiment;
    }

    return Math.max(-1, Math.min(1, sentimentSum / reviews.length));
  }

  /**
   * Mock reviews for development/testing
   */
  private getMockReviews(): ReviewData {
    return {
      averageRating: 4.2,
      totalReviews: 127,
      sentimentScore: 0.6, // Positive sentiment
      recentReviews: [
        {
          rating: 5,
          text: 'Great product! Really helped with my curly hair.',
          date: new Date().toISOString(),
        },
        {
          rating: 4,
          text: 'Works well, but a bit pricey.',
          date: new Date().toISOString(),
        },
      ],
    };
  }
}

