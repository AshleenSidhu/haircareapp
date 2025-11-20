/**
 * Ingredients API Endpoints
 * GET /api/ingredients/:normalized_inci - Get ingredient science data
 */

import { onRequest } from 'firebase-functions/v2/https';
import * as admin from 'firebase-admin';
import { CosIngAdapter } from '../adapters/CosIngAdapter';

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
 * GET /api/ingredients/:normalized_inci (or /getIngredient depending on routing configuration)
 * Get ingredient science data by normalized INCI name
 * 
 * Note: Firebase Functions v2 routes by function name.
 * To use /api/ingredients/:id, configure Firebase Hosting rewrites or use Express routing.
 */
export const apiIngredient = onRequest(
  {
    cors: true,
    region: 'northamerica-northeast1',
  },
  async (req, res) => {
    try {
      const normalizedInci = decodeURIComponent(
        req.params.normalized_inci || (req.query.normalized_inci as string) || ''
      );

      if (!normalizedInci) {
        res.status(400).json({ error: 'Ingredient INCI name is required' });
        return;
      }

      const ingredient = await cosingAdapter.getIngredientScience(normalizedInci);

      if (!ingredient) {
        res.status(404).json({ error: 'Ingredient not found' });
        return;
      }

      res.json({
        inci_name: ingredient.inci_name,
        cas_number: ingredient.cas_number,
        ec_number: ingredient.ec_number,
        functions: ingredient.functions || [],
        restrictions: ingredient.restrictions || 'None',
        safety_notes: ingredient.safety_notes || '',
        tags: ingredient.tags || [],
        source_url: ingredient.source_url,
      });
    } catch (error: any) {
      console.error('[getIngredient] Error:', error);
      res.status(500).json({
        error: 'Failed to fetch ingredient',
        message: error.message,
      });
    }
  }
);

