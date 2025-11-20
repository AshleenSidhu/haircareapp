/**
 * Open Beauty Facts API Adapter for Cloud Functions
 * Free, open-source product database
 * Used for additional ingredient information, allergen info, sustainability labels
 * Documentation: https://world.openbeautyfacts.org/data
 */

import axios from 'axios';
import { Product } from '../types';
import { cache } from '../utils/cache';

// Open Beauty Facts API - real product database
// Using v2 API for better data structure
const OPEN_BEAUTY_FACTS_API_V2 = 'https://world.openbeautyfacts.org/api/v2';
const OPEN_BEAUTY_FACTS_API_V0 = 'https://world.openbeautyfacts.org/api/v0';
const OPEN_BEAUTY_FACTS_SEARCH = 'https://world.openbeautyfacts.org/cgi/search.pl';
const OPEN_BEAUTY_FACTS_IMAGES = 'https://static.openbeautyfacts.org/images';

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

      // Search by category tags - Open Beauty Facts uses category tags like "en:shampoos"
      const categoryTags = tags.map(tag => {
        // Map common tags to Open Beauty Facts categories
        const tagMap: { [key: string]: string } = {
          'shampoo': 'en:shampoos',
          'conditioner': 'en:conditioners',
          'hair-care': 'en:hair-care-products',
          'hair-treatment': 'en:hair-treatments',
          'styling': 'en:hair-styling-products',
          'treatment': 'en:hair-treatments',
        };
        return tagMap[tag.toLowerCase()] || `en:${tag.toLowerCase()}`;
      }).filter(Boolean);

      console.log(`[OpenBeautyFacts] Searching for REAL products with categories: ${categoryTags.join(', ')}`);

      // Use the search API endpoint
      const searchParams: any = {
        action: 'process',
        tagtype_0: 'categories',
        tag_contains_0: 'contains',
        tag_0: categoryTags[0] || 'en:hair-care-products', // Use first category or default
        page_size: Math.min(limit, 100), // OBF API limit
        json: true,
        fields: 'code,product_name,product_name_en,brands,image_url,image_front_url,' +
          'image_ingredients_url,ingredients_text,ingredients,categories_tags,labels_tags,' +
          'allergens_tags,periods_after_opening,periods_after_opening_tags,last_modified_t',
      };

      console.log('[OpenBeautyFacts] API URL:', OPEN_BEAUTY_FACTS_SEARCH);
      console.log('[OpenBeautyFacts] Search params:', searchParams);

      const response = await axios.get(OPEN_BEAUTY_FACTS_SEARCH, {
        params: searchParams,
        headers: {
          'User-Agent': 'HairCareApp/1.0 (contact@haircareapp.com)',
        },
        timeout: 20000,
      });

      console.log(`[OpenBeautyFacts] API response status: ${response.status}`);
      console.log(`[OpenBeautyFacts] API response has data: ${!!response.data}`);

      if (!response.data) {
        throw new Error('No data returned from API');
      }

      const products: Product[] = [];

      // Handle both search.json and search.pl response formats
      const productList = response.data?.products || response.data?.results || [];
      
      console.log('[OpenBeautyFacts] Product list length:', productList.length);
      console.log('[OpenBeautyFacts] Response structure:', {
        hasProducts: !!response.data.products,
        hasResults: !!response.data.results,
        productsLength: response.data.products?.length,
        resultsLength: response.data.results?.length,
      });
      
      if (Array.isArray(productList) && productList.length > 0) {
        console.log(`[OpenBeautyFacts] Processing ${productList.length} real products from API`);
        for (let i = 0; i < productList.length; i++) {
          const item = productList[i];
          const product = this.transformProduct(item);
          if (product && product.name) {
            // Be more lenient - include products with name even if brand is Unknown
            // (Open Beauty Facts sometimes has Unknown brands)
            if (product.brand && product.brand !== 'Unknown') {
              products.push(product);
            } else if (product.name && product.name.trim().length > 0) {
              // Include products with valid name even if brand is Unknown
              console.log(`[OpenBeautyFacts] Including product with Unknown brand: ${product.name}`);
              products.push(product);
            } else {
              console.warn('[OpenBeautyFacts] Skipping product', i + 1, ': no valid name or brand');
            }
          } else {
              console.warn('[OpenBeautyFacts] Skipping product', i + 1, ': transform returned null');
          }
        }
      } else {
        console.warn('[OpenBeautyFacts] No products found in API response');
        console.warn('[OpenBeautyFacts] Response data keys:', Object.keys(response.data || {}));
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

      // Try v2 API first, fallback to v0
      let productData = null;
      try {
        const v2Response = await axios.get(`${OPEN_BEAUTY_FACTS_API_V2}/product/${barcode}.json`, {
          headers: {
            'User-Agent': 'HairCareApp/1.0',
          },
          timeout: 10000,
        });
        if (v2Response.data && v2Response.data.product) {
          productData = v2Response.data.product;
        }
      } catch (v2Error: any) {
        // Fallback to v0 API
        console.log(`[OpenBeautyFacts] v2 API failed, trying v0: ${v2Error.message}`);
        const v0Response = await axios.get(`${OPEN_BEAUTY_FACTS_API_V0}/product/${barcode}.json`, {
          headers: {
            'User-Agent': 'HairCareApp/1.0',
          },
          timeout: 10000,
        });
        if (v0Response.data && v0Response.data.status === 1 && v0Response.data.product) {
          productData = v0Response.data.product;
        }
      }

      if (!productData) {
        return null;
      }

      const product = this.transformProduct(productData);
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

      // Extract image URLs - Open Beauty Facts uses predictable paths
      // Format: https://static.openbeautyfacts.org/images/products/{code}/{image_id}.{size}.jpg
      let imageUrl = obfProduct.image_url || 
                     obfProduct.image_front_url || 
                     obfProduct.image_front_small_url ||
                     obfProduct.image_small_url ||
                     obfProduct.image_thumb_url;
      
      // If image URL is relative or missing, construct from product code
      if (!imageUrl && obfProduct.code) {
        // Use predictable image path structure
        // Front image: images/products/{code}/front.{size}.jpg
        imageUrl = `${OPEN_BEAUTY_FACTS_IMAGES}/products/${obfProduct.code}/front.400.jpg`;
      } else if (imageUrl && !imageUrl.startsWith('http')) {
        // If relative URL, make it absolute
        imageUrl = `https://images.openbeautyfacts.org${imageUrl}`;
      }

      // Extract ingredients image if available
      let ingredientsImageUrl = obfProduct.image_ingredients_url;
      if (!ingredientsImageUrl && obfProduct.code) {
        ingredientsImageUrl = `${OPEN_BEAUTY_FACTS_IMAGES}/products/${obfProduct.code}/ingredients.400.jpg`;
      } else if (ingredientsImageUrl && !ingredientsImageUrl.startsWith('http')) {
        ingredientsImageUrl = `https://images.openbeautyfacts.org${ingredientsImageUrl}`;
      }

      // Extract periods after opening if available
      const periodsAfterOpening = obfProduct.periods_after_opening || 
                                  obfProduct.periods_after_opening_tags?.[0]?.replace('en:', '');

      return {
        id: obfProduct.code || `obf_${Date.now()}_${Math.random()}`,
        name: productName,
        brand,
        upc: obfProduct.code,
        barcode: obfProduct.code,
        description: obfProduct.product_name || productName,
        imageUrl: imageUrl || undefined,
        images: {
          front: imageUrl || undefined,
          ingredients: ingredientsImageUrl || undefined,
        },
        price: obfProduct.nutriments?.price || obfProduct.product_quantity,
        currency: 'USD',
        tags,
        ingredients,
        ingredients_inci: obfProduct.ingredients_text || ingredients.join(', '),
        ingredients_raw: obfProduct.ingredients || ingredients.map(ing => ({ text: ing })),
        categories: obfProduct.categories_tags?.map((tag: string) => tag.replace('en:', '')) || tags,
        source: 'open_beauty_facts',
        sourceId: obfProduct.code,
        url: `https://world.openbeautyfacts.org/product/${obfProduct.code}`,
        last_modified_server: obfProduct.last_modified_t,
        // Store allergen info in a way that can be used later
        ...(allergenInfo.length > 0 && { allergenInfo }),
        // Store periods after opening
        ...(periodsAfterOpening && { periodsAfterOpening }),
      };
    } catch (error) {
      console.error('[OpenBeautyFacts] Error transforming product:', error);
      return null;
    }
  }
}
