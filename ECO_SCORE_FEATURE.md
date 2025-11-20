# Eco Score Feature - Implementation Summary

## Overview

The Eco Score feature provides a comprehensive sustainability rating (0-100) for hair care products with detailed reasoning, positive/negative factors, and recommendations.

## Features

### 1. Eco Score Calculation (0-100)

The score is calculated based on multiple factors:

**Positive Factors (+points)**:
- Natural/organic ingredients: +2 points per ingredient (max +20)
- Eco-friendly certification: +10 points
- Organic certification: +15 points
- Cruelty-free certification: +10 points
- Vegan certification: +5 points
- Recyclable packaging: +10 points
- Plant-based formulation: +8 points
- Fair-trade/ethical sourcing: +10 points
- Local/small-batch production: +5 points
- Biodegradable formulation: +8 points
- Water-based formulation: +3 points

**Negative Factors (-points)**:
- Harmful chemicals (sulfates, parabens, etc.): -8 points each (max -30)
- Synthetic preservatives: -5 points each (max -15)
- Microplastics: -20 points

### 2. Letter Grade System

- **A+**: 90-100 (Excellent)
- **A**: 85-89 (Very Good)
- **B+**: 80-84 (Good)
- **B**: 70-79 (Above Average)
- **C+**: 60-69 (Average)
- **C**: 50-59 (Below Average)
- **D**: 40-49 (Poor)
- **F**: 0-39 (Very Poor)

### 3. Detailed Reasoning

The system provides:
- **Score Breakdown**: Step-by-step explanation of how the score was calculated
- **Positive Factors**: List of eco-friendly attributes
- **Negative Factors**: List of concerns or harmful ingredients
- **Recommendations**: Suggestions for improvement or alternatives

## Implementation

### Backend (`functions/src/utils/ecoScoreCalculator.ts`)

```typescript
import { EcoScoreCalculator } from './utils/ecoScoreCalculator';

const calculator = new EcoScoreCalculator();
const result = calculator.calculateEcoScore(product);

// Returns:
// {
//   score: 75,
//   grade: 'B',
//   reasoning: ['Added 15 points for organic certification', ...],
//   positiveFactors: ['Organic certified', 'Cruelty-free', ...],
//   negativeFactors: ['Contains 2 potentially harmful chemicals', ...],
//   recommendations: ['Consider products with recyclable packaging', ...]
// }
```

### Product Sync Integration

The eco score is automatically calculated during product sync in `functions/src/productSync.ts`:

```typescript
const ecoScoreResult = ecoScoreCalculator.calculateEcoScore(productForEcoScore);
productData = {
  ...productData,
  eco_score: ecoScoreResult.score,
  eco_grade: ecoScoreResult.grade,
  eco_reasoning: ecoScoreResult.reasoning,
  eco_positive_factors: ecoScoreResult.positiveFactors,
  eco_negative_factors: ecoScoreResult.negativeFactors,
  eco_recommendations: ecoScoreResult.recommendations,
};
```

### Frontend Component (`src/components/EcoScoreBadge.tsx`)

Displays the eco score with:
- Large score display (0-100) with color coding
- Letter grade badge
- Collapsible details showing:
  - Positive factors (green checkmarks)
  - Negative factors (red X marks)
  - Score breakdown (blue info icons)
  - Recommendations (yellow lightbulb icons)

### Product Page Integration

The `EcoScoreBadge` component is automatically displayed on the product page after the compatibility score:

```tsx
<EcoScoreBadge
  ecoScore={product.eco_score}
  ecoGrade={product.eco_grade}
  ecoReasoning={product.eco_reasoning}
  ecoPositiveFactors={product.eco_positive_factors}
  ecoNegativeFactors={product.eco_negative_factors}
  ecoRecommendations={product.eco_recommendations}
/>
```

## Data Schema

### Firestore Product Document

```typescript
{
  product_id: string;
  name: string;
  brand: string;
  // ... other fields ...
  eco_score: number; // 0-100
  eco_grade: 'A+' | 'A' | 'B+' | 'B' | 'C+' | 'C' | 'D' | 'F';
  eco_reasoning: string[]; // Score breakdown explanations
  eco_positive_factors: string[]; // List of positive attributes
  eco_negative_factors: string[]; // List of concerns
  eco_recommendations: string[]; // Improvement suggestions
}
```

## Detection Logic

### Harmful Chemicals Detected

- Sulfates: sodium lauryl sulfate, sodium laureth sulfate, ammonium lauryl sulfate
- Parabens: methylparaben, propylparaben, butylparaben, ethylparaben
- Formaldehyde-releasing agents: DMDM hydantoin, imidazolidinyl urea, diazolidinyl urea
- Phthalates, triclosan, DEA/TEA compounds

### Natural Ingredients Detected

- Aloe, coconut, argan, jojoba, shea, avocado, olive
- Chamomile, lavender, rosemary, tea tree, eucalyptus
- Honey, beeswax, glycerin, vitamin E, vitamin C
- Botanical extracts and oils

### Microplastics Detected

- Polyethylene, polypropylene, polystyrene
- Nylon, polyester, acrylates

## Usage Examples

### High Score Product (A+)

```
Score: 95/100 (A+)
Positive Factors:
  • Organic certified
  • Cruelty-free (not tested on animals)
  • Recyclable or recycled packaging
  • Plant-based ingredients
  • Contains 8 natural/organic ingredient(s)
```

### Low Score Product (D)

```
Score: 35/100 (D)
Negative Factors:
  • Contains 3 potentially harmful chemical(s): sulfate, paraben, formaldehyde
  • Contains synthetic preservatives: methylparaben, propylparaben
Recommendations:
  • Consider products with organic or natural ingredient certifications
  • Look for cruelty-free and vegan options
  • Avoid products with sulfates, parabens, or formaldehyde-releasing agents
```

## Benefits

1. **Transparency**: Users can see exactly why a product received its score
2. **Education**: Helps users understand what makes a product sustainable
3. **Comparison**: Easy to compare products based on eco-friendliness
4. **Actionable**: Recommendations help users make better choices
5. **Automatic**: Calculated during product sync, no manual input required

## Future Enhancements

- Add carbon footprint calculation
- Include packaging material analysis
- Factor in shipping distance for local products
- Consider brand sustainability ratings
- Add third-party certification verification (Leaping Bunny, USDA Organic, etc.)

## Testing

To test the eco score calculation:

```typescript
// Test with a product
const testProduct = {
  id: 'test-1',
  name: 'Organic Shampoo',
  brand: 'EcoBrand',
  ingredients: ['water', 'coconut oil', 'aloe vera', 'sodium lauryl sulfate'],
  tags: ['organic', 'cruelty-free', 'vegan', 'recyclable'],
};

const calculator = new EcoScoreCalculator();
const result = calculator.calculateEcoScore(testProduct);
console.log('Eco Score:', result);
```

---

**Status**: ✅ Complete and Integrated

