/**
 * Sustainability Tagging Utility
 * Analyzes products and generates sustainability tags based on data from APIs
 */

import { Product } from '../types';

export interface SustainabilityTags {
  ecoFriendly: boolean;
  sustainable: boolean;
  crueltyFree: boolean;
  locallyOwned: boolean;
  smallBrand: boolean;
  recyclablePackaging?: boolean;
  plantBased?: boolean;
  harmfulChemicals?: string[];
  tags: string[];
  explanation?: string;
}

export class SustainabilityTagger {
  /**
   * Generate sustainability tags for a product
   */
  generateTags(product: Product): SustainabilityTags {
    const tags: string[] = [];
    const harmfulChemicals: string[] = [];
    
    // Check ingredients for harmful chemicals
    // Handle both string[] and IngredientWithExplanation[] formats
    const ingredientList = product.ingredients || [];
    const ingredientStrings = ingredientList.map((ing: any) => 
      typeof ing === 'string' ? ing : ing.name || ''
    ).filter((s: string) => s.length > 0);
    const flaggedChemicals = this.detectHarmfulChemicals(ingredientStrings);
    harmfulChemicals.push(...flaggedChemicals);
    
    // Check tags for sustainability indicators
    const productTags = product.tags || [];
    const lowerTags = productTags.map(t => t.toLowerCase());
    
    // Eco-friendly indicators
    const ecoFriendly = 
      lowerTags.some(t => t.includes('eco') || t.includes('green') || t.includes('natural')) ||
      lowerTags.includes('organic') ||
      lowerTags.includes('plant-based');
    
    // Sustainable indicators
    const sustainable = 
      ecoFriendly ||
      lowerTags.includes('sustainable') ||
      lowerTags.includes('fair-trade') ||
      lowerTags.includes('ethical');
    
    // Cruelty-free indicators
    const crueltyFree = 
      lowerTags.includes('cruelty-free') ||
      lowerTags.includes('not-tested-on-animals') ||
      lowerTags.includes('vegan');
    
    // Locally owned / small brand indicators
    // This would ideally come from brand data, but we can infer from tags
    const locallyOwned = 
      lowerTags.includes('local') ||
      lowerTags.includes('small-batch') ||
      lowerTags.includes('artisan');
    
    const smallBrand = locallyOwned || lowerTags.includes('indie');
    
    // Plant-based indicators
    const plantBased = 
      lowerTags.includes('plant-based') ||
      lowerTags.includes('botanical') ||
      lowerTags.some(t => t.includes('herbal'));
    
    // Recyclable packaging (would need packaging data from API)
    const recyclablePackaging = 
      lowerTags.includes('recyclable') ||
      lowerTags.includes('recycled-packaging');
    
    // Build tag emoji array
    if (recyclablePackaging) tags.push('♻️ recyclable');
    if (ecoFriendly) tags.push('🍃 eco-friendly');
    if (crueltyFree) tags.push('🐰 cruelty-free');
    if (locallyOwned) tags.push('🇨🇦 locally owned');
    if (plantBased) tags.push('🌱 plant-based');
    if (harmfulChemicals.length > 0) tags.push('⚠️ harmful chemicals');
    
    return {
      ecoFriendly,
      sustainable,
      crueltyFree,
      locallyOwned,
      smallBrand,
      recyclablePackaging,
      plantBased,
      harmfulChemicals: harmfulChemicals.length > 0 ? harmfulChemicals : undefined,
      tags,
    };
  }
  
  /**
   * Detect harmful chemicals in ingredient list
   */
  private detectHarmfulChemicals(ingredients: string[]): string[] {
    const harmfulList = [
      'sulfate', 'paraben', 'formaldehyde', 'phthalate', 'triclosan',
      'sodium lauryl sulfate', 'sodium laureth sulfate', 'ammonium lauryl sulfate',
      'methylparaben', 'propylparaben', 'butylparaben', 'ethylparaben',
      'dmdm hydantoin', 'imidazolidinyl urea', 'diazolidinyl urea',
      'diethanolamine', 'triethanolamine', 'cocamide dea',
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
   * Generate AI explanation for sustainability tags
   */
  generateExplanation(tags: SustainabilityTags): string {
    const explanations: string[] = [];
    
    if (tags.ecoFriendly) {
      explanations.push('This product uses eco-friendly ingredients and practices.');
    }
    
    if (tags.crueltyFree) {
      explanations.push('This product is cruelty-free and not tested on animals.');
    }
    
    if (tags.recyclablePackaging) {
      explanations.push('The packaging is recyclable, reducing environmental impact.');
    }
    
    if (tags.plantBased) {
      explanations.push('Made with plant-based ingredients for a natural approach.');
    }
    
    if (tags.locallyOwned) {
      explanations.push('Supports local businesses and reduces shipping impact.');
    }
    
    if (tags.harmfulChemicals && tags.harmfulChemicals.length > 0) {
      explanations.push(`Contains ${tags.harmfulChemicals.length} ingredient(s) that may cause concern for some users.`);
    }
    
    return explanations.join(' ') || 'Standard product with no specific sustainability certifications.';
  }
}

