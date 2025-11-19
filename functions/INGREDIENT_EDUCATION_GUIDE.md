# AI-Generated Ingredient Education System

## Overview

The ingredient education system provides **simple, accurate, science-based** explanations about hair care ingredients **without fear-mongering**. It uses AI (Claude/OpenAI) to generate educational content that helps users understand what ingredients do for their hair.

## Key Principles

### 1. Simple Definitions
- Uses everyday language, not complex scientific jargon
- Explains what ingredients DO for hair in plain terms
- Focuses on practical benefits users can understand

### 2. Avoid Fear-Mongering
- **DO NOT** exaggerate risks or use alarmist language
- Present information in a balanced, educational manner
- If there are concerns, mention them factually without alarm
- Focus on what ingredients DO, not what they might do wrong

### 3. Accurate Science
- Science-based explanations
- Factual information about ingredient properties
- References to safety data when relevant
- Balanced presentation of benefits and considerations

## Implementation

### AI Prompt Guidelines

The AI system prompt includes explicit instructions:

```
You are a hair care educator and cosmetic chemist. Your role is to provide 
simple, accurate, science-based explanations about hair care ingredients. 
Always use plain language, avoid fear-mongering, and present information 
in a balanced, educational manner. Focus on what ingredients DO for hair, 
not what they might do wrong. If there are legitimate concerns, mention 
them factually without exaggeration.
```

### Example Good Explanations

**✅ Good (Educational, Balanced):**
- "Glycerin is a humectant that draws moisture into hair, keeping it hydrated and soft. It's generally safe for most hair types, though some people with very sensitive scalps may want to patch test first."
- "Silicone creates a protective barrier on hair, reducing frizz and adding smoothness. Some types can build up over time, but are generally safe and effective."
- "Sulfate is a cleansing agent that effectively removes dirt and oil. Can be drying for some hair types, especially curly or color-treated hair."

**❌ Bad (Fear-Mongering):**
- "Sulfates are TOXIC and will DESTROY your hair!"
- "Parabens cause CANCER - avoid at all costs!"
- "This ingredient is DANGEROUS and should NEVER be used!"

### Fallback Explanations

For common ingredients, we have pre-written educational explanations that follow the same principles:

- **Water**: "The base of most hair products, helps distribute other ingredients evenly throughout your hair."
- **Glycerin**: "A humectant that draws moisture into hair, keeping it hydrated and soft. Generally safe for most hair types."
- **Coconut Oil**: "Deeply moisturizes and nourishes hair, especially beneficial for curly and dry hair types. Helps reduce protein loss."
- **Silicone**: "Creates a protective barrier on hair, reducing frizz and adding smoothness. Some types can build up over time, but are generally safe."
- **Sulfate**: "Cleansing agent that effectively removes dirt and oil. Can be drying for some hair types, especially curly or color-treated hair."

## Usage

### In Firebase Functions

```typescript
import { IngredientAnalyzer } from './utils/ingredientAnalyzer';

const analyzer = new IngredientAnalyzer();

// Analyze a single ingredient
const analysis = await analyzer.analyzeIngredient(
  'glycerin',
  'Hydrating Shampoo',
  'EcoHair'
);

// Returns:
// {
//   name: 'glycerin',
//   aiExplanation: 'A humectant that draws moisture into hair...',
//   safetyLevel: 'safe',
//   whatItDoes: 'A humectant that draws moisture into hair...',
//   sensitiveScalpSafe: true
// }
```

### In Product Details

When `getProductDetails` is called, it automatically:
1. Analyzes all ingredients with AI
2. Generates simple, educational explanations
3. Determines safety levels
4. Flags allergens
5. Provides "what it does" summaries

## Response Format

Each ingredient explanation includes:

- **aiExplanation**: Full 2-3 sentence explanation
- **whatItDoes**: One-sentence summary
- **safetyLevel**: 'safe' | 'caution' | 'avoid'
- **allergenFlag**: Boolean indicating if it's a known allergen
- **sensitiveScalpSafe**: Boolean indicating if safe for sensitive scalps

## Best Practices

1. **Always use AI when available** - Provides more nuanced, contextual explanations
2. **Fallback gracefully** - Use simple explanations if AI fails
3. **Cache results** - Avoid repeated AI calls for same ingredients
4. **Batch processing** - Analyze multiple ingredients in parallel (limit to 5 at a time)
5. **Limit to top 20 ingredients** - For performance, only analyze first 20 ingredients

## Testing

To test ingredient explanations:

```typescript
// Test with common ingredients
const testIngredients = ['glycerin', 'sulfate', 'silicone', 'coconut oil'];

for (const ing of testIngredients) {
  const analysis = await analyzer.analyzeIngredient(ing);
  console.log(`${ing}: ${analysis.aiExplanation}`);
}
```

## Configuration

Set OpenAI API key in environment variables:
```bash
firebase functions:config:set openai.api_key="your-key"
firebase functions:config:set openai.model="gpt-3.5-turbo"
```

Or use environment variables:
- `OPENAI_API_KEY`
- `AI_MODEL`

## Notes

- Temperature set to 0.5 for more consistent, factual responses
- Max tokens: 200 (keeps explanations concise)
- System prompt emphasizes educational, non-alarmist tone
- All explanations are cleaned to remove markdown/formatting

