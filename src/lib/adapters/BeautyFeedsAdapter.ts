/**
 * Client-side adapter for BeautyFeeds.io API
 * API Key: f6b8e2e95439818289c2b0acbfb90b12d82210a8
 */

import { Product } from './OpenBeautyFactsAdapter';

const BEAUTYFEEDS_API_KEY = 'f6b8e2e95439818289c2b0acbfb90b12d82210a8';
// Note: Update this URL with the actual BeautyFeeds.io API endpoint
const BEAUTYFEEDS_BASE_URL = 'https://api.beautyfeeds.io/v1';

export class BeautyFeedsAdapter {
  /**
   * Search for products by tags/keywords
   */
  async searchProducts(tags: string[], limit: number = 50): Promise<Product[]> {
    try {
      // Build search query
      const searchQuery = tags.join(' ');
      const searchUrl = `${BEAUTYFEEDS_BASE_URL}/products/search`;

      console.log(`[BeautyFeeds] Searching: ${searchQuery}`);

      const response = await fetch(searchUrl, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${BEAUTYFEEDS_API_KEY}`,
          'Content-Type': 'application/json',
        },
      });

      if (!response.ok) {
        // If API endpoint doesn't exist yet, return mock data for development
        if (response.status === 404) {
          console.warn('[BeautyFeeds] API endpoint not available, returning mock data');
          return this.getMockProducts(tags, limit);
        }
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data = await response.json();
      const products: Product[] = [];

      // Handle different possible response structures
      const productData = data?.data || data?.products || data || [];

      if (Array.isArray(productData)) {
        for (const item of productData) {
          const product = this.transformProduct(item);
          if (product) {
            products.push(product);
          }
        }
      }

      console.log(`[BeautyFeeds] Found ${products.length} products`);
      return products.slice(0, limit);
    } catch (error: any) {
      console.error('[BeautyFeeds] Error searching products:', error.message);
      // Return mock data for development
      return this.getMockProducts(tags, limit);
    }
  }

  /**
   * Transform BeautyFeeds product to our Product format
   */
  private transformProduct(bfProduct: any): Product | null {
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
        name: 'Hydrating Shampoo for Curly Hair',
        brand: 'EcoHair',
        tags: ['shampoo', 'hydrating', 'curly-hair', 'vegan'],
        price: 12.99,
        source: 'beautyfeeds',
        ingredients: ['water', 'coconut oil', 'aloe vera'],
      },
      {
        id: 'bf_mock_2',
        name: 'Deep Conditioner for High Porosity Hair',
        brand: 'NaturalCurls',
        tags: ['conditioner', 'deep-treatment', 'high-porosity', 'cruelty-free'],
        price: 15.99,
        source: 'beautyfeeds',
        ingredients: ['water', 'shea butter', 'argan oil', 'protein'],
      },
      {
        id: 'bf_mock_3',
        name: 'Leave-In Conditioner',
        brand: 'CurlCare',
        tags: ['leave-in', 'moisturizing', 'frizz-control'],
        price: 18.99,
        source: 'beautyfeeds',
        ingredients: ['water', 'glycerin', 'jojoba oil'],
      },
    ];

    return mockProducts.slice(0, limit);
  }
}

