/**
 * Caching utility for API calls to avoid rate limits
 * Uses in-memory cache with TTL (Time To Live)
 */

import NodeCache from 'node-cache';

// Cache configuration
const CACHE_TTL = {
  PRODUCTS: 3600, // 1 hour for product data
  INGREDIENTS: 86400, // 24 hours for ingredient safety (rarely changes)
  REVIEWS: 1800, // 30 minutes for reviews (more dynamic)
  AI_RESPONSES: 7200, // 2 hours for AI explanations
};

class CacheManager {
  private cache: NodeCache;

  constructor() {
    this.cache = new NodeCache({
      stdTTL: CACHE_TTL.PRODUCTS,
      checkperiod: 600, // Check for expired keys every 10 minutes
      useClones: false, // Better performance for large objects
    });
  }

  /**
   * Get cached value by key
   */
  get<T>(key: string): T | undefined {
    return this.cache.get<T>(key);
  }

  /**
   * Set cached value with optional TTL
   */
  set<T>(key: string, value: T, ttl?: number): boolean {
    return this.cache.set(key, value, ttl || CACHE_TTL.PRODUCTS);
  }

  /**
   * Check if key exists in cache
   */
  has(key: string): boolean {
    return this.cache.has(key);
  }

  /**
   * Delete cached value
   */
  delete(key: string): number {
    return this.cache.del(key);
  }

  /**
   * Clear all cache
   */
  clear(): void {
    this.cache.flushAll();
  }

  /**
   * Generate cache key for product search
   */
  getProductSearchKey(query: string, tags: string[]): string {
    const sortedTags = tags.sort().join(',');
    return `products:search:${query}:${sortedTags}`;
  }

  /**
   * Generate cache key for ingredient safety
   */
  getIngredientKey(ingredientName: string): string {
    return `ingredient:safety:${ingredientName.toLowerCase()}`;
  }

  /**
   * Generate cache key for reviews
   */
  getReviewKey(productId: string, source: string): string {
    return `reviews:${source}:${productId}`;
  }

  /**
   * Generate cache key for AI explanation
   */
  getAIExplanationKey(products: string[]): string {
    const sorted = products.sort().join(',');
    return `ai:explanation:${sorted}`;
  }
}

// Export singleton instance
export const cache = new CacheManager();
export { CACHE_TTL };

