/**
 * BeautyFeeds.io API Adapter for Cloud Functions
 * Primary source for product info, images, brand, and pricing.
 */

import axios from 'axios';
import { Product } from '../types';
import { cache } from '../utils/cache';

// Get API key from environment variable
// Set via: export BEAUTYFEEDS_API_KEY="your-key"
const BEAUTYFEEDS_API_KEY = process.env.BEAUTYFEEDS_API_KEY || 
  'f6b8e2e95439818289c2b0acbfb90b12d82210a8';
const BEAUTYFEEDS_BASE_URL = process.env.BEAUTYFEEDS_API_URL || 
  'https://api.beautyfeeds.io/v1';

export class BeautyFeedsAdapter {
  /**
   * Search for products by tags/categories
   * Uses BeautyFeeds Starter plan filters: category (text) and site_name (text)
   */
  async searchProducts(tags: string[], limit: number = 50): Promise<Product[]> {
    try {
      // Map tags to BeautyFeeds categories (hair care related)
      // BeautyFeeds uses category filter (text)
      const categoryMap: { [key: string]: string } = {
        'shampoo': 'shampoo',
        'conditioner': 'conditioner',
        'hair-care': 'hair care',
        'hair-treatment': 'hair treatment',
        'styling': 'hair styling',
        'treatment': 'hair treatment',
      };
      
      // Use the first matching category or default to 'hair care'
      const category = tags
        .map(tag => categoryMap[tag.toLowerCase()])
        .find(cat => cat) || 'hair care';
      
      const cacheKey = `beautyfeeds_search_${category}_${limit}`;
      
      // Check cache
      const cached = cache.get<Product[]>(cacheKey);
      if (cached) {
        console.log('[BeautyFeeds] Cache hit');
        return cached;
      }

      // Build search URL - use category filter (Starter plan supports: category, site_name)
      const searchUrl = `${BEAUTYFEEDS_BASE_URL}/products/search`;
      
      console.log(`[BeautyFeeds] Searching with category filter: ${category}`);

      const response = await axios.get(searchUrl, {
        headers: {
          'Authorization': `Bearer ${BEAUTYFEEDS_API_KEY}`,
          'Content-Type': 'application/json',
        },
        params: {
          category: category, // Use category filter (text) - one of the 2 available filters
          limit,
        },
        timeout: 10000,
      });

      if (!response.data) {
        throw new Error('No data returned from API');
      }

      const products: Product[] = [];
      
      // BeautyFeeds Starter plan response format: { "data": [...], "filters": [...], "total": 1000, "plan": "Starter" }
      const productData = response.data?.data || [];

      if (Array.isArray(productData)) {
        console.log(`[BeautyFeeds] API returned ${productData.length} products (plan: ${response.data?.plan || 'unknown'}, total: ${response.data?.total || 0})`);
        for (const item of productData) {
          const product = this.transformProduct(item);
          if (product) {
            products.push(product);
          }
        }
      }

      console.log(`[BeautyFeeds] Successfully transformed ${products.length} products`);
      
      // Cache results for 1 hour
      if (products.length > 0) {
        cache.set(cacheKey, products, 3600);
      }

      return products.slice(0, limit);
    } catch (error: any) {
      console.error('[BeautyFeeds] Error searching products:', error.message);
      // Don't return mock data - return empty array to ensure only real products are used
      console.warn('[BeautyFeeds] API unavailable, returning empty array. Only real products from APIs will be used.');
      return [];
    }
  }

  /**
   * Get detailed product information by ID
   */
  async getProductById(productId: string): Promise<Product | null> {
    try {
      const cacheKey = `beautyfeeds_product_${productId}`;
      const cached = cache.get<Product>(cacheKey);
      if (cached) {
        return cached;
      }

      const response = await axios.get(`${BEAUTYFEEDS_BASE_URL}/products/${productId}`, {
        headers: {
          'Authorization': `Bearer ${BEAUTYFEEDS_API_KEY}`,
        },
        timeout: 10000,
      });

      if (response.data) {
        const product = this.transformProduct(response.data);
        if (product) {
          cache.set(cacheKey, product, 3600);
          return product;
        }
      }

      return null;
    } catch (error: any) {
      console.error(`[BeautyFeeds] Error fetching product ${productId}:`, error.message);
      return null;
    }
  }

  /**
   * Transform BeautyFeeds product to our Product format
   * Maps BeautyFeeds Starter plan fields (26 fields) to our Product interface
   */
  private transformProduct(bfProduct: any): Product | null {
    try {
      // BeautyFeeds Starter plan uses 'product_name' field
      if (!bfProduct.product_name) {
        return null;
      }

      // Map BeautyFeeds fields to our Product format
      // Available fields: uniq_id, product_name, brand_name, description, ingredients, 
      // price, currency, primary_image_url, category_1, category_2, category_3, 
      // upc, ean_list, asin, product_url, etc.
      const name = bfProduct.product_name;
      const brand = bfProduct.brand_name || 'Unknown';
      
      // Combine category fields for tags
      const categories = [
        bfProduct.category_1,
        bfProduct.category_2,
        bfProduct.category_3,
      ].filter(Boolean);

      // Extract ingredients - could be string or array
      let ingredients: string[] = [];
      if (typeof bfProduct.ingredients === 'string') {
        // Parse comma-separated ingredients
        ingredients = bfProduct.ingredients
          .split(',')
          .map((ing: string) => ing.trim())
          .filter(Boolean);
      } else if (Array.isArray(bfProduct.ingredients)) {
        ingredients = bfProduct.ingredients;
      }

      return {
        id: bfProduct.uniq_id || `bf_${Date.now()}_${Math.random()}`,
        name,
        brand,
        upc: bfProduct.upc || (bfProduct.ean_list && bfProduct.ean_list[0]) || undefined,
        description: bfProduct.description || bfProduct.summary,
        imageUrl: bfProduct.primary_image_url || 
                 (bfProduct.additional_images && bfProduct.additional_images[0]) || 
                 undefined,
        price: typeof bfProduct.price === 'number' ? bfProduct.price : 
               (typeof bfProduct.price === 'string' ? parseFloat(bfProduct.price) : undefined),
        currency: bfProduct.currency || 'USD',
        tags: categories.length > 0 ? categories : [],
        ingredients: ingredients,
        source: 'beautyfeeds',
        sourceId: bfProduct.uniq_id,
        url: bfProduct.product_url,
      };
    } catch (error) {
      console.error('[BeautyFeeds] Error transforming product:', error);
      return null;
    }
  }

  // Removed getMockProducts - we only use real products from APIs, no mock data
}
