/**
 * AI Aggregator for re-ranking products and generating explanations
 * Uses OpenAI GPT-4 or GPT-3.5-turbo for product recommendations
 */

import { ProductScore } from '../types';
import { cache } from '../utils/cache';

// OpenAI API configuration
// Set these as environment variables in Firebase Functions:
// firebase functions:secrets:set OPENAI_API_KEY
// Or use: firebase functions:config:set openai.api_key="your-key-here" (v1 only)
// Environment variables: OPENAI_API_KEY and AI_MODEL
const AI_API_KEY = process.env.OPENAI_API_KEY || '';
const AI_API_URL = 'https://api.openai.com/v1/chat/completions';
// Default to GPT-3.5-turbo for cost efficiency, can be upgraded to GPT-4
const AI_MODEL = process.env.AI_MODEL || 'gpt-3.5-turbo';

export class AIAggregator {
  /**
   * Re-rank top products and generate explanations
   */
  async reRankAndExplain(
    products: ProductScore[],
    topK: number = 10
  ): Promise<ProductScore[]> {
    // Take top K products for AI processing
    const topProducts = products.slice(0, topK * 2); // Get more for better context

    // Check cache
    const productIds = topProducts.map(p => p.product.id).sort();
    const cacheKey = cache.getAIExplanationKey(productIds);
    const cached = cache.get<ProductScore[]>(cacheKey);
    if (cached) {
      console.log('[AIAggregator] Cache hit for product explanations');
      return cached;
    }

    try {
      // Generate AI explanations and re-rank
      const aiResults = await this.callAIService(topProducts);

      // Merge AI results with original scores
      const enhancedProducts = topProducts.map((productScore, index) => {
        const aiResult = aiResults.find(r => r.productId === productScore.product.id);
        return {
          ...productScore,
          aiScore: aiResult?.score,
          aiExplanation: aiResult?.explanation,
          finalRank: index + 1,
        };
      });

      // Re-sort by AI score if available, otherwise use deterministic score
      enhancedProducts.sort((a, b) => {
        const scoreA = a.aiScore ?? a.deterministicScore;
        const scoreB = b.aiScore ?? b.deterministicScore;
        return scoreB - scoreA;
      });

      // Update final ranks
      enhancedProducts.forEach((p, i) => {
        p.finalRank = i + 1;
      });

      const result = enhancedProducts.slice(0, topK);

      // Cache results
      cache.set(cacheKey, result, 7200); // 2 hour cache

      return result;
    } catch (error: any) {
      console.error('[AIAggregator] Error calling AI service:', error.message);
      // Return original top K if AI fails
      return topProducts.slice(0, topK).map((p, i) => ({
        ...p,
        finalRank: i + 1,
      }));
    }
  }

