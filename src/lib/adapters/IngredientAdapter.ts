/**
 * Client-side adapter for ingredient safety analysis
 * Uses local knowledge base (can be extended with API integration)
 */

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
   */
  async analyzeIngredientSafety(ingredients: string[]): Promise<IngredientSafetyData> {
    if (!ingredients || ingredients.length === 0) {
      return {
        score: 50, // Neutral score if no ingredients listed
        flaggedIngredients: [],
      };
    }

    return this.calculateBasicSafetyScore(ingredients);
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

