/**
 * Client-side ingredient normalization utility
 * Normalizes ingredient names for consistent matching with backend
 */

/**
 * Normalize ingredient name
 * - Lowercase, trim whitespace
 * - Strip numeric descriptors and percentages
 * - Map common synonyms
 * - Remove duplicates and bracketed descriptors
 */
export function normalizeIngredient(ingredient: string): string {
  if (!ingredient || typeof ingredient !== 'string') {
    return '';
  }

  let normalized = ingredient
    .trim()
    .toLowerCase()
    .replace(/\s+/g, ' ') // Normalize whitespace
    .replace(/\([^)]*\)/g, '') // Remove parentheses and contents
    .replace(/\[[^\]]*\]/g, '') // Remove brackets and contents
    .replace(/\d+%/g, '') // Remove percentages
    .replace(/\d+/g, '') // Remove numbers
    .replace(/[()]/g, '') // Remove remaining parentheses
    .trim();

  // Map common synonyms
  const synonymMap: Record<string, string> = {
    water: 'aqua',
    h2o: 'aqua',
    'vitamin e': 'tocopherol',
    tocopherol: 'tocopherol',
    'vitamin c': 'ascorbic acid',
    'ascorbic acid': 'ascorbic acid',
  };

  const synonym = synonymMap[normalized];
  if (synonym) {
    normalized = synonym;
  }

  return normalized;
}

/**
 * Parse ingredients text into normalized array
 * Handles comma-separated lists, semicolons, and other delimiters
 */
export function parseIngredientsText(ingredientsText: string): string[] {
  if (!ingredientsText || typeof ingredientsText !== 'string') {
    return [];
  }

  // Split by common delimiters (comma, semicolon, "and")
  const delimiters = /[,;]|\sand\s/i;
  const rawIngredients = ingredientsText.split(delimiters);

  // Normalize and deduplicate
  const normalized = rawIngredients
    .map((ing) => normalizeIngredient(ing))
    .filter((ing) => ing.length > 0) // Remove empty strings
    .filter((ing, index, arr) => arr.indexOf(ing) === index); // Remove duplicates

  return normalized;
}

/**
 * Extract INCI names from ingredient objects
 */
export function extractINCIFromIngredients(ingredients: any[]): string[] {
  if (!Array.isArray(ingredients)) {
    return [];
  }

  const inciNames: string[] = [];

  for (const ing of ingredients) {
    if (typeof ing === 'string') {
      const normalized = normalizeIngredient(ing);
      if (normalized) {
        inciNames.push(normalized);
      }
    } else if (ing && typeof ing === 'object') {
      const text = ing.text || ing.id || ing.name || ing.inci_name || '';
      if (text) {
        const normalized = normalizeIngredient(text);
        if (normalized) {
          inciNames.push(normalized);
        }
      }
    }
  }

  // Remove duplicates while preserving order
  return Array.from(new Set(inciNames));
}

