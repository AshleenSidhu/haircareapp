/**
 * Clean Product Sync - Open Beauty Facts + CosIng
 * Simple product sync using only OBF API and CosIng ingredient science
 */

import { onCall, HttpsError } from 'firebase-functions/v2/https';
import * as admin from 'firebase-admin';
import { OpenBeautyFactsAdapter } from './adapters/OpenBeautyFactsAdapter';
import { CosIngAdapter } from './adapters/CosIngAdapter';
import { parseIngredientsText, extractINCIFromIngredients } from './utils/ingredientNormalizer';
import { EcoScoreCalculator } from './utils/ecoScoreCalculator';

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

const db = admin.firestore();
const obfAdapter = new OpenBeautyFactsAdapter();
const cosingAdapter = new CosIngAdapter();
const ecoScoreCalculator = new EcoScoreCalculator();

/**
 * Sync products from Open Beauty Facts
 * Fetches products, normalizes ingredients, maps to CosIng science, stores in Firestore
 */
export const syncProducts = onCall(
  {
    enforceAppCheck: false,
    region: 'northamerica-northeast1',
    timeoutSeconds: 540, // 9 minutes max
    memory: '512MiB',
  },
  async (request) => {
    console.log('[syncProducts] Function called');
    console.log('[syncProducts] Request data:', request.data);
    console.log('[syncProducts] Auth:', request.auth ? `User ${request.auth.uid}` : 'No auth');
    
    // Verify authentication
    if (!request.auth) {
      console.error('[syncProducts] Unauthenticated request');
      throw new HttpsError('unauthenticated', 'User must be authenticated');
    }

    try {
      console.log('[syncProducts] Starting try block');
      const tags = request.data?.tags || ['shampoo', 'conditioner', 'hair-care'];
      const limit = Math.min(request.data?.limit || 50, 100); // Max 100 products

      console.log(`[syncProducts] Starting sync with tags: ${tags.join(', ')}, limit: ${limit}`);

      // Fetch products from Open Beauty Facts
      // NOTE: Open Beauty Facts has rate limits (~10 req/sec)
      // For mass syncs (>1000 products), prefer bulk dumps:
      // https://world.openbeautyfacts.org/data/openbeautyfacts-products.jsonl.gz
      console.log(`[syncProducts] Calling OBF adapter with tags: ${tags.join(', ')}, limit: ${limit}`);
      let products;
      try {
        products = await obfAdapter.searchProducts(tags, limit);
        console.log(`[syncProducts] OBF adapter returned ${products.length} products`);
      } catch (obfError: any) {
        console.error('[syncProducts] Error calling OBF adapter:', obfError.message);
        console.error('[syncProducts] OBF error stack:', obfError.stack);
        // Return error response instead of throwing
        return {
          success: false,
          productsSynced: 0,
          totalFound: 0,
          errors: 1,
          errorMessages: [`Failed to fetch products from Open Beauty Facts: ${obfError.message}`],
        };
      }
      
      if (products.length > 0) {
        console.log(`[syncProducts] First product sample:`, {
          id: products[0].id,
          name: products[0].name,
          brand: products[0].brand,
          hasIngredients: !!(products[0].ingredients && products[0].ingredients.length > 0),
          ingredientsCount: products[0].ingredients?.length || 0,
          source: products[0].source,
        });
      }

      if (products.length === 0) {
        console.warn('[syncProducts] ⚠️ No products returned from Open Beauty Facts API');
        console.warn('[syncProducts] This could mean:');
        console.warn('  1. API returned no results for the given tags');
        console.warn('  2. API rate limit exceeded');
        console.warn('  3. Network/API error');
        return {
          success: true,
          productsSynced: 0,
          totalFound: 0,
          message: 'No products found from Open Beauty Facts API',
        };
      }

      // Process and store products
      let synced = 0;
      let errors = 0;
      const errorMessages: string[] = [];
      const BATCH_SIZE = 500;
      let batchCount = 0;
      let batch = db.batch();

      for (let i = 0; i < products.length; i++) {
        const product = products[i];
        try {
          console.log(`[syncProducts] Processing product ${i + 1}/${products.length}: ${product.name || product.id}`);
          
          // Validate product has required fields
          if (!product || !product.id) {
            console.warn(`[syncProducts] Skipping invalid product at index ${i}: missing id`);
            errors++;
            continue;
          }

          // Transform to new schema with normalized ingredients
          let productData;
          try {
            productData = await transformProduct(product);
          } catch (transformError: any) {
            console.error(`[syncProducts] Transform error for product ${product.id}:`, transformError.message);
            errors++;
            errorMessages.push(`Product ${product.id}: ${transformError.message}`);
            continue;
          }

          if (!productData || !productData.product_id) {
            console.warn(`[syncProducts] Skipping product ${product.id}: transform returned invalid data`);
            errors++;
            continue;
          }
          
          console.log(`[syncProducts] Transformed product:`, {
            product_id: productData.product_id,
            name: productData.name,
            normalized_ingredients_count: productData.normalized_ingredients?.length || 0,
            ingredient_science_count: productData.ingredient_science?.length || 0,
          });

          // Store in Firestore
          const productId = productData.product_id || product.id;
          const docRef = db.collection('products').doc(productId);
          batch.set(docRef, productData, { merge: true });

          batchCount++;
          synced++;

          // Commit batch every BATCH_SIZE items and create new batch
          if (batchCount >= BATCH_SIZE) {
            try {
              await batch.commit();
              console.log(`[syncProducts] Synced ${synced}/${products.length} products...`);
              // Create new batch for next set
              batch = db.batch();
              batchCount = 0;
            } catch (commitError: any) {
              console.error(`[syncProducts] Error committing batch:`, commitError.message);
              errors += batchCount;
              batchCount = 0;
              batch = db.batch(); // Create new batch even on error
            }
          }
        } catch (error: any) {
          console.error(`[syncProducts] Error processing product ${product?.id || 'unknown'}:`, error.message);
          console.error(`[syncProducts] Error stack:`, error.stack);
          errors++;
          errorMessages.push(`Product ${product?.id || 'unknown'}: ${error.message}`);
        }
      }

      // Commit remaining items
      if (batchCount > 0) {
        try {
          await batch.commit();
          console.log(`[syncProducts] Committed final batch of ${batchCount} products`);
        } catch (error: any) {
          console.error(`[syncProducts] Error committing final batch:`, error.message);
          errors += batchCount;
        }
      }

      console.log(`[syncProducts] Sync complete! Synced: ${synced}, Errors: ${errors}`);

      // Always return a valid response object
      const response = {
        success: synced > 0 || errors === 0, // Success if we synced something or had no errors
        productsSynced: synced,
        totalFound: products.length,
        errors: errors > 0 ? errors : undefined,
        errorMessages: errorMessages.length > 0 ? errorMessages.slice(0, 10) : undefined, // Limit to first 10 errors
      };

      console.log(`[syncProducts] Returning response:`, response);
      return response;
    } catch (error: any) {
      console.error('[syncProducts] Fatal error:', error);
      console.error('[syncProducts] Error stack:', error.stack);
      
      // Return error response instead of throwing to avoid "missing data field" error
      return {
        success: false,
        productsSynced: 0,
        totalFound: 0,
        errors: 1,
        errorMessages: [`Fatal error: ${error.message}`],
      };
    }
  }
);

