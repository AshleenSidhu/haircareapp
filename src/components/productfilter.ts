// productFilter.ts ------------------------------------------------------------

import { IngredientTranslation } from "./userprofiletypes";

interface Product {
  id: string;
  brand: string;
  title: string;
  productType: string;
  productPageUrl: string;
  imageUrl: string;
  price: number;
  currency: string;
  ingredients: string[];
  tags: {
    vegan: boolean;
    sulfateFree: boolean;
    siliconeFree: boolean;
    parabenFree: boolean;
    crueltyFree: boolean;
  };
}

export function filterAndScoreProducts(
  products: Product[],
  user: IngredientTranslation
) {
  // ------------------------------------------------------------
  // 1. FILTER PHASE
  // ------------------------------------------------------------
  const filtered = products.filter((product) => {
    // Brand avoid check
    if (
      user.brandToAvoid &&
      product.brand.toLowerCase().includes(user.brandToAvoid.toLowerCase())
    ) {
      return false;
    }

    // Budget filter
    if (!matchBudget(user.budget, product.price)) {
      return false;
    }

    // Hair type filter → must match list from IngredientTranslation
    if (
      user.matchingHairTypeProducts &&
      !user.matchingHairTypeProducts.includes(product.id)
    ) {
      return false;
    }

    // Negative ingredient filter (allergies, sensitivities, etc.)
    const productIngredientsLower = product.ingredients.map((i) =>
      i.toLowerCase()
    );
    for (const neg of user.negativeIngredients) {
      if (productIngredientsLower.includes(neg.toLowerCase())) {
        return false;
      }
    }

    return true;
  });

  // ------------------------------------------------------------
  // 2. SCORING PHASE
  // ------------------------------------------------------------
  const scored = filtered.map((product) => {
    let score = 0;

    const productIngredientsLower = product.ingredients.map((i) =>
      i.toLowerCase()
    );

    // Positive ingredient score
    for (const pos of user.positiveIngredients) {
      if (productIngredientsLower.includes(pos.toLowerCase())) {
        score += 10; // high weight for ingredient match
      }
    }

    // Product type match
    if (user.recommendedProductTypes.includes(product.productType)) {
      score += 5;
    }

    // Hair type scoring → extra bonus if matched
    if (user.matchingHairTypeProducts.includes(product.id)) {
      score += 15; // strong weight for correct hair type
    }

    // Tag matching: sulfate-free, vegan, silicone-free...
    if (user.negativeIngredients.includes("dimethicone")) {
      if (product.tags.siliconeFree) score += 3;
      else score -= 3;
    }

    if (user.negativeIngredients.includes("sodium lauryl sulfate")) {
      if (product.tags.sulfateFree) score += 3;
      else score -= 3;
    }

    if (user.productQualities?.includes("Vegan / cruelty-free")) {
      if (product.tags.vegan || product.tags.crueltyFree) score += 3;
    }

    return { ...product, score };
  });

  // ------------------------------------------------------------
  // 3. SORT DESCENDING BY SCORE
  // ------------------------------------------------------------
  return scored.sort((a, b) => b.score - a.score);
}

// ------------------------------------------------------------
// Budget match helper
// ------------------------------------------------------------
function matchBudget(userBudget: string, price: number): boolean {
  switch (userBudget) {
    case "< 15$":
      return price < 15;
    case "16$-35$":
      return price <= 35;
    case "36$-59$":
      return price <= 59;
    case "> 60$":
      return true;
    case "Show me all the options":
      return true;
    default:
      return true;
  }
}
