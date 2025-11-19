# Client-Side OpenAI Setup

## ✅ Setup Complete!

Your OpenAI API key has been added to `.env` file:
- `REACT_APP_OPENAI_API_KEY` - Your OpenAI API key
- `REACT_APP_AI_MODEL` - Set to `gpt-3.5-turbo` (cost-efficient)

## How It Works

The system now uses OpenAI **directly from the client-side** (no Firebase Functions needed):

1. **Product Scoring** - Products are scored using deterministic rules
2. **AI Re-ranking** - OpenAI GPT-3.5-turbo re-ranks top products
3. **AI Explanations** - Generates personalized explanations for each recommendation

## Usage

```typescript
import { generateRecommendations } from '@/lib/recommendations';

const result = await generateRecommendations({
  hairType: 'curly',
  porosity: 'high',
  waterType: 'hard',
  concerns: ['frizz', 'dryness'],
  preferences: {
    vegan: true,
    crueltyFree: true,
  },
}, userId);

// result.recommendations contains products with AI explanations
result.recommendations.forEach(rec => {
  console.log(rec.product.name);
  console.log(rec.aiExplanation); // AI-generated explanation
  console.log(rec.aiScore); // AI re-ranked score
});
```

## Security Warning ⚠️

**Important**: API keys in client-side code can be exposed in the browser. 

For production:
- Use environment variables (already done ✅)
- Consider using a backend proxy
- Monitor API usage in OpenAI dashboard
- Set usage limits in OpenAI account

## Cost

- **GPT-3.5-turbo**: ~$0.002-0.003 per request
- **1000 requests/month**: ~$2-3

## Next Steps

1. **Restart your dev server** to load the new environment variables:
   ```bash
   npm start
   ```

2. **Implement product fetching** - Update `generateRecommendations()` in `src/lib/recommendations.ts` to fetch actual products from your APIs

3. **Test the AI integration** - The OpenAI service will automatically be used when you call `generateRecommendations()`

## Troubleshooting

### "No API key found" warning
- Check `.env` file has `REACT_APP_OPENAI_API_KEY`
- Restart dev server after adding to `.env`
- Make sure variable starts with `REACT_APP_`

### API errors
- Check your OpenAI account has credits
- Verify the API key is valid
- Check rate limits (free tier: 3 requests/minute)

### Slow responses
- GPT-3.5-turbo is fast (~2-5 seconds)
- Responses are cached to reduce API calls