  /**
   * Call AI service (OpenAI, Claude, etc.)
   */
  private async callAIService(
    products: ProductScore[]
  ): Promise<Array<{ productId: string; score: number; explanation: string }>> {
    if (!AI_API_KEY) {
      console.warn('[AIAggregator] No AI API key configured, using mock explanations');
      return this.generateMockExplanations(products);
    }

    try {
      // Prepare prompt for AI
      const prompt = this.buildPrompt(products);

      // Call OpenAI API (GPT-4 or GPT-3.5-turbo)
      console.log(`[AIAggregator] Calling OpenAI API with model: ${AI_MODEL}`);
      const response = await fetch(AI_API_URL, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${AI_API_KEY}`,
        },
        body: JSON.stringify({
          model: AI_MODEL, // 'gpt-4' or 'gpt-3.5-turbo'
          messages: [
            {
              role: 'system',
              content:
                'You are a professional hair care expert with deep knowledge of ' +
                'ingredients, product formulations, and hair science. Provide ' +
                'accurate, helpful recommendations based on data-driven analysis.',
            },
            {
              role: 'user',
              content: prompt,
            },
          ],
          temperature: 0.7, // Balance between creativity and consistency
          max_tokens: 2500, // Increased for better explanations
          // Note: response_format requires specific model versions (gpt-3.5-turbo-1106, gpt-4-1106-preview)
          // For broader compatibility, we parse JSON from text response
        }),
      });

      if (!response.ok) {
        throw new Error(`AI API error: ${response.statusText}`);
      }

      const data = await response.json();
      return this.parseAIResponse(data, products);
    } catch (error: any) {
      console.error('[AIAggregator] AI API call failed:', error.message);
      return this.generateMockExplanations(products);
    }
  }

  /**
   * Build prompt for OpenAI GPT
   */
  private buildPrompt(products: ProductScore[]): string {
    const productSummaries = products.map((p, i) => {
      return `
Product ${i + 1}: ${p.product.brand} ${p.product.name}
- ID: ${p.product.id}
- Overall Score: ${p.deterministicScore.toFixed(1)}/100
- Tag Match: ${p.scoreBreakdown.tagMatch.toFixed(1)}/100
- Sustainability: ${p.scoreBreakdown.sustainability.toFixed(1)}/100
- Ingredient Safety: ${p.scoreBreakdown.ingredientSafety.toFixed(1)}/100
- Review Sentiment: ${p.scoreBreakdown.reviewSentiment.toFixed(1)}/100
- Price Match: ${p.scoreBreakdown.priceMatch.toFixed(1)}/100
- Tags: ${p.product.tags?.join(', ') || 'N/A'}
- Price: $${p.product.price || 'N/A'}
- Description: ${p.product.description || 'N/A'}
`.trim();
    }).join('\n\n');

    return (
      'You are a hair care expert analyzing products for personalized recommendations.\n\n' +
      `Analyze these ${products.length} hair care products and:\n` +
      '1. Re-rank them based on overall quality, user needs, value, and effectiveness\n' +
      '2. Provide a clear, helpful explanation (1-2 sentences) for each product ' +
      'explaining why it\'s recommended or not recommended\n\n' +
      'Consider:\n' +
      '- How well the product matches the user\'s hair type and concerns\n' +
      '- Ingredient safety and potential allergens\n' +
      '- Sustainability and ethical practices\n' +
      '- Value for money\n' +
      '- User reviews and sentiment\n\n' +
      'Products:\n' +
      `${productSummaries}\n\n` +
      'IMPORTANT: Return ONLY a valid JSON array in this exact format ' +
      '(no markdown, no code blocks, just the JSON):\n' +
      '[\n' +
      '  {\n' +
      '    "productId": "exact_product_id_from_above",\n' +
      '    "score": 85,\n' +
      '    "explanation": "Clear 1-2 sentence explanation here"\n' +
      '  },\n' +
      '  {\n' +
      '    "productId": "next_product_id",\n' +
      '    "score": 78,\n' +
      '    "explanation": "Next explanation"\n' +
      '  }\n' +
      ']\n\n' +
      'Rank products from best (highest score) to worst (lowest score). ' +
      'Scores should be between 0-100.'
    ).trim();
  }

  /**
   * Parse OpenAI API response
   */
  private parseAIResponse(
    data: any,
    products: ProductScore[]
  ): Array<{ productId: string; score: number; explanation: string }> {
    try {
      // Extract content from OpenAI response
      let content = '';
      if (data.choices && data.choices[0]?.message?.content) {
        content = data.choices[0].message.content.trim();
      } else if (typeof data === 'string') {
        content = data.trim();
      } else {
        throw new Error('Unexpected response format');
      }

      // Try to parse as JSON directly (if response_format was used)
      let parsed: any;
      try {
        parsed = JSON.parse(content);
      } catch {
        // If direct parse fails, try extracting from markdown code blocks
        const jsonMatch = content.match(/```json\n?([\s\S]*?)\n?```/) || content.match(/```\n?([\s\S]*?)\n?```/);
        const jsonStr = jsonMatch ? jsonMatch[1].trim() : content;
        parsed = JSON.parse(jsonStr);
      }

      // Handle both array format and object with array property
      let results: Array<{ productId: string; score: number; explanation: string }>;
      if (Array.isArray(parsed)) {
        results = parsed;
      } else if (parsed.recommendations && Array.isArray(parsed.recommendations)) {
        results = parsed.recommendations;
      } else if (parsed.products && Array.isArray(parsed.products)) {
        results = parsed.products;
      } else {
        throw new Error('Response is not in expected format');
      }

      // Validate and normalize results
      return results.map((item: any) => ({
        productId: item.productId || item.id || '',
        score: typeof item.score === 'number' ? Math.max(0, Math.min(100, item.score)) : 50,
        explanation: item.explanation || item.reason || 'No explanation provided',
      })).filter((item: any) => item.productId); // Filter out invalid entries

    } catch (error: any) {
      console.error('[AIAggregator] Error parsing AI response:', error.message);
      console.error('[AIAggregator] Response data:', JSON.stringify(data).substring(0, 500));
      // Fallback to mock
      return this.generateMockExplanations(products);
    }
  }

  /**
   * Explain an ingredient's purpose in hair care
   * Provides simple, accurate, science-based education without fear-mongering
   */
  async explainIngredient(
    ingredientName: string,
    productName: string,
    brand: string
  ): Promise<string> {
    if (!AI_API_KEY) {
      return this.getSimpleIngredientExplanation(ingredientName);
    }

    try {
      const prompt =
        `Explain what the ingredient "${ingredientName}" does for hair care in simple, ` +
        'easy-to-understand language. Focus on:\n' +
        '1. What it does for hair (e.g., moisturizes, strengthens, adds shine)\n' +
        '2. How it works in simple terms\n' +
        '3. Is it safe for sensitive scalp? (brief note if relevant)\n\n' +
        'IMPORTANT GUIDELINES:\n' +
        '- Use simple, everyday language (avoid complex scientific jargon)\n' +
        '- Be factual and science-based\n' +
        '- DO NOT use fear-mongering language or exaggerate risks\n' +
        '- Present information in a balanced, educational way\n' +
        '- If there are concerns, mention them factually without alarm\n' +
        '- Keep it to 2-3 sentences maximum\n\n' +
        'Example good explanation: "Glycerin is a humectant that draws moisture into hair, ' +
        'keeping it hydrated and soft. It\'s generally safe for most hair types, though some ' +
        'people with very sensitive scalps may want to patch test first."\n\n' +
        `Now explain "${ingredientName}" for the product "${productName}" by ${brand}:`;

      const response = await fetch(AI_API_URL, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${AI_API_KEY}`,
        },
        body: JSON.stringify({
          model: AI_MODEL,
          messages: [
            {
              role: 'system',
              content:
                'You are a hair care educator and cosmetic chemist. Your role is to provide ' +
                'simple, accurate, science-based explanations about hair care ingredients. ' +
                'Always use plain language, avoid fear-mongering, and present information ' +
                'in a balanced, educational manner. Focus on what ingredients DO for hair, ' +
                'not what they might do wrong. If there are legitimate concerns, mention ' +
                'them factually without exaggeration.',
            },
            {
              role: 'user',
              content: prompt,
            },
          ],
          temperature: 0.5, // Lower temperature for more consistent, factual responses
          max_tokens: 200,
        }),
      });

