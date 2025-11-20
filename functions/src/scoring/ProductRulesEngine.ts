/**
 * Product Rules Engine
 * Computes product scores based on user profile (hair type, porosity, scalp sensitivity)
 * Uses CosIng ingredient science data to generate explainable reasons
 */

import { CosIngAdapter, CosIngIngredient } from '../adapters/CosIngAdapter';

export interface ProductScoreResult {
  score: number; // 0-100
  reasons: string[]; // Explainable reasons (e.g., "Avoids coconut oil for low-porosity hair")
  warnings: string[]; // Warnings about problematic ingredients
  recommendations: string[]; // Positive recommendations
}

export interface HairProfileRules {
  hairType: 'straight' | 'wavy' | 'curly' | 'coily' | 'mixed';
  porosity: 'low' | 'medium' | 'high';
  scalpSensitive?: boolean;
  concerns?: string[]; // e.g., ['frizz', 'dryness', 'damage', 'volume']
}

/**
 * Rules Engine for Product Scoring
 */
export class ProductRulesEngine {
  private cosingAdapter: CosIngAdapter;

  constructor(cosingAdapter: CosIngAdapter) {
    this.cosingAdapter = cosingAdapter;
  }

  /**
   * Score a product based on user profile and ingredient science
   */
  async scoreProduct(
    ingredientsText: string,
    normalizedIngredients: string[],
    userProfile: HairProfileRules
  ): Promise<ProductScoreResult> {
    const reasons: string[] = [];
    const warnings: string[] = [];
    const recommendations: string[] = [];
    let score = 50; // Start with neutral score

    // Get CosIng data for all ingredients
    const ingredientScience = await this.cosingAdapter.getBatchIngredientScience(normalizedIngredients);

    // Analyze each ingredient against user profile
    for (const ingredient of normalizedIngredients) {
      const science = ingredientScience.get(ingredient);
      if (!science) continue;

      const analysis = this.analyzeIngredientForProfile(ingredient, science, userProfile);
      
      if (analysis.scoreAdjustment !== 0) {
        score += analysis.scoreAdjustment;
      }

      if (analysis.reason) {
        reasons.push(analysis.reason);
      }

      if (analysis.warning) {
        warnings.push(analysis.warning);
      }

      if (analysis.recommendation) {
        recommendations.push(analysis.recommendation);
      }
    }

    // Apply porosity-specific rules
    const porosityRules = this.applyPorosityRules(normalizedIngredients, ingredientScience, userProfile.porosity);
    score += porosityRules.scoreAdjustment;
    reasons.push(...porosityRules.reasons);
    warnings.push(...porosityRules.warnings);

    // Apply hair type-specific rules
    const hairTypeRules = this.applyHairTypeRules(normalizedIngredients, ingredientScience, userProfile.hairType);
    score += hairTypeRules.scoreAdjustment;
    reasons.push(...hairTypeRules.reasons);
    warnings.push(...hairTypeRules.warnings);

    // Apply scalp sensitivity rules
    if (userProfile.scalpSensitive) {
      const scalpRules = this.applyScalpSensitivityRules(normalizedIngredients, ingredientScience);
      score += scalpRules.scoreAdjustment;
      reasons.push(...scalpRules.reasons);
      warnings.push(...scalpRules.warnings);
    }

    // Apply concern-specific rules
    if (userProfile.concerns && userProfile.concerns.length > 0) {
      const concernRules = this.applyConcernRules(normalizedIngredients, ingredientScience, userProfile.concerns);
      score += concernRules.scoreAdjustment;
      reasons.push(...concernRules.reasons);
      recommendations.push(...concernRules.recommendations);
    }

    // Clamp score to 0-100
    score = Math.max(0, Math.min(100, score));

    return {
      score,
      reasons: reasons.filter((r, i, arr) => arr.indexOf(r) === i), // Remove duplicates
      warnings: warnings.filter((w, i, arr) => arr.indexOf(w) === i),
      recommendations: recommendations.filter((r, i, arr) => arr.indexOf(r) === i),
    };
  }

