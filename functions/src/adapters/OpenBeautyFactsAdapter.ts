/**
 * Open Beauty Facts API Adapter for Cloud Functions
 * Free, open-source product database
 * Used for additional ingredient information, allergen info, sustainability labels
 * Documentation: https://world.openbeautyfacts.org/data
 */

import axios from 'axios';
import { Product } from '../types';
import { cache } from '../utils/cache';

const OPEN_BEAUTY_FACTS_API = 'https://world.openbeautyfacts.org/api/v0';

export class OpenBeautyFactsAdapter {
  /**
   * Search for products by tags/categories
   */
  async searchProducts(tags: string[], limit: number = 50): Promise<Product[]> {
    try {
      const searchQuery = tags.join(' ');
      const cacheKey = `obf_search_${searchQuery}_${limit}`;
      
      // Check cache
      const cached = cache.get<Product[]>(cacheKey);
      if (cached) {
        console.log('[OpenBeautyFacts] Cache hit');
        return cached;
      }

      // Search by category tags
      // Open Beauty Facts uses category tags like "en:shampoos", "en:conditioners"
      const categoryTags = tags.map(tag => `en:${tag.toLowerCase()}`);
      const searchUrl = `${OPEN_BEAUTY_FACTS_API}/search.json`;
      
      console.log(`[OpenBeautyFacts] Searching: ${searchQuery}`);

      const response = await axios.get(searchUrl, {
        params: {
          categories_tags: categoryTags.join(','),
          page_size: limit,
        },
        headers: {
          'User-Agent': 'HairCareApp/1.0',
        },
        timeout: 15000,
      });

      if (!response.data) {
        throw new Error('No data returned from API');
      }

      const products: Product[] = [];

      if (response.data?.products) {
        for (const item of response.data.products) {
          const product = this.transformProduct(item);
          if (product) {
            products.push(product);
          }
        }
      }

      console.log(`[OpenBeautyFacts] Found ${products.length} products`);
      
      // Cache results for 1 hour
      if (products.length > 0) {
        cache.set(cacheKey, products, 3600);
      }

      return products.slice(0, limit);
    } catch (error: any) {
      console.error('[OpenBeautyFacts] Error searching products:', error.message);
      return [];
    }
  }

  /**
   * Get product by barcode/UPC
   */
  async getProductByBarcode(barcode: string): Promise<Product | null> {
    try {
      const cacheKey = `obf_barcode_${barcode}`;
      const cached = cache.get<Product>(cacheKey);
      if (cached) {
        return cached;
      }

      const response = await axios.get(`${OPEN_BEAUTY_FACTS_API}/product/${barcode}.json`, {
        headers: {
          'User-Agent': 'HairCareApp/1.0',
        },
        timeout: 10000,
      });

      if (!response.data || response.data.status !== 1 || !response.data.product) {
        return null;
      }

      const product = this.transformProduct(response.data.product);
      if (product) {
        cache.set(cacheKey, product, 3600);
      }

      return product;
    } catch (error: any) {
      console.error(`[OpenBeautyFacts] Error fetching product ${barcode}:`, error.message);
      return null;
    }
  }

  /**
   * Transform Open Beauty Facts product to our Product format
   * Extracts sustainability labels, allergen info, and eco-friendly tags
   */
  private transformProduct(obfProduct: any): Product | null {
    try {
      if (!obfProduct.product_name && !obfProduct.product_name_en) {
        return null;
      }

      const productName = obfProduct.product_name || obfProduct.product_name_en;
      const brands = obfProduct.brands || obfProduct.brand || 'Unknown';
      const brand = Array.isArray(brands) ? brands[0] : brands.split(',')[0].trim();

      // Extract tags from categories
      const tags: string[] = [];
      if (obfProduct.categories_tags) {
        tags.push(...obfProduct.categories_tags.map((tag: string) => tag.replace('en:', '')));
      }

      // Extract sustainability and eco-friendly labels
      if (obfProduct.labels_tags) {
        const labels = obfProduct.labels_tags.map((label: string) => label.replace('en:', ''));
        tags.push(...labels);
        
        // Check for specific sustainability tags
        if (labels.some((l: string) => l.includes('organic') || l.includes('bio'))) {
          tags.push('organic');
        }
        if (labels.some((l: string) => l.includes('vegan'))) {
          tags.push('vegan', 'cruelty-free');
        }
        if (labels.some((l: string) => l.includes('fair-trade'))) {
          tags.push('fair-trade', 'sustainable');
        }
      }

      // Parse ingredients
      const ingredients: string[] = [];
      if (obfProduct.ingredients_text) {
        ingredients.push(...obfProduct.ingredients_text.split(',').map((i: string) => i.trim()));
      }
      if (obfProduct.ingredients && Array.isArray(obfProduct.ingredients)) {
        ingredients.push(...obfProduct.ingredients.map((ing: any) => ing.text || ing.id || ''));
      }

      // Extract allergen information
      const allergenInfo: string[] = [];
      if (obfProduct.allergens_tags) {
        allergenInfo.push(...obfProduct.allergens_tags.map((tag: string) => tag.replace('en:', '')));
      }

      return {
        id: obfProduct.code || `obf_${Date.now()}_${Math.random()}`,
        name: productName,
        brand,
        upc: obfProduct.code,
        description: obfProduct.product_name || productName,
        imageUrl: obfProduct.image_url || obfProduct.image_front_url,
        price: obfProduct.nutriments?.price || obfProduct.product_quantity,
        currency: 'USD',
        tags,
        ingredients,
        source: 'openbeautyfacts',
        sourceId: obfProduct.code,
        url: `https://world.openbeautyfacts.org/product/${obfProduct.code}`,
        // Store allergen info in a way that can be used later
        ...(allergenInfo.length > 0 && { allergenInfo }),
      };
    } catch (error) {
      console.error('[OpenBeautyFacts] Error transforming product:', error);
      return null;
    }
  }
}
