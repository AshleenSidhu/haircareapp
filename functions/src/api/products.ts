/**
 * Products API Endpoints
 * GET /api/products - List products with pagination
 * GET /api/products/:product_id - Get single product
 */

import { onRequest } from 'firebase-functions/v2/https';
import * as admin from 'firebase-admin';

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

/**
 * GET /api/products (or /getProducts depending on routing configuration)
 * Query parameters:
 * - category: string (optional) - Filter by category
 * - limit: number (optional, default: 50, max: 100)
 * - page: number (optional, default: 1)
 * 
 * Note: Firebase Functions v2 routes by function name.
 * To use /api/products, configure Firebase Hosting rewrites or name the function accordingly.
 */
export const apiProducts = onRequest(
  {
    cors: true,
    region: 'northamerica-northeast1',
  },
  async (req, res) => {
    try {
      const category = req.query.category as string | undefined;
      const limit = Math.min(parseInt(req.query.limit as string) || 50, 100);
      const page = Math.max(parseInt(req.query.page as string) || 1, 1);
      const offset = (page - 1) * limit;

      let query = db.collection('products').orderBy('last_synced_at', 'desc');

      // Filter by category if provided
      if (category) {
        query = query.where('categories', 'array-contains', category);
      }

      // Get total count (approximate)
      const snapshot = await query.get();
      const total = snapshot.size;

      // Apply pagination
      const paginatedQuery = query.limit(limit).offset(offset);
      const docs = await paginatedQuery.get();

      const products = docs.docs.map((doc) => {
        const data = doc.data();
        return {
          product_id: doc.id,
          ...data,
          // Ensure ingredient_science is included if available
          ingredient_science: data.ingredient_science || [],
        };
      });

      res.json({
        meta: {
          page,
          limit,
          total,
        },
        products,
      });
    } catch (error: any) {
      console.error('[getProducts] Error:', error);
      res.status(500).json({
        error: 'Failed to fetch products',
        message: error.message,
      });
    }
  }
);

/**
 * GET /api/products/:product_id (or /getProductById depending on routing configuration)
 * Get a single product by ID
 * 
 * Note: Firebase Functions v2 routes by function name.
 * To use /api/products/:id, configure Firebase Hosting rewrites or use Express routing.
 */
export const apiProductById = onRequest(
  {
    cors: true,
    region: 'northamerica-northeast1',
  },
  async (req, res) => {
    try {
      const productIdParam = req.params.product_id || req.query.product_id;

      if (!productIdParam) {
        res.status(400).json({ error: 'Product ID is required' });
        return;
      }

      const productId = String(productIdParam);
      const doc = await db.collection('products').doc(productId).get();

      if (!doc.exists) {
        // Try to find by barcode
        const barcodeQuery = await db
          .collection('products')
          .where('barcode', '==', productId)
          .limit(1)
          .get();

        if (barcodeQuery.empty) {
          res.status(404).json({ error: 'Product not found' });
          return;
        }

        const barcodeDoc = barcodeQuery.docs[0];
        const data = barcodeDoc.data();
        if (!data) {
          res.status(404).json({ error: 'Product data not found' });
          return;
        }
        const normalizedIngredients = data.normalized_ingredients || [];
        const ingredientScience = data.ingredient_science || [];

        // Calculate product profile if we have ingredient science data
        let productProfile = null;
        if (ingredientScience.length > 0) {
          productProfile = await calculateProductProfile(normalizedIngredients, ingredientScience);
        }

        // Calculate compatibility score if user profile is provided
        let compatibilityScore = null;
        const userProfile = req.query.user_profile ? JSON.parse(req.query.user_profile as string) : null;
        if (userProfile && productProfile) {
          compatibilityScore = await calculateCompatibilityScore(productProfile, userProfile);
        }

        res.json({
          product_id: barcodeDoc.id,
          ...data,
          ingredient_science: ingredientScience,
          product_profile: productProfile,
          compatibility_score: compatibilityScore,
        });
        return;
      }

      const data = doc.data();
      if (!data) {
        res.status(404).json({ error: 'Product data not found' });
        return;
      }
      const normalizedIngredients = data.normalized_ingredients || [];
      const ingredientScience = data.ingredient_science || [];

      // Calculate product profile if we have ingredient science data
      let productProfile = null;
      if (ingredientScience.length > 0) {
        productProfile = await calculateProductProfile(normalizedIngredients, ingredientScience);
      }

      // Calculate compatibility score if user profile is provided
      let compatibilityScore = null;
      const userProfile = req.query.user_profile ? JSON.parse(req.query.user_profile as string) : null;
      if (userProfile && productProfile) {
        compatibilityScore = await calculateCompatibilityScore(productProfile, userProfile);
      }

      res.json({
        product_id: doc.id,
        ...data,
        ingredient_science: ingredientScience,
        product_profile: productProfile,
        compatibility_score: compatibilityScore,
      });
    } catch (error: any) {
      console.error('[getProductById] Error:', error);
      res.status(500).json({
        error: 'Failed to fetch product',
        message: error.message,
      });
    }
  }
);

/**
 * Calculate product profile scores for compatibility
 * This is a helper function that can be called from the product endpoint
 */
