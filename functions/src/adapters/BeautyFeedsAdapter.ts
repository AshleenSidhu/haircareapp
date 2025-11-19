/**
 * Adapter for BeautyFeeds.io API
 */

import axios from 'axios';
import { Product, BeautyFeedsProduct } from '../types';
import { cache } from '../utils/cache';

const BEAUTYFEEDS_API_KEY = 'f6b8e2e95439818289c2b0acbfb90b12d82210a8';
const BEAUTYFEEDS_BASE_URL = 'https://api.beautyfeeds.io/v1'; // Update with actual API endpoint

export class BeautyFeedsAdapter {
  /**
   * Search for products by tags/keywords
   */
  async searchProducts(tags: string[], limit: number = 50): Promise<Product[]> {
    try {
      const cacheKey = cache.getProductSearchKey('beautyfeeds', tags);

      // Check cache
      const cached = cache.get<Product[]>(cacheKey);
      if (cached) {
        console.log(`[BeautyFeeds] Cache hit for tags: ${tags.join(', ')}`);
        return cached.slice(0, limit);
      }

      // Build search query
      const searchQuery = tags.join(' ');
      const searchUrl = `${BEAUTYFEEDS_BASE_URL}/products/search`;

      console.log(`[BeautyFeeds] Searching: ${searchQuery}`);

      const response = await axios.get(searchUrl, {
        params: {
          q: searchQuery,
          limit,
          api_key: BEAUTYFEEDS_API_KEY,
        },
        timeout: 10000,
        headers: {
          'Authorization': `Bearer ${BEAUTYFEEDS_API_KEY}`,
          'Content-Type': 'application/json',
        },
      });

      const products: Product[] = [];

      // Handle different possible response structures
      const productData = response.data?.data || response.data?.products || response.data || [];

      if (Array.isArray(productData)) {
        for (const item of productData) {
          const product = this.transformProduct(item);
          if (product) {
            products.push(product);
          }
        }
      }

      // Cache results
      cache.set(cacheKey, products, 3600);

      console.log(`[BeautyFeeds] Found ${products.length} products`);
      return products.slice(0, limit);
    } catch (error: any) {
      console.error('[BeautyFeeds] Error searching products:', error.message);
      // If API endpoint doesn't exist yet, return mock data for development
      if (error.code === 'ENOTFOUND' || error.response?.status === 404) {
        console.warn('[BeautyFeeds] API endpoint not available, returning mock data');
        return this.getMockProducts(tags, limit);
      }
      return [];
    }
  }

  /**
   * Get product by ID
   */
  async getProductById(productId: string): Promise<Product | null> {
    try {
      const cacheKey = `beautyfeeds:product:${productId}`;
      const cached = cache.get<Product>(cacheKey);
      if (cached) {
        return cached;
      }

      const response = await axios.get(`${BEAUTYFEEDS_BASE_URL}/products/${productId}`, {
        params: {
          api_key: BEAUTYFEEDS_API_KEY,
        },
        timeout: 10000,
      });

      if (response.data?.data || response.data) {
        const product = this.transformProduct(response.data.data || response.data);
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
  private transformProduct(bfProduct: BeautyFeedsProduct): Product | null {
    try {
      if (!bfProduct.name || !bfProduct.brand) {
        return null;
      }

      return {
        id: bfProduct.id || `bf_${Date.now()}_${Math.random()}`,
        name: bfProduct.name,
        brand: bfProduct.brand,
        upc: bfProduct.upc,
        description: bfProduct.description,
        imageUrl: bfProduct.image,
        price: bfProduct.price,
        tags: bfProduct.tags || [],
        source: 'beautyfeeds',
        sourceId: bfProduct.id,
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
        name: 'Hydrating Shampoo',
        brand: 'EcoHair',
        tags: ['shampoo', 'hydrating', 'curly-hair'],
        price: 12.99,
        source: 'beautyfeeds',
      },
      {
        id: 'bf_mock_2',
        name: 'Deep Conditioner',
        brand: 'NaturalCurls',
        tags: ['conditioner', 'deep-treatment', 'high-porosity'],
        price: 15.99,
        source: 'beautyfeeds',
      },
    ];

    return mockProducts.slice(0, limit);
  }
}

