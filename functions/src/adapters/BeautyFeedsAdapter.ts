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
   * Search for products by tags/keywords
   */
  async searchProducts(tags: string[], limit: number = 50): Promise<Product[]> {
    try {
      const searchQuery = tags.join(' ');
      const cacheKey = `beautyfeeds_search_${searchQuery}_${limit}`;
      
      // Check cache
      const cached = cache.get<Product[]>(cacheKey);
      if (cached) {
        console.log('[BeautyFeeds] Cache hit');
        return cached;
      }

      // Build search URL - adjust endpoint based on actual API
      const searchUrl = `${BEAUTYFEEDS_BASE_URL}/products/search`;
      
      console.log(`[BeautyFeeds] Searching: ${searchQuery}`);

      const response = await axios.get(searchUrl, {
        headers: {
          'Authorization': `Bearer ${BEAUTYFEEDS_API_KEY}`,
          'Content-Type': 'application/json',
        },
        params: {
          q: searchQuery,
          limit,
        },
        timeout: 10000,
      });

      if (!response.data) {
        throw new Error('No data returned from API');
      }

      const products: Product[] = [];
      const productData = response.data?.data || response.data?.products || response.data || [];

      if (Array.isArray(productData)) {
        for (const item of productData) {
          const product = this.transformProduct(item);
          if (product) {
            products.push(product);
          }
        }
      }

      console.log(`[BeautyFeeds] Found ${products.length} products`);
      
      // Cache results for 1 hour
      if (products.length > 0) {
        cache.set(cacheKey, products, 3600);
      }

      return products.slice(0, limit);
    } catch (error: any) {
      console.error('[BeautyFeeds] Error searching products:', error.message);
      // Return mock data for development if API fails
      if (error.code === 'ENOTFOUND' || error.response?.status === 404) {
        return this.getMockProducts(tags, limit);
      }
      throw error;
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
   */
  private transformProduct(bfProduct: any): Product | null {
    try {
      if (!bfProduct.name && !bfProduct.product_name) {
        return null;
      }

      const name = bfProduct.name || bfProduct.product_name;
      const brand = bfProduct.brand || bfProduct.brands || 'Unknown';

      return {
        id: bfProduct.id || `bf_${Date.now()}_${Math.random()}`,
        name,
        brand: Array.isArray(brand) ? brand[0] : brand,
        upc: bfProduct.upc || bfProduct.barcode,
        description: bfProduct.description || bfProduct.product_description,
        imageUrl: bfProduct.image || bfProduct.image_url || bfProduct.images?.[0],
        price: bfProduct.price || bfProduct.price_usd,
        currency: bfProduct.currency || 'USD',
        tags: bfProduct.tags || bfProduct.categories || [],
        ingredients: bfProduct.ingredients || [],
        source: 'beautyfeeds',
        sourceId: bfProduct.id,
        url: bfProduct.url || bfProduct.product_url,
      };
    } catch (error) {
      console.error('[BeautyFeeds] Error transforming product:', error);
      return null;
    }
  }

  /**
   * Mock products for development/testing when API is unavailable
   */
  private getMockProducts(tags: string[], limit: number): Product[] {
    const mockProducts: Product[] = [
      {
        id: 'bf_mock_1',
        name: 'Hydrating Shampoo for Curly Hair',
        brand: 'EcoHair',
        tags: ['shampoo', 'hydrating', 'curly-hair', 'vegan'],
        price: 12.99,
        currency: 'USD',
        source: 'beautyfeeds',
        ingredients: ['water', 'coconut oil', 'aloe vera'],
        imageUrl: 'https://via.placeholder.com/300',
      },
      {
        id: 'bf_mock_2',
        name: 'Deep Conditioner for High Porosity Hair',
        brand: 'NaturalCurls',
        tags: ['conditioner', 'deep-treatment', 'high-porosity', 'cruelty-free'],
        price: 15.99,
        currency: 'USD',
        source: 'beautyfeeds',
        ingredients: ['water', 'shea butter', 'argan oil', 'protein'],
        imageUrl: 'https://via.placeholder.com/300',
      },
      {
        id: 'bf_mock_3',
        name: 'Leave-In Conditioner',
        brand: 'CurlCare',
        tags: ['leave-in', 'moisturizing', 'frizz-control'],
        price: 18.99,
        currency: 'USD',
        source: 'beautyfeeds',
        ingredients: ['water', 'glycerin', 'jojoba oil'],
        imageUrl: 'https://via.placeholder.com/300',
      },
    ];

    return mockProducts.slice(0, limit);
  }
}
