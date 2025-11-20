# Google Custom Search Engine Setup Guide

## Quick Setup

Your credentials have been provided:
- **API Key**: `AIzaSyDVVoE_IY-C-xMLpdPEWf6VwMxWVokKSSk`
- **CSE ID**: `b5cfc2f96eab4461a`

## Step 1: Set Environment Variables

### Option A: Firebase Functions Config (Recommended)

```bash
firebase functions:config:set google.api_key="AIzaSyDVVoE_IY-C-xMLpdPEWf6VwMxWVokKSSk"
firebase functions:config:set google.cse_id="b5cfc2f96eab4461a"
```

### Option B: Secret Manager (More Secure)

```bash
firebase functions:secrets:set GOOGLE_API_KEY
# Enter: AIzaSyDVVoE_IY-C-xMLpdPEWf6VwMxWVokKSSk

firebase functions:secrets:set GOOGLE_CSE_ID
# Enter: b5cfc2f96eab4461a
```

Then update the function to use secrets:
```typescript
const apiKey = process.env.GOOGLE_API_KEY;
const cseId = process.env.GOOGLE_CSE_ID;
```

## Step 2: Verify Custom Search Engine

1. Go to [Google Custom Search](https://programmablesearchengine.google.com/)
2. Verify your search engine (ID: `b5cfc2f96eab4461a`) includes:
   - `sephora.com/*`
   - `ulta.com/*`
3. Enable "Search the entire web" if you want broader results

## Step 3: Deploy Function

```bash
cd functions
npm install
npm run build
firebase deploy --only functions:discoverProductsWithGoogleCSE
```

## Step 4: Test the Function

### From Frontend:

```typescript
import { getFunctions, httpsCallable } from 'firebase/functions';

const functions = getFunctions();
const discoverProducts = httpsCallable(functions, 'discoverProductsWithGoogleCSE');

const result = await discoverProducts({
  maxResults: 50,
  domains: ['sephora.com', 'ulta.com'],
});

console.log('Discovery Report:', result.data);
```

### Expected Output:

```json
{
  "summary": {
    "total_queries": 12,
    "new_urls_enqueued": 38,
    "skipped": 15,
    "errors": 0,
    "domains_checked": ["sephora.com", "ulta.com"]
  },
  "enqueued": [
    {
      "url": "https://www.sephora.com/product/...",
      "source_domain": "sephora.com",
      "discovered_by": "google_cse",
      "confidence_score": 0.9,
      "status": "pending"
    }
  ]
}
```

## Rate Limits

- **Free Tier**: 100 queries/day
- **Function**: 100ms delay between requests
- **Caching**: Results cached for 24 hours

## Next Steps

After discovery, implement a scraper that:
1. Reads from `staged_products` collection
2. Scrapes product data from URLs
3. Extracts ingredients, images, prices
4. Stores in `products` collection

