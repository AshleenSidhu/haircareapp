/**
 * Adapter for ingredient safety data
 * Integrates with Cosmethics API and INCI database
 * Documentation: https://cosmethics.eu/ (or similar ingredient safety APIs)
 */

import axios from 'axios';
import { IngredientSafetyData, CosmethicsIngredient } from '../types';
import { cache } from '../utils/cache';

// Placeholder API endpoints - update with actual Cosmethics/INCI API endpoints
const COSMETHICS_API = 'https://api.cosmethics.eu/v1'; // Update with actual endpoint
const INCI_API = 'https://api.inci-database.org/v1'; // Update with actual endpoint

// Blacklisted ingredients (high concern)
const BLACKLISTED_INGREDIENTS = [
  'sodium lauryl sulfate',
  'sodium laureth sulfate',
  'ammonium lauryl sulfate',
  'formaldehyde',
  'parabens',
  'phthalates',
  'triclosan',
];

// Ingredient concern mapping (for quick lookup)
const INGREDIENT_CONCERNS: Record<string, { concern: string; severity: 'low' | 'medium' | 'high' }> = {
  'sodium lauryl sulfate': { concern: 'Can cause dryness and irritation', severity: 'high' },
  'sodium laureth sulfate': { concern: 'Milder than SLS but can still cause irritation', severity: 'medium' },
  'parabens': { concern: 'Potential hormone disruption', severity: 'medium' },
  'formaldehyde': { concern: 'Carcinogen, skin irritant', severity: 'high' },
  'silicones': { concern: 'Can cause buildup, not water-soluble', severity: 'low' },
  'alcohol': { concern: 'Can be drying, especially denatured alcohol', severity: 'medium' },
};

export class IngredientAdapter {
  /**
   * Analyze ingredient safety for a product
   */
  async analyzeIngredientSafety(ingredients: string[]): Promise<IngredientSafetyData> {
    if (!ingredients || ingredients.length === 0) {
      return {
        score: 50, // Neutral score if no ingredients listed
        flaggedIngredients: [],
      };
    }

    try {
      // Check cache for each ingredient
      const ingredientScores: CosmethicsIngredient[] = [];
      const uncachedIngredients: string[] = [];

      for (const ingredient of ingredients) {
        const normalizedName = this.normalizeIngredientName(ingredient);
        const cacheKey = cache.getIngredientKey(normalizedName);

        const cached = cache.get<CosmethicsIngredient>(cacheKey);
        if (cached) {
          ingredientScores.push(cached);
        } else {
          uncachedIngredients.push(normalizedName);
        }
      }

      // Fetch uncached ingredients from API
      if (uncachedIngredients.length > 0) {
        const apiResults = await this.fetchIngredientSafety(uncachedIngredients);
        ingredientScores.push(...apiResults);

        // Cache results
        apiResults.forEach(result => {
          const cacheKey = cache.getIngredientKey(result.name);
          cache.set(cacheKey, result, 86400); // 24 hour cache
        });
      }

      // Calculate overall safety score
      return this.calculateSafetyScore(ingredients, ingredientScores);
    } catch (error: any) {
      console.error('[IngredientAdapter] Error analyzing ingredients:', error.message);
      // Fallback to basic analysis
      return this.calculateBasicSafetyScore(ingredients);
    }
  }

  /**
   * Fetch ingredient safety from API
   */
  private async fetchIngredientSafety(ingredientNames: string[]): Promise<CosmethicsIngredient[]> {
    const results: CosmethicsIngredient[] = [];

    // Try Cosmethics API first
    try {
      const response = await axios.post(
        `${COSMETICS_API}/ingredients/analyze`,
        { ingredients: ingredientNames },
        { timeout: 10000 }
      );

      if (response.data?.ingredients) {
        return response.data.ingredients.map((item: any) => ({
          name: item.name,
          safetyScore: item.safety_score || 50,
          concerns: item.concerns || [],
          allergenInfo: item.allergen_info || [],
        }));
      }
    } catch (error: any) {
      console.warn('[IngredientAdapter] Cosmethics API unavailable, using fallback');
    }

    // Fallback: Use local knowledge base
    for (const ingredient of ingredientNames) {
      const concern = INGREDIENT_CONCERNS[ingredient.toLowerCase()];
      const isBlacklisted = BLACKLISTED_INGREDIENTS.some(
        bl => ingredient.toLowerCase().includes(bl.toLowerCase())
      );

      results.push({
        name: ingredient,
        safetyScore: isBlacklisted ? 20 : (concern ? (concern.severity === 'high' ? 30 : concern.severity === 'medium' ? 50 : 70) : 80),
        concerns: concern ? [concern.concern] : [],
      });
    }

    return results;
  }

  /**
   * Calculate safety score from ingredient analysis
   */
  private calculateSafetyScore(
    allIngredients: string[],
    ingredientScores: CosmethicsIngredient[]
  ): IngredientSafetyData {
    const flaggedIngredients: Array<{ name: string; concern: string; severity: 'low' | 'medium' | 'high' }> = [];
    let totalScore = 0;
    let validScores = 0;

    // Check for blacklisted ingredients
    const allergenMatches: string[] = [];

    for (const ingredient of allIngredients) {
      const normalized = this.normalizeIngredientName(ingredient);
      const score = ingredientScores.find(s => s.name.toLowerCase() === normalized.toLowerCase());

      if (score) {
        totalScore += score.safetyScore;
        validScores++;

        // Flag concerning ingredients
        if (score.safetyScore < 50 || score.concerns.length > 0) {
          const concern = INGREDIENT_CONCERNS[normalized.toLowerCase()];
          flaggedIngredients.push({
            name: ingredient,
            concern: score.concerns[0] || 'Safety concern detected',
            severity: concern?.severity || (score.safetyScore < 30 ? 'high' : score.safetyScore < 50 ? 'medium' : 'low'),
          });
        }

        // Check for allergens
        if (score.allergenInfo && score.allergenInfo.length > 0) {
          allergenMatches.push(...score.allergenInfo);
        }
      } else {
        // Unknown ingredient - neutral score
        totalScore += 50;
        validScores++;
      }

      // Check blacklist
      if (BLACKLISTED_INGREDIENTS.some(bl => normalized.toLowerCase().includes(bl.toLowerCase()))) {
        flaggedIngredients.push({
          name: ingredient,
          concern: 'Blacklisted ingredient',
          severity: 'high',
        });
        totalScore = Math.min(totalScore, 20); // Cap score if blacklisted
      }
    }

    const averageScore = validScores > 0 ? totalScore / validScores : 50;

    return {
      score: Math.max(0, Math.min(100, averageScore)), // Clamp between 0-100
      flaggedIngredients,
      allergenMatches: allergenMatches.length > 0 ? [...new Set(allergenMatches)] : undefined,
    };
  }

  /**
   * Basic safety score calculation (fallback)
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

        // Reduce score based on severity
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

