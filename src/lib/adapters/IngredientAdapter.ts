/**
 * Client-side adapter for ingredient safety analysis
 * Uses local knowledge base (can be extended with API integration)
 * Optionally uses Cosmethics/INCI API if configured
 */

// Optional: Get API key from environment variable
const COSMETHICS_API_KEY = process.env.REACT_APP_COSMETHICS_API_KEY || '';
const COSMETHICS_API_URL = process.env.REACT_APP_COSMETHICS_API_URL || 'https://api.cosmethics.com/v1';

export interface IngredientSafetyData {
  score: number; // 0-100, higher is safer
  flaggedIngredients: Array<{
    name: string;
    concern: string;
    severity: 'low' | 'medium' | 'high';
  }>;
  allergenMatches?: string[];
}

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
  'mineral oil': { concern: 'Can clog pores, not recommended for some hair types', severity: 'low' },
  'sulfates': { concern: 'Can strip natural oils, cause dryness', severity: 'medium' },
};

export class IngredientAdapter {
  /**
   * Analyze ingredient safety for a product
   * Uses Cosmethics/INCI API if configured, otherwise uses local knowledge base
   */
  async analyzeIngredientSafety(ingredients: string[]): Promise<IngredientSafetyData> {
    if (!ingredients || ingredients.length === 0) {
      return {
        score: 50, // Neutral score if no ingredients listed
        flaggedIngredients: [],
      };
    }

    // Try to use Cosmethics API if configured (client-side)
    if (COSMETHICS_API_KEY && typeof window !== 'undefined') {
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
   * Fetch ingredient safety data from Cosmethics/INCI API (client-side)
   */
  private async fetchFromCosmethicsAPI(ingredients: string[]): Promise<IngredientSafetyData | null> {
    try {
      const response = await fetch(`${COSMETHICS_API_URL}/ingredients/analyze`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${COSMETHICS_API_KEY}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ ingredients }),
      });

      if (!response.ok) {
        return null;
      }

      const data = await response.json();
      return this.parseCosmethicsResponse(data, ingredients);
    } catch (error: any) {
      console.warn('[IngredientAdapter] Error fetching from Cosmethics API:', error);
      return null;
    }
  }

  /**
   * Parse Cosmethics API response
   */
  private parseCosmethicsResponse(data: any, ingredients: string[]): IngredientSafetyData {
    const flaggedIngredients: Array<{ name: string; concern: string; severity: 'low' | 'medium' | 'high' }> = [];
    let totalScore = 0;
    let count = 0;

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
   * Calculate safety score from ingredients
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

