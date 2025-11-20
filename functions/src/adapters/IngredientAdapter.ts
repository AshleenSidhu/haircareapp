/**
 * Ingredient Safety Adapter
 * Uses Cosmethics/INCI API for ingredient safety scores, scientific explanations, and allergen detection
 * Falls back to local knowledge base if API is unavailable
 */

import axios from 'axios';
import { IngredientSafetyData } from '../types';
import { cache } from '../utils/cache';

// Cosmethics/INCI API endpoint (update with actual endpoint)
const COSMETHICS_API_URL = process.env.COSMETHICS_API_URL || 'https://api.cosmethics.com/v1';
const COSMETHICS_API_KEY = process.env.COSMETHICS_API_KEY || '';

// Local knowledge base (fallback)
const BLACKLISTED_INGREDIENTS = [
  'sodium lauryl sulfate',
  'sodium laureth sulfate',
  'ammonium lauryl sulfate',
  'formaldehyde',
  'parabens',
  'phthalates',
  'triclosan',
];

const INGREDIENT_CONCERNS: Record<string, { concern: string; severity: 'low' | 'medium' | 'high' }> = {
  'sodium lauryl sulfate': { concern: 'Can cause dryness and irritation', severity: 'high' },
  'sodium laureth sulfate': { concern: 'Milder than SLS but can still cause irritation', severity: 'medium' },
  'parabens': { concern: 'Potential hormone disruption', severity: 'medium' },
  'formaldehyde': { concern: 'Carcinogen, skin irritant', severity: 'high' },
  'silicones': { concern: 'Can cause buildup, not water-soluble', severity: 'low' },
  'alcohol': { concern: 'Can be drying, especially denatured alcohol', severity: 'medium' },
  'mineral oil': { concern: 'Can clog pores, not recommended for some hair types', severity: 'low' },
  'sulfates': { concern: 'Can strip natural oils, cause dryness', severity: 'medium' },
};

export class IngredientAdapter {
  /**
   * Analyze ingredient safety for a product
   * Uses Cosmethics/INCI API if available, falls back to local knowledge base
   */
  async analyzeIngredientSafety(ingredients: string[]): Promise<IngredientSafetyData> {
    if (!ingredients || ingredients.length === 0) {
      return {
        score: 50,
        flaggedIngredients: [],
      };
    }

    // Try to use Cosmethics API if configured
    if (COSMETHICS_API_KEY && COSMETHICS_API_URL) {
      try {
        const apiResult = await this.fetchFromCosmethicsAPI(ingredients);
        if (apiResult) {
          return apiResult;
        }
      } catch (error: any) {
        console.warn('[IngredientAdapter] Cosmethics API unavailable, using local knowledge base:', error.message);
      }
    }

    // Fallback to local knowledge base
    return this.calculateBasicSafetyScore(ingredients);
  }

  /**
   * Fetch ingredient safety data from Cosmethics/INCI API
   */
  private async fetchFromCosmethicsAPI(ingredients: string[]): Promise<IngredientSafetyData | null> {
    try {
      const cacheKey = `cosmethics_${ingredients.sort().join('_')}`;
      const cached = cache.get<IngredientSafetyData>(cacheKey);
      if (cached) {
        return cached;
      }

      // Call Cosmethics API
      const response = await axios.post(
        `${COSMETHICS_API_URL}/ingredients/analyze`,
        { ingredients },
        {
          headers: {
            'Authorization': `Bearer ${COSMETHICS_API_KEY}`,
            'Content-Type': 'application/json',
          },
          timeout: 10000,
        }
      );

      if (response.data) {
        const safetyData = this.parseCosmethicsResponse(response.data, ingredients);
        cache.set(cacheKey, safetyData, 7200); // 2 hour cache
        return safetyData;
      }

      return null;
    } catch (error: any) {
      if (error.code === 'ENOTFOUND' || error.response?.status === 404) {
        return null; // API not available
      }
      throw error;
    }
  }

  /**
   * Parse Cosmethics API response
   */
  private parseCosmethicsResponse(data: any, ingredients: string[]): IngredientSafetyData {
    const flaggedIngredients: Array<{ name: string; concern: string; severity: 'low' | 'medium' | 'high' }> = [];
    let totalScore = 0;
    let count = 0;

    // Parse API response structure (adjust based on actual API format)
    const ingredientData = data.ingredients || data.results || [];
    
    for (const ingData of ingredientData) {
      const ingredientName = ingData.name || ingData.ingredient;
      const safetyScore = ingData.safety_score || ingData.score || 50;
      totalScore += safetyScore;
      count++;

      if (ingData.concerns && ingData.concerns.length > 0) {
        flaggedIngredients.push({
          name: ingredientName,
          concern: ingData.concerns.join(', '),
          severity: ingData.severity || 'medium',
        });
      }

      if (ingData.allergen_flag || ingData.is_allergen) {
        flaggedIngredients.push({
          name: ingredientName,
          concern: 'Known allergen',
          severity: ingData.allergen_severity || 'medium',
        });
      }
    }

    const averageScore = count > 0 ? totalScore / count : 50;

    return {
      score: Math.max(0, Math.min(100, averageScore)),
      flaggedIngredients,
      allergenMatches: flaggedIngredients
        .filter(ing => ing.concern.toLowerCase().includes('allergen'))
        .map(ing => ing.name),
    };
  }

  /**
   * Calculate safety score from local knowledge base
   */
  private calculateBasicSafetyScore(ingredients: string[]): IngredientSafetyData {
    const flaggedIngredients: Array<{ name: string; concern: string; severity: 'low' | 'medium' | 'high' }> = [];
    let score = 80; // Start with good score

    for (const ingredient of ingredients) {
      const normalized = this.normalizeIngredientName(ingredient);
      const concern = INGREDIENT_CONCERNS[normalized.toLowerCase()];

      if (concern) {
        flaggedIngredients.push({
          name: ingredient,
          concern: concern.concern,
          severity: concern.severity,
        });

        if (concern.severity === 'high') {
          score -= 20;
        } else if (concern.severity === 'medium') {
          score -= 10;
        } else {
          score -= 5;
        }
      }

      // Check blacklist
      if (BLACKLISTED_INGREDIENTS.some(bl => normalized.toLowerCase().includes(bl.toLowerCase()))) {
        flaggedIngredients.push({
          name: ingredient,
          concern: 'Blacklisted ingredient',
          severity: 'high',
        });
        score = Math.min(score, 20);
      }
    }

    return {
      score: Math.max(0, Math.min(100, score)),
      flaggedIngredients,
    };
  }

  /**
   * Normalize ingredient name for comparison
   */
  private normalizeIngredientName(name: string): string {
    return name.toLowerCase().trim().replace(/\s+/g, ' ');
  }
}
