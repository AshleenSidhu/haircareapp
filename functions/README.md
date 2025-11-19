# Hair-Care Product Recommendation Cloud Functions

Firebase Cloud Functions backend for generating personalized hair-care product recommendations.

## Architecture

```
User App → Firebase Auth → Cloud Function: generateRecommendations
                                    ↓
                    ┌───────────────┴───────────────┐
                    ↓                               ↓
            Product Adapters              Enrichment Adapters
    (OpenBeautyFacts, BeautyFeeds)    (Ingredients, Reviews)
                    ↓                               ↓
                    └───────────────┬───────────────┘
                                    ↓
                            Deduplication
                                    ↓
                            Scoring Engine
                                    ↓
                            AI Aggregator
                                    ↓
                            Firestore Storage
```

## Setup

1. Install dependencies:
```bash
cd functions
npm install
```

2. Configure environment variables:
Create a `.env` file or set in Firebase:
- `OPENAI_API_KEY` or `CLAUDE_API_KEY` (optional, for AI explanations)
- `AI_MODEL` (default: gpt-4)
- `AI_API_URL` (default: OpenAI endpoint)

3. Build:
```bash
npm run build
```

4. Deploy:
```bash
npm run deploy
```

## API Adapters

### OpenBeautyFactsAdapter
- Searches Open Beauty Facts database
- Free, open-source product database
- No API key required

### BeautyFeedsAdapter
- API Key: `f6b8e2e95439818289c2b0acbfb90b12d82210a8`
- Update `BEAUTYFEEDS_BASE_URL` with actual endpoint

### IngredientAdapter
- Analyzes ingredient safety
- Integrates with Cosmethics/INCI databases
- Includes local knowledge base for common ingredients

### GoogleReviewsAdapter
- Fetches product reviews and sentiment
- Placeholder for Google Reviews API integration

## Scoring System

Deterministic scoring weights:
- Tag Match: 35%
- Sustainability: 25%
- Ingredient Safety: 20%
- Review Sentiment: 15%
- Price Match: 5%

## Usage

Call from client:
```javascript
const generateRecommendations = firebase.functions().httpsCallable('generateRecommendations');

const result = await generateRecommendations({
  userId: user.uid,
  quizAnswers: {
    hairType: 'curly',
    porosity: 'high',
    waterType: 'hard',
    concerns: ['frizz', 'dryness'],
    preferences: {
      vegan: true,
      crueltyFree: true,
    },
  },
});
```

## Caching

- Products: 1 hour
- Ingredients: 24 hours
- Reviews: 30 minutes
- AI Explanations: 2 hours

## Extending

1. **Add new product source**: Create adapter in `adapters/`
2. **Modify scoring**: Update `ScoringEngine.ts` weights
3. **Change AI provider**: Update `AIAggregator.ts`
4. **Add filters**: Modify `ScoringEngine.isBlacklisted()`

## Testing

Use Firebase Emulator:
```bash
npm run serve
```

## Notes

- All adapters include fallback/mock data for development
- API endpoints are placeholders - update with actual URLs
- AI integration is optional but recommended for best results

