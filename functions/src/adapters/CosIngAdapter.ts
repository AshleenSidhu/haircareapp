/**
 * CosIng (EU Cosmetic Ingredient Database) Adapter
 * CosIng is the European Commission database for cosmetic ingredients
 * Documentation: https://ec.europa.eu/growth/tools-databases/cosing/
 * 
 * Note: CosIng data can be downloaded as CSV/XML from the EU website
 * This adapter can work with:
 * 1. Downloaded CosIng CSV/XML files
 * 2. Pre-seeded Firestore collection
 * 3. Future: Direct API access if available
 */

import * as admin from 'firebase-admin';
import { cache } from '../utils/cache';

// Lazy initialization of Firestore
function getDb() {
  try {
    if (!admin.apps.length) {
      admin.initializeApp();
    }
  } catch (error: any) {
    if (error.code !== 'app/duplicate-app') {
      throw error;
    }
  }
  return admin.firestore();
}

export interface CosIngIngredient {
  inci_name: string; // INCI name (International Nomenclature of Cosmetic Ingredients)
  cas_number?: string; // Chemical Abstracts Service number
  ec_number?: string; // European Community number
  functions: string[]; // e.g., ["humectant", "emollient", "surfactant"]
  restrictions?: string; // EU restrictions (e.g., "Max 5%", "Not for use in leave-on products")
  safety_notes?: string; // Safety information
  tags?: string[]; // Custom tags (e.g., ["moisturizing", "hydration"])
  source_url?: string; // CosIng reference URL
}

/**
 * CosIng Adapter for fetching ingredient science data
 */
export class CosIngAdapter {
  /**
   * Get ingredient science data by INCI name
   * First checks Firestore, then falls back to local knowledge base
   */
  async getIngredientScience(inciName: string): Promise<CosIngIngredient | null> {
    try {
      // Normalize INCI name
      const normalized = this.normalizeINCI(inciName);
      
      // Check cache first
      const cacheKey = `cosing_${normalized}`;
      const cached = cache.get<CosIngIngredient>(cacheKey);
      if (cached) {
        return cached;
      }

      // Try Firestore
      const db = getDb();
      const doc = await db.collection('ingredient_science').doc(normalized).get();
      if (doc.exists) {
        const data = doc.data() as CosIngIngredient;
        cache.set(cacheKey, data, 86400); // Cache for 24 hours
        return data;
      }

      // Fallback to local knowledge base for common ingredients
      const localData = this.getLocalIngredientData(normalized);
      if (localData) {
        return localData;
      }

      return null;
    } catch (error: any) {
      console.error(`[CosIng] Error fetching ingredient ${inciName}:`, error.message);
      return null;
    }
  }

  /**
   * Batch fetch multiple ingredients
   */
  async getBatchIngredientScience(inciNames: string[]): Promise<Map<string, CosIngIngredient>> {
    const results = new Map<string, CosIngIngredient>();
    
    // Normalize all names
    const normalized = inciNames.map(name => ({
      original: name,
      normalized: this.normalizeINCI(name),
    }));

    // Fetch from Firestore in batch
    const db = getDb();
    const docRefs = normalized.map(n => 
      db.collection('ingredient_science').doc(n.normalized)
    );
    
    const docs = await db.getAll(...docRefs);
    
    docs.forEach((doc, index) => {
      if (doc.exists) {
        const data = doc.data() as CosIngIngredient;
        results.set(normalized[index].original, data);
      } else {
        // Try local fallback
        const localData = this.getLocalIngredientData(normalized[index].normalized);
        if (localData) {
          results.set(normalized[index].original, localData);
        }
      }
    });

    return results;
  }

  /**
   * Normalize INCI name for consistent lookup
   * Removes extra spaces, converts to lowercase, handles common variations
   */
  private normalizeINCI(name: string): string {
    return name
      .toLowerCase()
      .trim()
      .replace(/\s+/g, ' ')
      .replace(/[()]/g, '') // Remove parentheses
      .replace(/\s*,\s*/g, ',') // Normalize commas
      .replace(/\s*-\s*/g, '-'); // Normalize hyphens
  }

