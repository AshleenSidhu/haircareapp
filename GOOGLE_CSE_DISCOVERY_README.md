# Google Custom Search Engine (CSE) Product Discovery

## Overview

This system uses Google Custom Search API to discover product pages from Sephora and Ulta, validates them against robots.txt, and enqueues valid URLs to a staging queue for later scraping.

## Setup

### 1. Environment Variables

Set the following environment variables in Firebase Functions:

```bash
# Set Google API credentials
firebase functions:config:set google.api_key="YOUR_GOOGLE_API_KEY"
firebase functions:config:set google.cse_id="YOUR_CSE_ID"

# Or use Secret Manager (recommended for production)
firebase functions:secrets:set GOOGLE_API_KEY
firebase functions:secrets:set GOOGLE_CSE_ID
```

### 2. Google Custom Search Engine Setup

1. Go to [Google Custom Search](https://programmablesearchengine.google.com/)
2. Create a new search engine
3. Add sites to search:
   - `sephora.com/*`
   - `ulta.com/*`
4. Get your Search Engine ID (CSE ID)
5. Enable Custom Search JSON API in [Google Cloud Console](https://console.cloud.google.com/apis/library/customsearch.googleapis.com)

### 3. Deploy Functions

```bash
cd functions
npm install
npm run build
firebase deploy --only functions:discoverProductsWithGoogleCSE
```

## Usage

### Call the Function

```typescript
import { getFunctions, httpsCallable } from 'firebase/functions';

const functions = getFunctions();
const discoverProducts = httpsCallable(functions, 'discoverProductsWithGoogleCSE');

const result = await discoverProducts({
  maxResults: 50, // Optional: max URLs to enqueue (default: 50)
  domains: ['sephora.com', 'ulta.com'], // Optional: domains to search
});

console.log('Report:', result.data);
```

### Response Format

```json
{
  "summary": {
    "total_queries": 10,
    "new_urls_enqueued": 45,
    "skipped": 12,
    "errors": 0,
    "domains_checked": ["sephora.com", "ulta.com"]
  },
  "enqueued": [
    {
      "url": "https://www.sephora.com/product/...",
      "source_domain": "sephora.com",
      "discovered_by": "google_cse",
      "discovered_at": "2024-01-15T10:30:00Z",
      "raw_search_snippet": "Product description...",
      "title": "Product Name",
      "confidence_score": 0.9,
      "status": "pending",
      "query_used": "site:sephora.com \"ingredients\" \"product\""
    }
  ],
  "skipped_samples": [
    {
      "url": "https://www.sephora.com/...",
      "reason": "Not a product page URL pattern",
      "snippet": "..."
    }
  ],
  "errors": []
}
```

## How It Works

### 1. Search Queries

The system generates multiple search queries:
- `site:sephora.com "ingredients" "product"`
- `site:ulta.com "hair care" "ingredients"`
- Brand-specific queries for popular brands

### 2. URL Filtering

Only URLs matching product page patterns are considered:
- **Sephora**: `/product/`, `/p/`, or contains product ID pattern
- **Ulta**: `/product/`, `/p/`, or contains product ID pattern

### 3. Robots.txt Validation

For each candidate URL:
1. Fetches `robots.txt` from the domain
2. Parses rules for the user agent
3. Checks if the specific path is allowed
4. Caches robots.txt for 24 hours

### 4. Deduplication

Checks if URL already exists in `staged_products` collection before enqueueing.

### 5. Enqueueing

Valid URLs are added to `staged_products` collection with:
- URL and metadata
- Confidence score (0.0-1.0)
- Status: `pending`
- Discovery timestamp

## Staged Products Collection

### Firestore Schema

```
staged_products/{docId}
  - url: string
  - source_domain: string
  - discovered_by: "google_cse"
  - discovered_at: Timestamp
  - raw_search_snippet?: string
  - title?: string
  - confidence_score: number (0.0-1.0)
  - status: "pending" | "processing" | "completed" | "failed"
  - query_used?: string
  - error_message?: string
  - scraped_at?: Timestamp
  - product_id?: string
```

### Querying Staged Products

```typescript
// Get pending products
const pending = await db
  .collection('staged_products')
  .where('status', '==', 'pending')
  .orderBy('confidence_score', 'desc')
  .limit(10)
  .get();

// Get products by domain
const sephoraProducts = await db
  .collection('staged_products')
  .where('source_domain', '==', 'sephora.com')
  .where('status', '==', 'pending')
  .get();
```

## Rate Limiting

- **Google CSE API**: 100 requests/day (free tier)
- **Function**: 100ms delay between requests
- **Caching**: Search results cached for 24 hours
- **Robots.txt**: Cached per domain for 24 hours

## Cost Considerations

- **Google CSE API**: Free tier allows 100 queries/day
- **Firestore**: ~$0.06 per 100K reads, $0.18 per 100K writes
- **Function Execution**: ~$0.40 per million invocations

## Security

- ✅ API keys stored in environment variables (never in code)
- ✅ Authentication required to call function
- ✅ Robots.txt respected (ethical scraping)
- ✅ Rate limiting to avoid quota burn

## Next Steps

After discovery, implement a scraping function that:
1. Reads from `staged_products` collection
2. Scrapes product data from URLs
3. Extracts ingredients, images, prices
4. Stores in `products` collection
5. Updates `staged_products` status to `completed`

## Troubleshooting

### "Rate limit exceeded"
- Wait 24 hours for quota reset
- Reduce `maxResults` parameter
- Check cache is working (should reduce API calls)

### "No results found"
- Verify CSE includes the target sites
- Check search queries are valid
- Ensure sites are indexed by Google

### "Robots.txt disallowed"
- Some sites block scraping
- Check robots.txt manually: `https://domain.com/robots.txt`
- Consider contacting site owners for permission

## Example Output

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
      "url": "https://www.sephora.com/product/olaplex-no-3-hair-perfector-P421921",
      "source_domain": "sephora.com",
      "discovered_by": "google_cse",
      "title": "OLAPLEX No. 3 Hair Perfector",
      "confidence_score": 0.95,
      "status": "pending"
    }
  ]
}
```