  /**
   * Analyze a single ingredient against user profile
   */
  private analyzeIngredientForProfile(
    ingredient: string,
    science: CosIngIngredient,
    profile: HairProfileRules
  ): { scoreAdjustment: number; reason?: string; warning?: string; recommendation?: string } {
    let scoreAdjustment = 0;
    let reason: string | undefined;
    let warning: string | undefined;
    let recommendation: string | undefined;

    const functions = science.functions || [];
    const inciName = science.inci_name || ingredient;

    // Check for problematic ingredients based on porosity
    if (profile.porosity === 'low') {
      // Low porosity: avoid heavy oils and silicones
      if (functions.includes('emollient') && this.isHeavyOil(ingredient)) {
        scoreAdjustment -= 15;
        warning = `Contains ${inciName}, which can sit on the surface of low-porosity hair and weigh it down`;
        reason = `Avoids heavy oils like ${inciName} for low-porosity hair because they can sit on the surface and weigh down`;
      }

      if (this.isSilicone(ingredient)) {
        scoreAdjustment -= 10;
        warning = `Contains ${inciName}, a silicone that can cause buildup on low-porosity hair`;
        reason = `Avoids silicones like ${inciName} for low-porosity hair because they can cause buildup`;
      }
    }

    if (profile.porosity === 'high') {
      // High porosity: benefit from heavy oils and proteins
      if (functions.includes('emollient') && this.isHeavyOil(ingredient)) {
        scoreAdjustment += 10;
        recommendation = `Contains ${inciName}, which helps seal moisture into high-porosity hair`;
        reason = `Includes ${inciName} for high-porosity hair because it helps seal in moisture`;
      }

      if (this.isProtein(ingredient)) {
        scoreAdjustment += 10;
        recommendation = `Contains ${inciName}, a protein that helps strengthen high-porosity hair`;
        reason = `Includes ${inciName} for high-porosity hair because it helps strengthen the hair shaft`;
      }
    }

    // Check for scalp sensitivity
    if (profile.scalpSensitive) {
      if (this.isHarshSurfactant(ingredient)) {
        scoreAdjustment -= 20;
        warning = `Contains ${inciName}, which can irritate sensitive scalp`;
        reason = `Avoids ${inciName} for sensitive scalp because it can cause irritation`;
      }
    }

    // Check for moisturizing ingredients (good for dryness)
    if (profile.concerns?.includes('dryness')) {
      if (functions.includes('humectant')) {
        scoreAdjustment += 15;
        recommendation = `Contains ${inciName}, a humectant that helps retain moisture`;
        reason = `Includes ${inciName} for dry hair because it helps retain moisture`;
      }
    }

    // Check for volumizing ingredients (good for volume concerns)
    if (profile.concerns?.includes('volume')) {
      if (this.isLightweightIngredient(ingredient)) {
        scoreAdjustment += 10;
        recommendation = `Contains ${inciName}, which adds volume without weighing hair down`;
        reason = `Includes ${inciName} for volume because it's lightweight and doesn't weigh hair down`;
      }
    }

    return { scoreAdjustment, reason, warning, recommendation };
  }

  /**
   * Apply porosity-specific rules
   */
  private applyPorosityRules(
    ingredients: string[],
    ingredientScience: Map<string, CosIngIngredient>,
    porosity: 'low' | 'medium' | 'high'
  ): { scoreAdjustment: number; reasons: string[]; warnings: string[] } {
    const reasons: string[] = [];
    const warnings: string[] = [];
    let scoreAdjustment = 0;

    if (porosity === 'low') {
      // Low porosity: prefer lightweight ingredients, avoid heavy oils
      const hasHeavyOils = ingredients.some(ing => {
        const science = ingredientScience.get(ing);
        return science && this.isHeavyOil(ing);
      });

      if (hasHeavyOils) {
        scoreAdjustment -= 10;
        warnings.push('Contains heavy oils that may not penetrate low-porosity hair');
      }

      const hasLightweightOils = ingredients.some(ing => {
        const science = ingredientScience.get(ing);
        return science && this.isLightweightOil(ing);
      });

      if (hasLightweightOils) {
        scoreAdjustment += 10;
        reasons.push('Contains lightweight oils suitable for low-porosity hair');
      }
    } else if (porosity === 'high') {
      // High porosity: benefit from heavy oils and proteins
      const hasHeavyOils = ingredients.some(ing => {
        const science = ingredientScience.get(ing);
        return science && this.isHeavyOil(ing);
      });

      if (hasHeavyOils) {
        scoreAdjustment += 15;
        reasons.push('Contains heavy oils that help seal moisture into high-porosity hair');
      }

      const hasProteins = ingredients.some(ing => this.isProtein(ing));
      if (hasProteins) {
        scoreAdjustment += 10;
        reasons.push('Contains proteins that help strengthen high-porosity hair');
      }
    }

    return { scoreAdjustment, reasons, warnings };
  }

