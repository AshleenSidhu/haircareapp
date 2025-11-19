/**
 * AI Aggregator for re-ranking products and generating explanations
 * Uses OpenAI GPT-4 or GPT-3.5-turbo for product recommendations
 */

import * as functions from 'firebase-functions';
import { ProductScore } from '../types';
import { cache } from '../utils/cache';

// OpenAI API configuration
// Set these in Firebase Functions config or environment variables:
// firebase functions:config:set openai.api_key="your-key-here"
// firebase functions:config:set openai.model="gpt-4" or "gpt-3.5-turbo"
// Or use environment variables: OPENAI_API_KEY and AI_MODEL
const AI_API_KEY = process.env.OPENAI_API_KEY || functions.config().openai?.api_key || '';
const AI_API_URL = 'https://api.openai.com/v1/chat/completions';
// Default to GPT-3.5-turbo for cost efficiency, can be upgraded to GPT-4
const AI_MODEL = process.env.AI_MODEL || functions.config().openai?.model || 'gpt-3.5-turbo';

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
  private async callAIService(products: ProductScore[]): Promise<Array<{ productId: string; score: number; explanation: string }>> {
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
              content: 'You are a professional hair care expert with deep knowledge of ingredients, product formulations, and hair science. Provide accurate, helpful recommendations based on data-driven analysis.',
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

    return `You are a hair care expert analyzing products for personalized recommendations.

Analyze these ${products.length} hair care products and:
1. Re-rank them based on overall quality, user needs, value, and effectiveness
2. Provide a clear, helpful explanation (1-2 sentences) for each product explaining why it's recommended or not recommended

Consider:
- How well the product matches the user's hair type and concerns
- Ingredient safety and potential allergens
- Sustainability and ethical practices
- Value for money
- User reviews and sentiment

Products:
${productSummaries}

IMPORTANT: Return ONLY a valid JSON array in this exact format (no markdown, no code blocks, just the JSON):
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

Rank products from best (highest score) to worst (lowest score). Scores should be between 0-100.`.trim();
  }

  /**
   * Parse OpenAI API response
   */
  private parseAIResponse(data: any, products: ProductScore[]): Array<{ productId: string; score: number; explanation: string }> {
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
      return results.map(item => ({
        productId: item.productId || item.id || '',
        score: typeof item.score === 'number' ? Math.max(0, Math.min(100, item.score)) : 50,
        explanation: item.explanation || item.reason || 'No explanation provided',
      })).filter(item => item.productId); // Filter out invalid entries

    } catch (error: any) {
      console.error('[AIAggregator] Error parsing AI response:', error.message);
      console.error('[AIAggregator] Response data:', JSON.stringify(data).substring(0, 500));
      // Fallback to mock
      return this.generateMockExplanations(products);
    }
  }

  /**
   * Generate mock explanations (for development/testing)
   */
  private generateMockExplanations(products: ProductScore[]): Array<{ productId: string; score: number; explanation: string }> {
    return products.map((p, i) => {
      const explanations = [
        `This product is well-suited for your hair type with good ingredient safety and positive reviews.`,
        `A solid choice that matches your preferences, though slightly above your budget range.`,
        `Highly rated by users with similar hair concerns. The ingredients are generally safe.`,
        `Good value for money with sustainable packaging and cruelty-free certification.`,
        `Effective product with strong tag matches, though some users report minor issues.`,
      ];

      return {
        productId: p.product.id,
        score: p.deterministicScore + (Math.random() * 10 - 5), // Slight variation
        explanation: explanations[i % explanations.length],
      };
    });
  }
}

