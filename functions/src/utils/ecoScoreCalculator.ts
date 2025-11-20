/**
 * Eco Score Calculator
 * Calculates a sustainability/eco score (0-100) for products with detailed reasoning
 */

import { Product } from '../types';

export interface EcoScoreResult {
  score: number; // 0-100
  grade: 'A+' | 'A' | 'B+' | 'B' | 'C+' | 'C' | 'D' | 'F';
  reasoning: string[];
  positiveFactors: string[];
  negativeFactors: string[];
  recommendations?: string[];
}

export class EcoScoreCalculator {
  /**
   * Calculate eco score for a product
   */
  calculateEcoScore(product: Product): EcoScoreResult {
    let score = 50; // Start at neutral
    const positiveFactors: string[] = [];
    const negativeFactors: string[] = [];
    const reasoning: string[] = [];

    // Extract ingredient list
    const ingredientList = product.ingredients || [];
    const ingredientStrings = ingredientList.map((ing: any) => 
      typeof ing === 'string' ? ing : ing.name || ''
    ).filter((s: string) => s.length > 0);

    // 1. Check for harmful chemicals (-5 to -15 points each)
    const harmfulChemicals = this.detectHarmfulChemicals(ingredientStrings);
    if (harmfulChemicals.length > 0) {
      const penalty = Math.min(30, harmfulChemicals.length * 8);
      score -= penalty;
      negativeFactors.push(`Contains ${harmfulChemicals.length} potentially harmful chemical(s): ${harmfulChemicals.slice(0, 3).join(', ')}`);
      reasoning.push(`Deducted ${penalty} points for harmful chemicals`);
    }

    // 2. Check for natural/organic ingredients (+5 to +15 points)
    const naturalIngredients = this.detectNaturalIngredients(ingredientStrings);
    if (naturalIngredients.count > 0) {
      const bonus = Math.min(20, naturalIngredients.count * 2);
      score += bonus;
      positiveFactors.push(`Contains ${naturalIngredients.count} natural/organic ingredient(s)`);
      reasoning.push(`Added ${bonus} points for natural ingredients`);
    }

    // 3. Check product tags for sustainability indicators
    const tags = product.tags || [];
    const lowerTags = tags.map(t => t.toLowerCase());

    // Eco-friendly tag (+10 points)
    if (lowerTags.some(t => t.includes('eco') || t.includes('green'))) {
      score += 10;
      positiveFactors.push('Eco-friendly certified or labeled');
      reasoning.push('Added 10 points for eco-friendly certification');
    }

    // Organic tag (+15 points)
    if (lowerTags.includes('organic')) {
      score += 15;
      positiveFactors.push('Organic certified');
      reasoning.push('Added 15 points for organic certification');
    }

    // Cruelty-free tag (+10 points)
    if (lowerTags.includes('cruelty-free') || lowerTags.includes('not-tested-on-animals')) {
      score += 10;
      positiveFactors.push('Cruelty-free (not tested on animals)');
      reasoning.push('Added 10 points for cruelty-free certification');
    }

    // Vegan tag (+5 points)
    if (lowerTags.includes('vegan')) {
      score += 5;
      positiveFactors.push('Vegan (no animal-derived ingredients)');
      reasoning.push('Added 5 points for vegan certification');
    }

    // Recyclable packaging (+10 points)
    if (lowerTags.includes('recyclable') || lowerTags.includes('recycled-packaging')) {
      score += 10;
      positiveFactors.push('Recyclable or recycled packaging');
      reasoning.push('Added 10 points for sustainable packaging');
    }

    // Plant-based tag (+8 points)
    if (lowerTags.includes('plant-based') || lowerTags.includes('botanical')) {
      score += 8;
      positiveFactors.push('Plant-based ingredients');
      reasoning.push('Added 8 points for plant-based formulation');
    }

    // Fair-trade tag (+10 points)
    if (lowerTags.includes('fair-trade') || lowerTags.includes('ethical')) {
      score += 10;
      positiveFactors.push('Fair-trade or ethically sourced');
      reasoning.push('Added 10 points for fair-trade practices');
    }

    // Local/small brand (+5 points)
    if (lowerTags.includes('local') || lowerTags.includes('small-batch') || lowerTags.includes('artisan')) {
      score += 5;
      positiveFactors.push('Local or small-batch production');
      reasoning.push('Added 5 points for supporting local/small businesses');
    }

    // Biodegradable tag (+8 points)
    if (lowerTags.includes('biodegradable')) {
      score += 8;
      positiveFactors.push('Biodegradable formulation');
      reasoning.push('Added 8 points for biodegradable ingredients');
    }

    // 4. Check for synthetic preservatives (-5 points each, max -15)
    const syntheticPreservatives = this.detectSyntheticPreservatives(ingredientStrings);
    if (syntheticPreservatives.length > 0) {
      const penalty = Math.min(15, syntheticPreservatives.length * 5);
      score -= penalty;
      negativeFactors.push(`Contains synthetic preservatives: ${syntheticPreservatives.slice(0, 2).join(', ')}`);
      reasoning.push(`Deducted ${penalty} points for synthetic preservatives`);
    }

    // 5. Check for microplastics (-20 points)
    if (this.detectMicroplastics(ingredientStrings)) {
      score -= 20;
      negativeFactors.push('May contain microplastics');
      reasoning.push('Deducted 20 points for potential microplastics');
    }

    // 6. Check ingredient concentration (if available)
    // Products with water as first ingredient are typically more diluted (+3 points)
    if (ingredientStrings.length > 0 && ingredientStrings[0].toLowerCase().includes('water')) {
      score += 3;
      reasoning.push('Added 3 points for water-based formulation (lower concentration of active ingredients)');
    }

    // Clamp score to 0-100
    score = Math.max(0, Math.min(100, score));

    // Generate grade
    const grade = this.calculateGrade(score);

    // Generate recommendations
    const recommendations = this.generateRecommendations(score, positiveFactors, negativeFactors);

    return {
      score: Math.round(score),
      grade,
      reasoning: reasoning.length > 0 ? reasoning : ['Standard product with no specific sustainability certifications'],
      positiveFactors: positiveFactors.length > 0 ? positiveFactors : ['No specific positive factors identified'],
      negativeFactors: negativeFactors.length > 0 ? negativeFactors : ['No major concerns identified'],
      recommendations,
    };
  }