  /**
   * Apply hair type-specific rules
   */
  private applyHairTypeRules(
    ingredients: string[],
    ingredientScience: Map<string, CosIngIngredient>,
    hairType: 'straight' | 'wavy' | 'curly' | 'coily' | 'mixed'
  ): { scoreAdjustment: number; reasons: string[]; warnings: string[] } {
    const reasons: string[] = [];
    const warnings: string[] = [];
    let scoreAdjustment = 0;

    if (hairType === 'curly' || hairType === 'coily') {
      // Curly/coily hair: benefit from moisturizing ingredients
      const hasHumectants = ingredients.some(ing => {
        const science = ingredientScience.get(ing);
        return science && science.functions?.includes('humectant');
      });

      if (hasHumectants) {
        scoreAdjustment += 10;
        reasons.push('Contains humectants that help maintain moisture in curly/coily hair');
      }
    }

    return { scoreAdjustment, reasons, warnings };
  }

  /**
   * Apply scalp sensitivity rules
   */
  private applyScalpSensitivityRules(
    ingredients: string[],
    ingredientScience: Map<string, CosIngIngredient>
  ): { scoreAdjustment: number; reasons: string[]; warnings: string[] } {
    const reasons: string[] = [];
    const warnings: string[] = [];
    let scoreAdjustment = 0;

    const hasHarshSurfactants = ingredients.some(ing => this.isHarshSurfactant(ing));
    if (hasHarshSurfactants) {
      scoreAdjustment -= 20;
      warnings.push('Contains harsh surfactants that may irritate sensitive scalp');
    }

    const hasGentleSurfactants = ingredients.some(ing => {
      const science = ingredientScience.get(ing);
      return science && this.isGentleSurfactant(ing);
    });

    if (hasGentleSurfactants) {
      scoreAdjustment += 15;
      reasons.push('Contains gentle surfactants suitable for sensitive scalp');
    }

    return { scoreAdjustment, reasons, warnings };
  }

  /**
   * Apply concern-specific rules
   */
  private applyConcernRules(
    ingredients: string[],
    ingredientScience: Map<string, CosIngIngredient>,
    concerns: string[]
  ): { scoreAdjustment: number; reasons: string[]; recommendations: string[] } {
    const reasons: string[] = [];
    const recommendations: string[] = [];
    let scoreAdjustment = 0;

    if (concerns.includes('frizz')) {
      const hasAntiFrizzIngredients = ingredients.some(ing => {
        const science = ingredientScience.get(ing);
        return science && (this.isSilicone(ing) || this.isOil(ing));
      });

      if (hasAntiFrizzIngredients) {
        scoreAdjustment += 10;
        recommendations.push('Contains ingredients that help control frizz');
      }
    }

    if (concerns.includes('damage')) {
      const hasProteins = ingredients.some(ing => this.isProtein(ing));
      if (hasProteins) {
        scoreAdjustment += 15;
        recommendations.push('Contains proteins that help repair damaged hair');
      }
    }

    return { scoreAdjustment, reasons, recommendations };
  }

  // Helper methods to identify ingredient types
  private isHeavyOil(ingredient: string): boolean {
    const heavyOils = ['coconut', 'castor', 'olive', 'avocado', 'shea'];
    return heavyOils.some(oil => ingredient.toLowerCase().includes(oil));
  }

  private isLightweightOil(ingredient: string): boolean {
    const lightweightOils = ['argan', 'jojoba', 'grapeseed', 'sweet almond'];
    return lightweightOils.some(oil => ingredient.toLowerCase().includes(oil));
  }

  private isSilicone(ingredient: string): boolean {
    return ingredient.toLowerCase().includes('silicon') || 
           ingredient.toLowerCase().includes('dimethicone') ||
           ingredient.toLowerCase().includes('cyclomethicone');
  }

  private isProtein(ingredient: string): boolean {
    const proteins = ['keratin', 'collagen', 'wheat protein', 'soy protein', 'amino acid'];
    return proteins.some(protein => ingredient.toLowerCase().includes(protein));
  }

  private isHarshSurfactant(ingredient: string): boolean {
    const harsh = ['sodium lauryl sulfate', 'sodium laureth sulfate', 'ammonium lauryl sulfate'];
    return harsh.some(surfactant => ingredient.toLowerCase().includes(surfactant));
  }

  private isGentleSurfactant(ingredient: string): boolean {
    const gentle = ['cocamidopropyl betaine', 'decyl glucoside', 'lauryl glucoside'];
    return gentle.some(surfactant => ingredient.toLowerCase().includes(surfactant));
  }

  private isOil(ingredient: string): boolean {
    return ingredient.toLowerCase().includes('oil') || 
           ingredient.toLowerCase().endsWith('oil');
  }

  private isLightweightIngredient(ingredient: string): boolean {
    const lightweight = ['glycerin', 'hyaluronic acid', 'aloe vera'];
    return lightweight.some(ing => ingredient.toLowerCase().includes(ing));
  }
}