      if (!response.ok) {
        throw new Error(`AI API error: ${response.statusText}`);
      }

      const data = await response.json();
      const explanation = data.choices[0]?.message?.content || '';
      
      // Clean up the explanation (remove any markdown, extra formatting)
      const cleaned = explanation
        .replace(/```json|```|`/g, '')
        .trim()
        .split('\n')[0]; // Take first sentence/paragraph

      return cleaned || this.getSimpleIngredientExplanation(ingredientName);
    } catch (error: any) {
      console.error('[AIAggregator] Error explaining ingredient:', error);
      return this.getSimpleIngredientExplanation(ingredientName);
    }
  }

  /**
   * Get simple ingredient explanation (fallback)
   */
  private getSimpleIngredientExplanation(ingredientName: string): string {
    const lowerName = ingredientName.toLowerCase();
    
    // Simple, educational explanations for common ingredients
    const explanations: Record<string, string> = {
      'water':
        'The base of most hair products, helps distribute other ingredients evenly throughout your hair.',
      'glycerin':
        'A humectant that draws moisture into hair, keeping it hydrated and soft. ' +
        'Generally safe for most hair types.',
      'coconut oil':
        'Deeply moisturizes and nourishes hair, especially beneficial for curly and dry hair types. ' +
        'Helps reduce protein loss.',
      'shea butter':
        'Rich moisturizer that helps reduce frizz and adds shine. Great for dry, damaged hair.',
      'argan oil':
        'Lightweight oil that adds shine and helps protect hair from heat and environmental damage.',
      'aloe vera':
        'Soothes scalp and adds moisture without weighing hair down. Good for sensitive scalps.',
      'jojoba oil':
        'Mimics natural scalp oils, helps balance oil production and adds shine without greasiness.',
      'silicone':
        'Creates a protective barrier on hair, reducing frizz and adding smoothness. ' +
        'Some types can build up over time, but are generally safe.',
      'sulfate':
        'Cleansing agent that effectively removes dirt and oil. Can be drying for some hair types, ' +
        'especially curly or color-treated hair.',
      'protein':
        'Strengthens hair and helps repair damage, especially beneficial for high-porosity hair. ' +
        'Use in moderation to avoid stiffness.',
      'paraben':
        'Preservative that prevents bacterial growth in products. Some people prefer paraben-free options, ' +
        'but they are generally considered safe in cosmetic concentrations.',
      'dimethicone':
        'A type of silicone that smooths hair and reduces frizz. ' +
        'Creates a protective layer that can build up with frequent use.',
      'panthenol':
        'A form of vitamin B5 that moisturizes and adds shine. ' +
        'Helps improve hair elasticity and manageability.',
      'keratin':
        'A protein naturally found in hair. In products, it helps strengthen and smooth damaged hair.',
    };

    // Check for partial matches
    for (const [key, explanation] of Object.entries(explanations)) {
      if (lowerName.includes(key)) {
        return explanation;
    }
    }

    // Generic educational explanation
    return (
      'This ingredient is commonly used in hair care products for its beneficial properties. ' +
      'It helps maintain healthy, manageable hair.'
    );
  }

  /**
   * Explain why a product is recommended for a user
   */
  async explainProductRecommendation(
    product: any, // Product type from products.ts
    userQuizAnswers: any
  ): Promise<string> {
    if (!AI_API_KEY) {
      return 'This product matches your hair profile and preferences.';
    }

    try {
      const prompt =
        `Explain why the hair care product "${product.title || product.name}" ` +
        `by ${product.brand} is recommended for a user with the following profile:
- Hair Type: ${userQuizAnswers.hairType || 'Not specified'}
- Porosity: ${userQuizAnswers.porosity || 'Not specified'}
- Concerns: ${userQuizAnswers.concerns?.join(', ') || 'None'}
- Preferences: ${JSON.stringify(userQuizAnswers.preferences || {})}
- Allergens to avoid: ${userQuizAnswers.allergens?.join(', ') || 'None'}

Product tags: ${product.tags?.join(', ') || 'N/A'}

Provide a personalized explanation (3-4 sentences) explaining why this product fits their needs.`;

      const response = await fetch(AI_API_URL, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${AI_API_KEY}`,
        },
        body: JSON.stringify({
          model: AI_MODEL,
          messages: [
            {
              role: 'system',
              content:
                'You are a hair care expert providing personalized product ' +
                'recommendations. Explain why products match user needs.',
            },
            {
              role: 'user',
              content: prompt,
            },
          ],
          temperature: 0.7,
          max_tokens: 200,
        }),
      });

      if (!response.ok) {
        throw new Error(`AI API error: ${response.statusText}`);
      }

      const data = await response.json();
      return data.choices[0]?.message?.content || 'This product matches your hair profile and preferences.';
    } catch (error: any) {
      console.error('[AIAggregator] Error explaining recommendation:', error);
      return 'This product matches your hair profile and preferences.';
    }
  }

  /**
   * Generate mock explanations (for development/testing)
   */
  private generateMockExplanations(
    products: ProductScore[]
  ): Array<{ productId: string; score: number; explanation: string }> {
    return products.map((p, i) => {
      const explanations = [
        'This product is well-suited for your hair type with good ingredient safety and positive reviews.',
        'A solid choice that matches your preferences, though slightly above your budget range.',
        'Highly rated by users with similar hair concerns. The ingredients are generally safe.',
        'Good value for money with sustainable packaging and cruelty-free certification.',
        'Effective product with strong tag matches, though some users report minor issues.',
      ];

      return {
        productId: p.product.id,
        score: p.deterministicScore + (Math.random() * 10 - 5), // Slight variation
        explanation: explanations[i % explanations.length],
      };
    });
  }
}

