# OpenAI Setup Guide

This guide explains how to configure OpenAI GPT-4 or GPT-3.5-turbo for the recommendation system.

## Quick Setup

### Option 1: Using Firebase Functions Config (Recommended)

```bash
# Set your OpenAI API key
firebase functions:config:set openai.api_key="sk-your-api-key-here"

# Choose your model (gpt-4 or gpt-3.5-turbo)
firebase functions:config:set openai.model="gpt-3.5-turbo"

# Deploy to apply changes
firebase deploy --only functions
```

### Option 2: Using Environment Variables

In Firebase Console:
1. Go to Functions → Configuration
2. Add environment variable:
   - Name: `OPENAI_API_KEY`
   - Value: `sk-your-api-key-here`
3. Add environment variable:
   - Name: `AI_MODEL`
   - Value: `gpt-3.5-turbo` or `gpt-4`

## Getting Your OpenAI API Key

1. Go to https://platform.openai.com/api-keys
2. Sign in or create an account
3. Click "Create new secret key"
4. Copy the key (starts with `sk-`)
5. **Important**: Save it immediately - you won't be able to see it again!

## Model Comparison

### GPT-3.5-turbo (Recommended for Hackathons)
- **Cost**: ~$0.002 per 1K tokens (very affordable)
- **Speed**: Fast responses (~2-5 seconds)
- **Quality**: Good for product recommendations
- **Best for**: Development, testing, cost-sensitive projects

### GPT-4
- **Cost**: ~$0.03 per 1K tokens (15x more expensive)
- **Speed**: Slower responses (~5-15 seconds)
- **Quality**: Excellent, more nuanced explanations
- **Best for**: Production, when quality is critical

## Cost Estimation

For a typical recommendation request:
- **Input tokens**: ~500-800 tokens (product data)
- **Output tokens**: ~300-500 tokens (explanations)
- **Total**: ~800-1300 tokens per request

**Cost per request:**
- GPT-3.5-turbo: ~$0.002-0.003
- GPT-4: ~$0.03-0.04

**Monthly estimate (1000 requests):**
- GPT-3.5-turbo: ~$2-3
- GPT-4: ~$30-40

## Testing Without API Key

If no API key is configured, the system will:
- Use mock explanations (still functional)
- Skip AI re-ranking (uses deterministic scores only)
- Log a warning but continue processing

This allows development and testing without API costs.

## Troubleshooting

### "No AI API key configured" warning
- Check that you've set the config: `firebase functions:config:get`
- Verify the key starts with `sk-`
- Redeploy functions after setting config

### API errors
- Check your OpenAI account has credits
- Verify the API key is valid
- Check rate limits (free tier: 3 requests/minute)

### Slow responses
- GPT-4 is slower than GPT-3.5-turbo
- Consider using GPT-3.5-turbo for faster responses
- Responses are cached for 2 hours to reduce API calls

## Security Notes

- **Never commit API keys to Git**
- Use Firebase Functions config or environment variables
- Rotate keys if exposed
- Monitor usage in OpenAI dashboard

## Example Usage

Once configured, the AI will automatically:
1. Re-rank top products based on context
2. Generate personalized explanations
3. Consider user preferences and concerns

Example explanation:
> "This sulfate-free shampoo is ideal for your curly, high-porosity hair. It contains hydrating ingredients that address your dryness concerns, and the cruelty-free formulation aligns with your preferences. Users with similar hair types report excellent results."

