/**
 * Product Deduplication Utility
 * Merges products from multiple sources using UPC, brand, and name matching
 */

import { Product } from '../types';

export class ProductDeduplicator {
  /**
   * Deduplicate products from multiple sources
   */
  deduplicate(products: Product[]): Product[] {
    const seen = new Map<string, Product>();
    const merged: Product[] = [];

    for (const product of products) {
      const key = this.generateKey(product);
      const existing = seen.get(key);

      if (existing) {
        // Merge with existing product
        const mergedProduct = this.mergeProducts(existing, product);
        seen.set(key, mergedProduct);
      } else {
        seen.set(key, product);
      }
    }

    return Array.from(seen.values());
  }

  /**
   * Generate unique key for product matching
   */
  private generateKey(product: Product): string {
    // Try UPC first (most reliable)
    if (product.upc) {
      return `upc:${product.upc}`;
    }

    // Fallback to normalized brand + name
    const normalizedBrand = this.normalize(product.brand);
    const normalizedName = this.normalize(product.name);
    return `brand_name:${normalizedBrand}_${normalizedName}`;
  }

  /**
   * Normalize string for comparison
   */
  private normalize(str: string): string {
    return str
      .toLowerCase()
      .replace(/[^a-z0-9]/g, '') // Remove special characters
      .trim();
  }

  /**
   * Merge two products (prefer data from both sources)
   */
  private mergeProducts(product1: Product, product2: Product): Product {
    return {
      id: product1.id, // Keep first ID
      name: product1.name || product2.name,
      brand: product1.brand || product2.brand,
      upc: product1.upc || product2.upc,
      description: product1.description || product2.description,
      imageUrl: product1.imageUrl || product2.imageUrl,
      price: product1.price || product2.price,
      currency: product1.currency || product2.currency,
      tags: [...new Set([...(product1.tags || []), ...(product2.tags || [])])],
      ingredients: [...new Set([...(product1.ingredients || []), ...(product2.ingredients || [])])],
      ingredientSafety: product1.ingredientSafety || product2.ingredientSafety,
      sustainability: product1.sustainability || product2.sustainability,
      reviews: product1.reviews || product2.reviews,
      source: product1.source, // Keep first source
      sourceId: product1.sourceId || product2.sourceId,
      url: product1.url || product2.url,
    };
  }
}

