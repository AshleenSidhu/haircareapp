/**
 * Adapter for Open Beauty Facts API
 * Documentation: https://world.openbeautyfacts.org/data
 */

import axios from 'axios';
import { Product, OpenBeautyFactsProduct } from '../types';
import { cache } from '../utils/cache';

const OPEN_BEAUTY_FACTS_API = 'https://world.openbeautyfacts.org/api/v0';

export class OpenBeautyFactsAdapter {
  /**
   * Search for products by tags/categories
   */
  async searchProducts(tags: string[], limit: number = 50): Promise<Product[]> {
    try {
      // Build search query from tags
      const searchTerms = tags.join('+');
      const cacheKey = cache.getProductSearchKey('openbeautyfacts', tags);

      // Check cache first
      const cached = cache.get<Product[]>(cacheKey);
      if (cached) {
        console.log(`[OpenBeautyFacts] Cache hit for tags: ${tags.join(', ')}`);
        return cached.slice(0, limit);
      }

      // Search by category tags
      // Open Beauty Facts uses category tags like "en:shampoos", "en:conditioners"
      const categoryTags = tags.map(tag => `en:${tag.toLowerCase()}`);
      const searchUrl = `${OPEN_BEAUTY_FACTS_API}/search.json?categories_tags=${categoryTags.join(',')}&page_size=${limit}`;

      console.log(`[OpenBeautyFacts] Searching: ${searchUrl}`);

      const response = await axios.get(searchUrl, {
        timeout: 10000,
        headers: {
          'User-Agent': 'HairCareApp/1.0',
        },
      });

      const products: Product[] = [];

      if (response.data?.products) {
        for (const item of response.data.products) {
          const product = this.transformProduct(item);
          if (product) {
            products.push(product);
          }
        }
      }

      // Cache results
      cache.set(cacheKey, products, 3600);

      console.log(`[OpenBeautyFacts] Found ${products.length} products`);
      return products.slice(0, limit);
    } catch (error: any) {
      console.error('[OpenBeautyFacts] Error searching products:', error.message);
      // Return empty array on error to allow other adapters to work
      return [];
    }
  }

  /**
   * Get product by barcode/UPC
   */
  async getProductByBarcode(barcode: string): Promise<Product | null> {
    try {
      const cacheKey = `openbeautyfacts:product:${barcode}`;
      const cached = cache.get<Product>(cacheKey);
      if (cached) {
        return cached;
      }

      const response = await axios.get(`${OPEN_BEAUTY_FACTS_API}/product/${barcode}.json`, {
        timeout: 10000,
      });

      if (response.data?.status === 1 && response.data.product) {
        const product = this.transformProduct(response.data.product);
        if (product) {
          cache.set(cacheKey, product, 3600);
          return product;
        }
      }

      return null;
    } catch (error: any) {
      console.error(`[OpenBeautyFacts] Error fetching product ${barcode}:`, error.message);
      return null;
    }
  }

  /**
   * Transform Open Beauty Facts product to our Product format
   */
  private transformProduct(obfProduct: OpenBeautyFactsProduct): Product | null {
    try {
      if (!obfProduct.product_name || !obfProduct.brands) {
        return null;
      }

      // Extract tags from categories
      const tags: string[] = [];
      if (obfProduct.categories_tags) {
        tags.push(...obfProduct.categories_tags.map(tag => tag.replace('en:', '')));
      }

      // Parse ingredients
      const ingredients: string[] = [];
      if (obfProduct.ingredients_text) {
        ingredients.push(...obfProduct.ingredients_text.split(',').map(i => i.trim()));
      }

      return {
        id: obfProduct.code || `obf_${Date.now()}_${Math.random()}`,
        name: obfProduct.product_name,
        brand: obfProduct.brands.split(',')[0].trim(), // Take first brand
        upc: obfProduct.code,
        description: obfProduct.product_name,
        imageUrl: obfProduct.image_url,
        price: obfProduct.nutriments?.price,
        tags,
        ingredients,
        source: 'openbeautyfacts',
        sourceId: obfProduct.code,
      };
    } catch (error) {
      console.error('[OpenBeautyFacts] Error transforming product:', error);
      return null;
    }
  }
}