  /**
   * Detect harmful chemicals in ingredients
   */
  private detectHarmfulChemicals(ingredients: string[]): string[] {
    const harmfulList = [
      'sodium lauryl sulfate',
      'sodium laureth sulfate',
      'ammonium lauryl sulfate',
      'sulfate',
      'paraben',
      'methylparaben',
      'propylparaben',
      'butylparaben',
      'ethylparaben',
      'formaldehyde',
      'dmdm hydantoin',
      'imidazolidinyl urea',
      'diazolidinyl urea',
      'phthalate',
      'triclosan',
      'diethanolamine',
      'triethanolamine',
      'cocamide dea',
    ];

    const found: string[] = [];
    const lowerIngredients = ingredients.map(i => i.toLowerCase());

    for (const chemical of harmfulList) {
      if (lowerIngredients.some(ing => ing.includes(chemical.toLowerCase()))) {
        found.push(chemical);
      }
    }

    return found;
  }

  /**
   * Detect natural/organic ingredients
   */
  private detectNaturalIngredients(ingredients: string[]): { count: number; examples: string[] } {
    const naturalKeywords = [
      'aloe',
      'coconut',
      'argan',
      'jojoba',
      'shea',
      'avocado',
      'olive',
      'chamomile',
      'lavender',
      'rosemary',
      'tea tree',
      'eucalyptus',
      'honey',
      'beeswax',
      'glycerin',
      'vitamin e',
      'vitamin c',
      'botanical',
      'extract',
      'oil',
    ];

    const found: string[] = [];
    const lowerIngredients = ingredients.map(i => i.toLowerCase());

    for (const keyword of naturalKeywords) {
      const matches = lowerIngredients.filter(ing => ing.includes(keyword));
      if (matches.length > 0) {
        found.push(...matches.slice(0, 1)); // One example per keyword
      }
    }

    return {
      count: found.length,
      examples: found.slice(0, 5),
    };
  }

  /**
   * Detect synthetic preservatives
   */
  private detectSyntheticPreservatives(ingredients: string[]): string[] {
    const preservatives = [
      'methylparaben',
      'propylparaben',
      'butylparaben',
      'ethylparaben',
      'phenoxyethanol',
      'benzyl alcohol',
      'potassium sorbate',
      'sodium benzoate',
    ];

    const found: string[] = [];
    const lowerIngredients = ingredients.map(i => i.toLowerCase());

    for (const preservative of preservatives) {
      if (lowerIngredients.some(ing => ing.includes(preservative.toLowerCase()))) {
        found.push(preservative);
      }
    }

    return found;
  }

  /**
   * Detect potential microplastics
   */
  private detectMicroplastics(ingredients: string[]): boolean {
    const microplasticKeywords = [
      'polyethylene',
      'polypropylene',
      'polystyrene',
      'nylon',
      'polyester',
      'acrylates',
    ];

    const lowerIngredients = ingredients.map(i => i.toLowerCase());
    return microplasticKeywords.some(keyword => 
      lowerIngredients.some(ing => ing.includes(keyword))
    );
  }

  /**
   * Calculate letter grade from score
   */
  private calculateGrade(score: number): 'A+' | 'A' | 'B+' | 'B' | 'C+' | 'C' | 'D' | 'F' {
    if (score >= 90) return 'A+';
    if (score >= 85) return 'A';
    if (score >= 80) return 'B+';
    if (score >= 70) return 'B';
    if (score >= 60) return 'C+';
    if (score >= 50) return 'C';
    if (score >= 40) return 'D';
    return 'F';
  }

  /**
   * Generate recommendations based on score
   */
  private generateRecommendations(
    score: number,
    positiveFactors: string[],
    negativeFactors: string[]
  ): string[] {
    const recommendations: string[] = [];

    if (score < 50) {
      recommendations.push('Consider products with organic or natural ingredient certifications');
      recommendations.push('Look for cruelty-free and vegan options');
      if (negativeFactors.some(f => f.includes('harmful chemical'))) {
        recommendations.push('Avoid products with sulfates, parabens, or formaldehyde-releasing agents');
      }
    } else if (score < 70) {
      recommendations.push('Good sustainability profile, but could be improved with recyclable packaging');
      recommendations.push('Consider products with fair-trade certifications');
    } else if (score >= 70) {
      recommendations.push('Excellent eco-friendly choice!');
      if (!positiveFactors.some(f => f.includes('recyclable'))) {
        recommendations.push('Consider checking if packaging is recyclable');
      }
    }

    return recommendations;
  }
}

