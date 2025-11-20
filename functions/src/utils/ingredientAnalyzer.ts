/**
 * Ingredient Analyzer with AI Explanations
 * Analyzes ingredients and generates human-friendly explanations using AI
 */

import { IngredientAdapter } from '../adapters/IngredientAdapter';
import { AIAggregator } from '../ai/AIAggregator';

export interface IngredientAnalysis {
  name: string;
  aiExplanation: string;
  safetyLevel: 'safe' | 'caution' | 'avoid';
  allergenFlag?: boolean;
  whatItDoes: string;
  sensitiveScalpSafe?: boolean;
}

export class IngredientAnalyzer {
  private ingredientAdapter: IngredientAdapter;
  private aiAggregator: AIAggregator;
  
  constructor() {
    this.ingredientAdapter = new IngredientAdapter();
    this.aiAggregator = new AIAggregator();
  }
  
  /**
   * Analyze a single ingredient and generate AI explanation
   * Provides simple, accurate, science-based education
   */
  async analyzeIngredient(
    ingredientName: string,
    productName?: string,
    brand?: string
  ): Promise<IngredientAnalysis> {
    // Get safety data from ingredient adapter
    const safetyData = await this.ingredientAdapter.analyzeIngredientSafety([ingredientName]);
    
    // Determine safety level
    let safetyLevel: 'safe' | 'caution' | 'avoid' = 'safe';
    if (safetyData.score < 30) {
      safetyLevel = 'avoid';
    } else if (safetyData.score < 70) {
      safetyLevel = 'caution';
    }
    
    // Check for allergens
    const allergenFlag = (safetyData.allergenMatches || []).length > 0;
    
    // Generate AI explanation (use AI if available, otherwise use simple explanation)
    let aiExplanation: string;
    try {
      aiExplanation = await this.aiAggregator.explainIngredient(
        ingredientName,
        productName || 'hair care product',
        brand || 'various brands'
      );
    } catch (error) {
      // Fallback to simple explanation if AI fails
      aiExplanation = this.generateSimpleExplanation(ingredientName, safetyData);
    }
    
    // Extract what it does from explanation
    const whatItDoes = this.extractWhatItDoes(aiExplanation);
    
    // Determine if safe for sensitive scalp
    const sensitiveScalpSafe = safetyLevel === 'safe' && !allergenFlag;
    
    return {
      name: ingredientName,
      aiExplanation,
      safetyLevel,
      allergenFlag,
      whatItDoes,
      sensitiveScalpSafe,
    };
  }
  
  /**
   * Analyze multiple ingredients
   */
  async analyzeIngredients(
    ingredientNames: string[],
    productName?: string,
    brand?: string
  ): Promise<IngredientAnalysis[]> {
    // Analyze in parallel but limit concurrency
    const batchSize = 5;
    const results: IngredientAnalysis[] = [];
    
    for (let i = 0; i < ingredientNames.length; i += batchSize) {
      const batch = ingredientNames.slice(i, i + batchSize);
      const batchResults = await Promise.all(
        batch.map(ingredient => this.analyzeIngredient(ingredient, productName, brand))
      );
      results.push(...batchResults);
    }
    
    return results;
  }
  
  /**
   * Generate simple explanation (fallback or for common ingredients)
   */
  private generateSimpleExplanation(ingredientName: string, safetyData: any): string {
    const lowerName = ingredientName.toLowerCase();
    
    // Common ingredient explanations - simple, educational, non-alarmist
    const commonIngredients: Record<string, string> = {
      'water': 'The base of most hair products, helps distribute other ingredients evenly throughout your hair.',
      'glycerin': 'A humectant that draws moisture into hair, keeping it hydrated and soft. Generally safe for most hair types.',
      'coconut oil': 'Deeply moisturizes and nourishes hair, especially beneficial for curly and dry hair types. Helps reduce protein loss.',
      'shea butter': 'Rich moisturizer that helps reduce frizz and adds shine. Great for dry, damaged hair.',
      'argan oil': 'Lightweight oil that adds shine and helps protect hair from heat and environmental damage.',
      'aloe vera': 'Soothes scalp and adds moisture without weighing hair down. Good for sensitive scalps.',
      'jojoba oil': 'Mimics natural scalp oils, helps balance oil production and adds shine without greasiness.',
      'silicone': 'Creates a protective barrier on hair, reducing frizz and adding smoothness. Some types can build up over time, but are generally safe and effective.',
      'sulfate': 'Cleansing agent that effectively removes dirt and oil. Can be drying for some hair types, especially curly or color-treated hair.',
      'protein': 'Strengthens hair and helps repair damage, especially beneficial for high-porosity hair. Use in moderation to avoid stiffness.',
      'paraben': 'Preservative that prevents bacterial growth in products. Some people prefer paraben-free options, but they are generally considered safe in cosmetic concentrations.',
      'dimethicone': 'A type of silicone that smooths hair and reduces frizz. Creates a protective layer that can build up with frequent use.',
      'panthenol': 'A form of vitamin B5 that moisturizes and adds shine. Helps improve hair elasticity and manageability.',
      'keratin': 'A protein naturally found in hair. In products, it helps strengthen and smooth damaged hair.',
    };
    
    // Check for partial matches
    for (const [key, explanation] of Object.entries(commonIngredients)) {
      if (lowerName.includes(key)) {
        return explanation;
      }
    }
    
    // Generic explanation based on safety score - educational and balanced
    if (safetyData.score >= 70) {
      return `This ingredient is commonly used in hair care products and is generally considered safe. It helps maintain healthy, manageable hair.`;
    } else if (safetyData.score >= 30) {
      return `This ingredient is used in many hair products. Some people with sensitive skin may want to patch test first, but it's generally well-tolerated.`;
    } else {
      return `This ingredient may cause irritation for some people, especially those with sensitive skin or allergies. If you have concerns, consider patch testing or consulting with a dermatologist.`;
    }
  }
  
  /**
   * Extract "what it does" from explanation
   */
  private extractWhatItDoes(explanation: string): string {
    // Try to extract the first sentence or key phrase
    const sentences = explanation.split('.');
    if (sentences.length > 0) {
      return sentences[0].trim() + '.';
    }
    return explanation;
  }
}

