/**
 * Migration Script: Seed CosIng Ingredient Science Data
 * 
 * This script seeds the ingredient_science collection with CosIng data.
 * 
 * Usage:
 * 1. Download CosIng data from: https://ec.europa.eu/growth/tools-databases/cosing/
 * 2. Convert to JSON format (see example below)
 * 3. Run: firebase functions:shell
 * 4. Call: seedCosIngData(data)
 * 
 * Or use the Firebase Admin SDK directly:
 * node -e "require('./lib/migrations/seedCosIngData').seedCosIngData(data)"
 */

import * as admin from 'firebase-admin';
import { CosIngAdapter, CosIngIngredient } from '../adapters/CosIngAdapter';

// Initialize Firebase Admin if not already initialized
try {
  if (!admin.apps.length) {
    admin.initializeApp();
  }
} catch (error: any) {
  if (error.code !== 'app/duplicate-app') {
    throw error;
  }
}

const cosingAdapter = new CosIngAdapter();

/**
 * Example CosIng data structure
 * This should be populated from actual CosIng CSV/XML download
 */
const EXAMPLE_COSING_DATA: CosIngIngredient[] = [
  {
    inci_name: 'Glycerin',
    cas_number: '56-81-5',
    ec_number: '200-289-5',
    functions: ['humectant', 'emollient'],
    restrictions: 'None',
    safety_notes: 'Safe for cosmetic use. Excellent humectant properties.',
    tags: ['moisturizing', 'hydration', 'safe'],
    source_url: 'https://ec.europa.eu/growth/tools-databases/cosing/index.cfm?fuseaction=search.details_v2&id=28870',
  },
  {
    inci_name: 'Aqua',
    functions: ['solvent'],
    restrictions: 'None',
    safety_notes: 'Water - safe for all cosmetic uses.',
    tags: ['safe', 'base'],
  },
  {
    inci_name: 'Cocamidopropyl Betaine',
    functions: ['surfactant', 'foaming agent'],
    restrictions: 'None',
    safety_notes: 'Gentle surfactant, commonly used in shampoos.',
    tags: ['cleansing', 'gentle'],
  },
  {
    inci_name: 'Sodium Lauryl Sulfate',
    cas_number: '151-21-3',
    functions: ['surfactant', 'foaming agent'],
    restrictions: 'Max 1% in leave-on products',
    safety_notes: 'Can be drying and irritating. Avoid for sensitive scalp.',
    tags: ['cleansing', 'harsh'],
  },
  {
    inci_name: 'Dimethicone',
    functions: ['emollient', 'conditioning agent'],
    restrictions: 'None',
    safety_notes: 'Silicone-based conditioner. Can cause buildup on low-porosity hair.',
    tags: ['conditioning', 'silicone'],
  },
  {
    inci_name: 'Cocos Nucifera Oil',
    functions: ['emollient', 'conditioning agent'],
    restrictions: 'None',
    safety_notes: 'Heavy oil. May weigh down low-porosity hair. Good for high-porosity hair.',
    tags: ['moisturizing', 'heavy', 'oil'],
  },
  {
    inci_name: 'Argania Spinosa Kernel Oil',
    functions: ['emollient', 'conditioning agent'],
    restrictions: 'None',
    safety_notes: 'Lightweight oil. Good for all hair types, especially low-porosity.',
    tags: ['moisturizing', 'lightweight', 'oil'],
  },
];

/**
 * Seed CosIng data into Firestore
 * 
 * @param data Array of CosIng ingredient data (optional, uses example data if not provided)
 * @returns Promise with success/error counts
 */
export async function seedCosIngData(data?: CosIngIngredient[]): Promise<{ success: number; errors: number }> {
  const ingredientsToSeed = data || EXAMPLE_COSING_DATA;
  
  console.log(`[CosIng Migration] Starting seed of ${ingredientsToSeed.length} ingredients...`);
  
  const result = await cosingAdapter.seedIngredientScience(ingredientsToSeed);
  
  console.log(`[CosIng Migration] Complete! Success: ${result.success}, Errors: ${result.errors}`);
  
  return result;
}

/**
 * Load CosIng data from JSON file
 * Place your CosIng JSON file in functions/data/cosing.json
 */
export async function loadCosIngFromFile(filePath?: string): Promise<CosIngIngredient[]> {
  const fs = require('fs');
  const path = require('path');
  
  const defaultPath = path.join(__dirname, '../../data/cosing.json');
  const jsonPath = filePath || defaultPath;
  
  try {
    const fileContent = fs.readFileSync(jsonPath, 'utf-8');
    const data = JSON.parse(fileContent);
    
    // Handle both array and object formats
    if (Array.isArray(data)) {
      return data;
    } else if (data.ingredients && Array.isArray(data.ingredients)) {
      return data.ingredients;
    } else {
      throw new Error('Invalid JSON format. Expected array or object with "ingredients" array.');
    }
  } catch (error: any) {
    console.error(`[CosIng Migration] Error loading file ${jsonPath}:`, error.message);
    throw error;
  }
}

/**
 * Main migration function (can be called from Firebase Functions shell)
 */
export async function runCosIngMigration(filePath?: string): Promise<void> {
  try {
    let data: CosIngIngredient[];
    
    if (filePath) {
      console.log(`[CosIng Migration] Loading data from ${filePath}...`);
      data = await loadCosIngFromFile(filePath);
    } else {
      console.log('[CosIng Migration] Using example data...');
      data = EXAMPLE_COSING_DATA;
    }
    
    const result = await seedCosIngData(data);
    console.log('[CosIng Migration] Migration complete!', result);
  } catch (error: any) {
    console.error('[CosIng Migration] Migration failed:', error);
    throw error;
  }
}

// If running directly (not imported)
if (require.main === module) {
  runCosIngMigration()
    .then(() => {
      console.log('[CosIng Migration] Done!');
      process.exit(0);
    })
    .catch((error) => {
      console.error('[CosIng Migration] Error:', error);
      process.exit(1);
    });
}

