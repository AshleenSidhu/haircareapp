# Quick Start: Google CSE Product Discovery

## Your Credentials

- **API Key**: `AIzaSyDVVoE_IY-C-xMLpdPEWf6VwMxWVokKSSk`
- **CSE ID**: `b5cfc2f96eab4461a`

## Setup (2 minutes)

```bash
# 1. Set environment variables
firebase functions:config:set google.api_key="AIzaSyDVVoE_IY-C-xMLpdPEWf6VwMxWVokKSSk" google.cse_id="b5cfc2f96eab4461a"

# 2. Install dependencies
cd functions
npm install

# 3. Deploy
npm run build
firebase deploy --only functions:discoverProductsWithGoogleCSE
```

## Use It

```typescript
import { getFunctions, httpsCallable } from 'firebase/functions';

const functions = getFunctions();
const discover = httpsCallable(functions, 'discoverProductsWithGoogleCSE');

const result = await discover({ maxResults: 50 });
console.log(result.data);
```

## What It Does

1. ✅ Searches Sephora and Ulta for product pages
2. ✅ Validates URLs against robots.txt
3. ✅ Filters to product page patterns only
4. ✅ Enqueues to `staged_products` collection
5. ✅ Returns JSON report with samples

## Output

```json
{
  "summary": {
    "new_urls_enqueued": 38,
    "skipped": 15,
    "errors": 0
  },
  "enqueued": [ /* 10 sample products */ ]
}
```

See `GOOGLE_CSE_DISCOVERY_README.md` for full documentation.

