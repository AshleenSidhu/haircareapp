/**
 * Client-side OpenAI integration for product recommendations
 * WARNING: API keys in client-side code can be exposed. 
 * For production, use a backend proxy or Firebase Functions.
 */

// Get API key from environment variable
// Set in .env file: REACT_APP_OPENAI_API_KEY=your-key-here
const OPENAI_API_KEY = process.env.REACT_APP_OPENAI_API_KEY || '';
const OPENAI_API_URL = 'https://api.openai.com/v1/chat/completions';
const AI_MODEL = process.env.REACT_APP_AI_MODEL || 'gpt-3.5-turbo';

// Define ProductScore type
export interface ProductScore {
  product: {
    id: string;
    name: string;
    brand: string;
    tags?: string[];
    price?: number;
    description?: string;
  };
  deterministicScore: number;
  scoreBreakdown: {
    tagMatch: number;
    sustainability: number;
    ingredientSafety: number;
    reviewSentiment: number;
    priceMatch: number;
  };
  aiScore?: number;
  aiExplanation?: string;
  finalRank?: number;
}

export class ClientOpenAIService {
  /**
   * Re-rank products and generate explanations using OpenAI
   */
  async reRankAndExplain(
    products: ProductScore[],
    topK: number = 10
  ): Promise<ProductScore[]> {
    if (!OPENAI_API_KEY) {
      console.warn('[OpenAI] No API key found. Using mock explanations.');
      return this.generateMockExplanations(products, topK);
    }

    try {
      // Take top products for AI processing
      const topProducts = products.slice(0, topK * 2);

      // Generate AI explanations and re-rank
      const aiResults = await this.callOpenAI(topProducts);

      // Merge AI results with original scores
      const enhancedProducts = topProducts.map((productScore) => {
        const aiResult = aiResults.find(r => r.productId === productScore.product.id);
        return {
          ...productScore,
          aiScore: aiResult?.score,
          aiExplanation: aiResult?.explanation,
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

      return enhancedProducts.slice(0, topK);
    } catch (error: any) {
      console.error('[OpenAI] Error:', error.message);
      // Fallback to mock explanations
      return this.generateMockExplanations(products, topK);
    }
  }

  /**
   * Call OpenAI API
   */
  private async callOpenAI(products: ProductScore[]): Promise<Array<{ productId: string; score: number; explanation: string }>> {
    const prompt = this.buildPrompt(products);

    console.log(`[OpenAI] Calling API with model: ${AI_MODEL}`);

    const response = await fetch(OPENAI_API_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${OPENAI_API_KEY}`,
      },
      body: JSON.stringify({
        model: AI_MODEL,
        messages: [
          {
            role: 'system',
            content: 'You are a professional hair care expert with deep knowledge of ingredients, product formulations, and hair science. Provide accurate, helpful recommendations based on data-driven analysis.',
          },
          {
            role: 'user',
            content: prompt,
          },
        ],
        temperature: 0.7,
        max_tokens: 2500,
      }),
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(`OpenAI API error: ${response.statusText} - ${JSON.stringify(errorData)}`);
    }

    const data = await response.json();
    return this.parseResponse(data, products);
  }

  /**
   * Build prompt for OpenAI
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

    return `You are a hair care expert analyzing products for personalized recommendations.

Analyze these ${products.length} hair care products and:
1. Re-rank them based on overall quality, user needs, value, and effectiveness
2. Provide a clear, helpful explanation (1-2 sentences) for each product explaining why it's recommended

Consider:
- How well the product matches the user's hair type and concerns
- Ingredient safety and potential allergens
- Sustainability and ethical practices
- Value for money
- User reviews and sentiment

Products:
${productSummaries}

Return your response as a JSON array in this exact format:
[
  {
    "productId": "exact_product_id_from_above",
    "score": 85,
    "explanation": "Clear 1-2 sentence explanation here"
  },
  {
    "productId": "next_product_id",
    "score": 78,
    "explanation": "Next explanation"
  }
]

Rank products from best (highest score) to worst (lowest score). Scores should be between 0-100. Return ONLY the JSON array, no markdown formatting.`.trim();
  }

  /**
   * Parse OpenAI response
   */
  private parseResponse(data: any, products: ProductScore[]): Array<{ productId: string; score: number; explanation: string }> {
    try {
      let content = '';
      if (data.choices && data.choices[0]?.message?.content) {
        content = data.choices[0].message.content.trim();
      } else {
        throw new Error('Unexpected response format');
      }

      // Try to extract JSON from markdown code blocks
      let jsonStr = content;
      const jsonMatch = content.match(/```json\n?([\s\S]*?)\n?```/) || content.match(/```\n?([\s\S]*?)\n?```/);
      if (jsonMatch) {
        jsonStr = jsonMatch[1].trim();
      }

      const parsed = JSON.parse(jsonStr);
      
      // Handle array or object with array property
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

      // Validate and normalize
      return results.map((item: any) => ({
        productId: item.productId || item.id || '',
        score: typeof item.score === 'number' ? Math.max(0, Math.min(100, item.score)) : 50,
        explanation: item.explanation || item.reason || 'No explanation provided',
      })).filter((item: any) => item.productId);

    } catch (error: any) {
      console.error('[OpenAI] Error parsing response:', error);
      console.error('[OpenAI] Response content:', data.choices?.[0]?.message?.content?.substring(0, 500));
      // Return mock explanations in the correct format
      return products.slice(0, products.length).map((p, i) => ({
        productId: p.product.id,
        score: p.deterministicScore + (Math.random() * 10 - 5),
        explanation: 'This product is well-suited for your hair type with good ingredient safety and positive reviews.',
      }));
    }
  }

  /**
   * Generate mock explanations (fallback)
   */
  private generateMockExplanations(products: ProductScore[], limit: number): ProductScore[] {
    const explanations = [
      'This product is well-suited for your hair type with good ingredient safety and positive reviews.',
      'A solid choice that matches your preferences, though slightly above your budget range.',
      'Highly rated by users with similar hair concerns. The ingredients are generally safe.',
      'Good value for money with sustainable packaging and cruelty-free certification.',
      'Effective product with strong tag matches, though some users report minor issues.',
    ];

    return products.slice(0, limit).map((p, i) => ({
      ...p,
      aiScore: p.deterministicScore + (Math.random() * 10 - 5),
      aiExplanation: explanations[i % explanations.length],
      finalRank: i + 1,
    }));
  }
}

// Export singleton instance
export const openAIService = new ClientOpenAIService();

