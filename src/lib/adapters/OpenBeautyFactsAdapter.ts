/**
 * Client-side adapter for Open Beauty Facts API
 * Free, open-source product database
 * Documentation: https://world.openbeautyfacts.org/data
 */

const OPEN_BEAUTY_FACTS_API = 'https://world.openbeautyfacts.org/api/v0';

export interface Product {
  id: string;
  name: string;
  brand: string;
  upc?: string;
  description?: string;
  imageUrl?: string;
  price?: number;
  currency?: string;
  tags: string[];
  ingredients?: string[];
  source: 'openbeautyfacts' | 'beautyfeeds' | 'manual';
  sourceId?: string;
  url?: string;
}

export class OpenBeautyFactsAdapter {
  /**
   * Search for products by tags/categories
   */
  async searchProducts(tags: string[], limit: number = 50): Promise<Product[]> {
    try {
      // Search by category tags
      // Open Beauty Facts uses category tags like "en:shampoos", "en:conditioners"
      const categoryTags = tags.map(tag => `en:${tag.toLowerCase()}`);
      const searchUrl = `${OPEN_BEAUTY_FACTS_API}/search.json?categories_tags=${categoryTags.join(',')}&page_size=${limit}`;

      console.log(`[OpenBeautyFacts] Searching: ${searchUrl}`);

      const response = await fetch(searchUrl, {
        headers: {
          'User-Agent': 'HairCareApp/1.0',
        },
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data = await response.json();
      const products: Product[] = [];

      if (data?.products) {
        for (const item of data.products) {
          const product = this.transformProduct(item);
          if (product) {
            products.push(product);
          }
        }
      }

      console.log(`[OpenBeautyFacts] Found ${products.length} products`);
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
      const response = await fetch(`${OPEN_BEAUTY_FACTS_API}/product/${barcode}.json`);

      if (!response.ok) {
        return null;
      }

      const data = await response.json();

      if (data?.status === 1 && data.product) {
        return this.transformProduct(data.product);
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
  private transformProduct(obfProduct: any): Product | null {
    try {
      if (!obfProduct.product_name || !obfProduct.brands) {
        return null;
      }

      // Extract tags from categories
      const tags: string[] = [];
      if (obfProduct.categories_tags) {
        tags.push(...obfProduct.categories_tags.map((tag: string) => tag.replace('en:', '')));
      }

      // Parse ingredients
      const ingredients: string[] = [];
      if (obfProduct.ingredients_text) {
        ingredients.push(...obfProduct.ingredients_text.split(',').map((i: string) => i.trim()));
      }

      return {
        id: obfProduct.code || `obf_${Date.now()}_${Math.random()}`,
        name: obfProduct.product_name,
        brand: obfProduct.brands.split(',')[0].trim(),
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