/**
 * Transform product to new schema with normalized ingredients and CosIng mapping
 */
async function transformProduct(product: any): Promise<any> {
  // Extract ingredients - handle both pre-processed and raw formats
  let ingredients_inci = product.ingredients_inci || '';
  let ingredients_raw: Array<{ text: string; id?: string }> = product.ingredients_raw || [];
  let normalized_ingredients: string[] = [];

  // If ingredients_inci not provided, extract from ingredients array
  if (!ingredients_inci && product.ingredients && product.ingredients.length > 0) {
    // If ingredients is an array of strings
    if (typeof product.ingredients[0] === 'string') {
      ingredients_inci = product.ingredients.join(', ');
      ingredients_raw = product.ingredients.map((ing: string) => ({ text: ing }));
      normalized_ingredients = parseIngredientsText(ingredients_inci);
    } else {
      // If ingredients is an array of objects
      ingredients_raw = product.ingredients as any;
      ingredients_inci = ingredients_raw
        .map((ing: any) => ing.text || ing.id || ing.name || '')
        .filter((text: string) => text.length > 0)
        .join(', ');
      normalized_ingredients = extractINCIFromIngredients(ingredients_raw);
    }
  } else if (ingredients_inci) {
    // If ingredients_inci is provided, normalize it
    normalized_ingredients = parseIngredientsText(ingredients_inci);
    // If ingredients_raw not provided, create from ingredients_inci
    if (ingredients_raw.length === 0) {
      ingredients_raw = normalized_ingredients.map(ing => ({ text: ing }));
    }
  }

  // Get CosIng science data for ingredients (optional enrichment)
  const ingredientScience: any[] = [];
  if (normalized_ingredients.length > 0) {
    const scienceMap = await cosingAdapter.getBatchIngredientScience(normalized_ingredients);
    for (const ing of normalized_ingredients) {
      const science = scienceMap.get(ing);
      if (science) {
        ingredientScience.push({
          inci_name: ing,
          functions: science.functions || [],
          restrictions: science.restrictions,
          safety_notes: science.safety_notes,
        });
      }
    }
  }

  // Extract categories from tags or categories field
  const categories = product.categories || product.tags || [];

  // Extract images - handle both old (imageUrl) and new (images object) formats
  const images = {
    front: product.images?.front || product.imageUrl || undefined,
    ingredients: product.images?.ingredients || undefined,
  };
  
  // Initialize images_stored field (null by default, will be populated by downloadAndStoreImage function)
  const images_stored = product.images_stored || {
    storage_url: null,
    stored_at: null,
  };
  
  // Also preserve last_modified_server if available
  const lastModifiedServer = product.last_modified_server || product.last_modified_t;

  // Calculate eco score
  let ecoScoreData: any = {};
  try {
    // Convert to Product format for eco score calculator
    const productForEcoScore: any = {
      id: product.id || product.upc || product.barcode,
      name: product.name,
      brand: product.brand,
      ingredients: normalized_ingredients.length > 0 ? normalized_ingredients : (product.ingredients || []),
      tags: product.tags || categories || [],
    };

    const ecoScoreResult = ecoScoreCalculator.calculateEcoScore(productForEcoScore);
    ecoScoreData = {
      eco_score: ecoScoreResult.score,
      eco_grade: ecoScoreResult.grade,
      eco_reasoning: ecoScoreResult.reasoning,
      eco_positive_factors: ecoScoreResult.positiveFactors,
      eco_negative_factors: ecoScoreResult.negativeFactors,
      eco_recommendations: ecoScoreResult.recommendations,
    };
    console.log(`[transformProduct] Calculated eco score for ${product.name}: ${ecoScoreResult.score} (${ecoScoreResult.grade})`);
  } catch (ecoError: any) {
    console.warn(`[transformProduct] Error calculating eco score:`, ecoError.message);
    // Continue without eco score if calculation fails
  }

  // Build product data in new schema
  const productData: any = {
    product_id: product.id || product.upc || product.barcode || `obf_${Date.now()}`,
    barcode: product.barcode || product.upc || product.id,
    name: product.name,
    brand: product.brand,
    categories,
    ingredients_inci: product.ingredients_inci || ingredients_inci,
    ingredients_raw: product.ingredients_raw || ingredients_raw,
    normalized_ingredients,
    ingredient_science: ingredientScience.length > 0 ? ingredientScience : undefined,
    images,
    images_stored,
    source: 'open_beauty_facts',
    last_modified_server: lastModifiedServer,
    last_synced_at: admin.firestore.FieldValue.serverTimestamp(),
    // Preserve existing fields
    description: product.description,
    price: product.price,
    currency: product.currency || 'USD',
    tags: product.tags || categories,
    url: product.url,
    sourceId: product.sourceId || product.id,
    // Store periods after opening if available
    ...(product.periodsAfterOpening && { periodsAfterOpening: product.periodsAfterOpening }),
    // Add eco score data
    ...ecoScoreData,
  };

  return productData;
}


