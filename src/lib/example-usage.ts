/**
 * Example usage of the OpenAI-powered recommendation system
 * This shows how to use the client-side recommendation function
 */

import { generateRecommendations, UserQuizAnswers } from './recommendations';

/**
 * Example: Generate recommendations after user completes quiz
 */
export async function exampleUsage() {
  // Example quiz answers from user
  const quizAnswers: UserQuizAnswers = {
    hairType: 'curly',
    porosity: 'high',
    waterType: 'hard',
    concerns: ['frizz', 'dryness', 'damage'],
    preferences: {
      vegan: true,
      crueltyFree: true,
      organic: false,
      fragranceFree: false,
    },
    allergens: ['sulfates'],
    budget: 'medium',
  };

  try {
    // Generate recommendations with AI explanations
    const result = await generateRecommendations(quizAnswers, 'user123');

    console.log(`Found ${result.recommendations.length} recommendations`);
    console.log(`Processing time: ${result.metadata.processingTimeMs}ms`);

    // Display recommendations with AI explanations
    result.recommendations.forEach((rec, index) => {
      console.log(`\n${index + 1}. ${rec.product.brand} ${rec.product.name}`);
      console.log(`   Score: ${rec.deterministicScore.toFixed(1)}/100`);
      if (rec.aiScore) {
        console.log(`   AI Score: ${rec.aiScore.toFixed(1)}/100`);
      }
      if (rec.aiExplanation) {
        console.log(`   AI Explanation: ${rec.aiExplanation}`);
      }
      console.log(`   Tag Match: ${rec.scoreBreakdown.tagMatch.toFixed(1)}/100`);
      console.log(`   Sustainability: ${rec.scoreBreakdown.sustainability.toFixed(1)}/100`);
      console.log(`   Ingredient Safety: ${rec.scoreBreakdown.ingredientSafety.toFixed(1)}/100`);
    });

    return result;
  } catch (error: any) {
    console.error('Error generating recommendations:', error);
    throw error;
  }
}

/**
 * Example: Use in a React component
 */
export function ExampleReactComponent() {
  // This is just a type example - implement in your actual component
  const handleGetRecommendations = async () => {
    const quizAnswers: UserQuizAnswers = {
      hairType: 'curly',
      porosity: 'high',
      waterType: 'hard',
      concerns: ['frizz'],
      preferences: {
        vegan: true,
      },
    };

    try {
      const result = await generateRecommendations(quizAnswers);
      // Use result.recommendations in your UI
      return result;
    } catch (error) {
      console.error('Failed to get recommendations:', error);
    }
  };

  return null; // Placeholder
}