export async function calculateProductProfile(
  normalizedIngredients: string[],
  ingredientScience: any[]
): Promise<{
  moisture_score: number;
  protein_score: number;
  oil_level: number;
  irritant_risk: number;
  explainers: string[];
}> {
  let moistureScore = 50;
  let proteinScore = 0;
  let oilLevel = 0;
  let irritantRisk = 0;
  const explainers: string[] = [];

  for (const science of ingredientScience) {
    const functions = science.functions || [];
    const tags = science.tags || [];
    const inciName = science.inci_name || '';

    // Check for humectants (moisture)
    if (functions.includes('humectant') || tags.includes('hydration')) {
      moistureScore += 10;
      explainers.push(`Contains ${inciName} (humectant) → increases moisture`);
    }

    // Check for proteins
    if (tags.includes('protein') || inciName.toLowerCase().includes('protein')) {
      proteinScore += 20;
      explainers.push(`Contains ${inciName} → adds protein`);
    }

    // Check for oils
    if (functions.includes('emollient') || tags.includes('oil')) {
      if (tags.includes('heavy')) {
        oilLevel += 15;
        explainers.push(`Contains ${inciName} → heavy oil (may weigh down low-porosity hair)`);
      } else {
        oilLevel += 5;
        explainers.push(`Contains ${inciName} → lightweight oil`);
      }
    }

    // Check for irritants
    if (tags.includes('harsh') || tags.includes('irritant')) {
      irritantRisk += 15;
      explainers.push(`Contains ${inciName} → may increase dryness on sensitive scalps`);
    }

    // Check for alcohol
    if (inciName.toLowerCase().includes('alcohol') && !inciName.toLowerCase().includes('fatty')) {
      irritantRisk += 10;
      moistureScore -= 5;
      explainers.push(`Contains ${inciName} → may increase dryness`);
    }
  }

  return {
    moisture_score: Math.min(100, Math.max(0, moistureScore)),
    protein_score: Math.min(100, Math.max(0, proteinScore)),
    oil_level: Math.min(100, Math.max(0, oilLevel)),
    irritant_risk: Math.min(100, Math.max(0, irritantRisk)),
    explainers: explainers.slice(0, 5), // Limit to 5 explainers
  };
}

/**
 * Calculate compatibility score server-side (heavy computation)
 * This keeps the client fast by doing scoring on the server
 */
async function calculateCompatibilityScore(
  productProfile: {
    moisture_score: number;
    protein_score: number;
    oil_level: number;
    irritant_risk: number;
    explainers: string[];
  },
  userProfile: {
    hairType?: 'straight' | 'wavy' | 'curly' | 'coily' | 'mixed';
    porosity?: 'low' | 'medium' | 'high';
    scalpSensitive?: boolean;
    concerns?: string[];
  }
): Promise<{
  score: number;
  explainers: string[];
}> {
  const { moisture_score, protein_score, oil_level, irritant_risk, explainers } = productProfile;
  const { hairType, porosity, scalpSensitive, concerns = [] } = userProfile;

  let score = 50; // Start with neutral score
  const customExplainers: string[] = [];

  // Porosity-based scoring
  if (porosity === 'low') {
    // Low porosity: needs lightweight products, avoid heavy oils
    if (oil_level > 50) {
      score -= 20;
      customExplainers.push('Heavy oils may weigh down low-porosity hair');
    } else if (oil_level < 30) {
      score += 10;
      customExplainers.push('Lightweight formula suitable for low-porosity hair');
    }

    // Low porosity: needs moisture but not too much protein
    if (moisture_score > 70) {
      score += 15;
      customExplainers.push('Good moisture content for low-porosity hair');
    }
    if (protein_score > 60) {
      score -= 15;
      customExplainers.push('High protein content may cause buildup on low-porosity hair');
    }
  } else if (porosity === 'high') {
    // High porosity: needs heavy moisture and protein
    if (moisture_score > 70) {
      score += 20;
      customExplainers.push('Excellent moisture content for high-porosity hair');
    } else if (moisture_score < 50) {
      score -= 15;
      customExplainers.push('May not provide enough moisture for high-porosity hair');
    }

    if (protein_score > 50) {
      score += 15;
      customExplainers.push('Protein content helps repair high-porosity hair');
    }
  } else if (porosity === 'medium') {
    // Medium porosity: balanced approach
    if (moisture_score > 60 && moisture_score < 80) {
      score += 10;
    }
    if (protein_score > 30 && protein_score < 60) {
      score += 10;
    }
  }

  // Scalp sensitivity
  if (scalpSensitive) {
    if (irritant_risk > 30) {
      score -= 25;
      customExplainers.push('Contains potential irritants - avoid if you have sensitive scalp');
    } else if (irritant_risk < 20) {
      score += 10;
      customExplainers.push('Gentle formula suitable for sensitive scalps');
    }
  }

  // Hair type considerations
  if (hairType === 'coily' || hairType === 'curly') {
    // Curly/coily hair needs more moisture
    if (moisture_score > 70) {
      score += 10;
    }
    if (oil_level > 40 && oil_level < 70) {
      score += 5;
    }
  } else if (hairType === 'straight') {
    // Straight hair can be weighed down by heavy products
    if (oil_level > 60) {
      score -= 10;
    }
  }

  // Concerns-based adjustments
  if (concerns.includes('dryness') && moisture_score > 70) {
    score += 15;
    customExplainers.push('High moisture content addresses dryness concerns');
  }
  if (concerns.includes('frizz') && moisture_score > 65 && oil_level > 40) {
    score += 10;
    customExplainers.push('Moisture and oils help control frizz');
  }
  if (concerns.includes('damage') && protein_score > 50) {
    score += 10;
    customExplainers.push('Protein content helps repair damaged hair');
  }

  // Clamp score to 0-100
  score = Math.max(0, Math.min(100, score));

  // Combine explainers
  const allExplainers = [...customExplainers, ...explainers].slice(0, 5);

  return {
    score: Math.round(score),
    explainers: allExplainers,
  };
}