  /**
   * Local knowledge base for common ingredients (fallback)
   * This should be replaced with actual CosIng data via migration script
   */
  private getLocalIngredientData(normalized: string): CosIngIngredient | null {
    const localKnowledgeBase: Record<string, CosIngIngredient> = {
      'glycerin': {
        inci_name: 'Glycerin',
        cas_number: '56-81-5',
        ec_number: '200-289-5',
        functions: ['humectant', 'emollient'],
        restrictions: 'None',
        safety_notes: 'Safe for cosmetic use. Excellent humectant properties.',
        tags: ['moisturizing', 'hydration', 'safe'],
        source_url:
          'https://ec.europa.eu/growth/tools-databases/cosing/index.cfm?fuseaction=search.details_v2&id=28870',
      },
      'aqua': {
        inci_name: 'Aqua',
        functions: ['solvent'],
        restrictions: 'None',
        safety_notes: 'Water - safe for all cosmetic uses.',
        tags: ['safe', 'base'],
      },
      'cocamidopropyl betaine': {
        inci_name: 'Cocamidopropyl Betaine',
        functions: ['surfactant', 'foaming agent'],
        restrictions: 'None',
        safety_notes: 'Gentle surfactant, commonly used in shampoos.',
        tags: ['cleansing', 'gentle'],
      },
      'sodium lauryl sulfate': {
        inci_name: 'Sodium Lauryl Sulfate',
        cas_number: '151-21-3',
        functions: ['surfactant', 'foaming agent'],
        restrictions: 'Max 1% in leave-on products',
        safety_notes: 'Can be drying and irritating. Avoid for sensitive scalp.',
        tags: ['cleansing', 'harsh'],
      },
      'dimethicone': {
        inci_name: 'Dimethicone',
        functions: ['emollient', 'conditioning agent'],
        restrictions: 'None',
        safety_notes: 'Silicone-based conditioner. Can cause buildup on low-porosity hair.',
        tags: ['conditioning', 'silicone'],
      },
      'coconut oil': {
        inci_name: 'Cocos Nucifera Oil',
        functions: ['emollient', 'conditioning agent'],
        restrictions: 'None',
        safety_notes: 'Heavy oil. May weigh down low-porosity hair. Good for high-porosity hair.',
        tags: ['moisturizing', 'heavy', 'oil'],
      },
      'argan oil': {
        inci_name: 'Argania Spinosa Kernel Oil',
        functions: ['emollient', 'conditioning agent'],
        restrictions: 'None',
        safety_notes: 'Lightweight oil. Good for all hair types, especially low-porosity.',
        tags: ['moisturizing', 'lightweight', 'oil'],
      },
    };

    return localKnowledgeBase[normalized] || null;
  }

  /**
   * Seed ingredient science data from CosIng CSV/JSON
   * This should be called by a migration script
   */
  async seedIngredientScience(data: CosIngIngredient[]): Promise<{ success: number; errors: number }> {
    let success = 0;
    let errors = 0;
    const db = getDb();
    const batch = db.batch();
    const BATCH_SIZE = 500;

    for (let i = 0; i < data.length; i++) {
      const ingredient = data[i];
      const normalized = this.normalizeINCI(ingredient.inci_name);
      
      const docRef = db.collection('ingredient_science').doc(normalized);
      batch.set(docRef, {
        ...ingredient,
        inci_name: ingredient.inci_name, // Keep original case for display
        last_updated: admin.firestore.FieldValue.serverTimestamp(),
      });

      // Commit batch every BATCH_SIZE items
      if ((i + 1) % BATCH_SIZE === 0) {
        try {
          await batch.commit();
          success += BATCH_SIZE;
          console.log(`[CosIng] Seeded ${i + 1}/${data.length} ingredients`);
        } catch (error: any) {
          console.error('[CosIng] Error seeding batch:', error.message);
          errors += BATCH_SIZE;
        }
      }
    }

    // Commit remaining items
    if (data.length % BATCH_SIZE !== 0) {
      try {
        await batch.commit();
        success += data.length % BATCH_SIZE;
      } catch (error: any) {
        console.error('[CosIng] Error seeding final batch:', error.message);
        errors += data.length % BATCH_SIZE;
      }
    }

    return { success, errors };
  }
}

