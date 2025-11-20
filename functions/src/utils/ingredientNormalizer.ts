/**
 * INCI Ingredient Normalization Utility
 * Normalizes ingredient names to canonical INCI names for consistent matching
 */

/**
 * Normalize INCI ingredient name
 * Handles common variations, capitalization, and formatting
 */
export function normalizeINCI(ingredient: string): string {
  if (!ingredient || typeof ingredient !== 'string') {
    return '';
  }

  return ingredient
    .trim()
    .toLowerCase()
    .replace(/\s+/g, ' ') // Normalize whitespace
    .replace(/[()]/g, '') // Remove parentheses
    .replace(/\s*,\s*/g, ',') // Normalize commas
    .replace(/\s*-\s*/g, '-') // Normalize hyphens
    .replace(/\s*\/\s*/g, '/') // Normalize slashes
    .replace(/^water$/i, 'aqua') // Standardize water -> aqua
    .replace(/^h2o$/i, 'aqua'); // Standardize H2O -> aqua
}

/**
 * Parse ingredients text into normalized array
 * Handles comma-separated lists, semicolons, and other delimiters
 */
export function parseIngredientsText(ingredientsText: string): string[] {
  if (!ingredientsText || typeof ingredientsText !== 'string') {
    return [];
  }

  // Split by common delimiters
  const delimiters = /[,;]|\sand\s/i;
  const rawIngredients = ingredientsText.split(delimiters);

  // Normalize each ingredient
  const normalized = rawIngredients
    .map(ing => normalizeINCI(ing))
    .filter(ing => ing.length > 0) // Remove empty strings
    .filter((ing, index, arr) => arr.indexOf(ing) === index); // Remove duplicates

  return normalized;
}

/**
 * Extract INCI names from ingredient objects
 * Handles both string arrays and object arrays with 'text' or 'id' fields
 */
export function extractINCIFromIngredients(ingredients: any[]): string[] {
  if (!Array.isArray(ingredients)) {
    return [];
  }

  const inciNames: string[] = [];

  for (const ing of ingredients) {
    if (typeof ing === 'string') {
      const normalized = normalizeINCI(ing);
      if (normalized) {
        inciNames.push(normalized);
      }
    } else if (ing && typeof ing === 'object') {
      // Handle Open Beauty Facts format: { id: "...", text: "..." }
      const text = ing.text || ing.id || ing.name || ing.inci_name || '';
      if (text) {
        const normalized = normalizeINCI(text);
        if (normalized) {
          inciNames.push(normalized);
        }
      }
    }
  }

  // Remove duplicates while preserving order
  return Array.from(new Set(inciNames));
}

/**
 * Map normalized ingredients to CosIng data
 * Returns a map of ingredient -> CosIng data
 */
export async function mapIngredientsToCosIng(
  normalizedIngredients: string[],
  cosingAdapter: any // CosIngAdapter instance
): Promise<Map<string, any>> {
  if (!normalizedIngredients || normalizedIngredients.length === 0) {
    return new Map();
  }

  return await cosingAdapter.getBatchIngredientScience(normalizedIngredients);
}


