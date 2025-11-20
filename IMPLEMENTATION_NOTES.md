# Implementation Notes for Developer

## 🔴 CRITICAL: Backend Base URL Configuration

**ACTION REQUIRED:** Please provide the actual `BACKEND_BASE_URL` for your Firebase Functions.

The current implementation uses:
```typescript
const API_BASE = import.meta.env.VITE_API_BASE_URL || 'https://api.example.com';
```

**Please update `.env` file with your actual Firebase Functions URL:**

```env
# Replace with your actual Firebase Functions base URL
# Format: https://REGION-PROJECT_ID.cloudfunctions.net
VITE_API_BASE_URL=https://northamerica-northeast1-your-project-id.cloudfunctions.net
```

**To find your Firebase Functions URL:**
1. Go to Firebase Console → Functions
2. Find your deployed function (e.g., `apiProducts`)
3. Copy the function URL
4. Remove the function name to get the base URL

**Example:**
- Function URL: `https://northamerica-northeast1-hair-care-ad421.cloudfunctions.net/apiProducts`
- Base URL: `https://northamerica-northeast1-hair-care-ad421.cloudfunctions.net`

---

## 📊 Database Schema

The implementation uses the following Firestore collections:

### 1. `products` Collection

**Document Structure:**
```typescript
{
  product_id: string;           // Document ID
  barcode: string;
  name: string;
  brand?: string;
  categories?: string[];          // e.g., ["Hair Care", "Shampoos"]
  ingredients_inci?: string;     // Raw INCI text
  ingredients_raw?: Array<{ text: string; id?: string }>;
  normalized_ingredients?: string[];  // Normalized INCI names
  ingredient_science?: Array<{        // CosIng data
    inci_name: string;
    functions?: string[];
    tags?: string[];
    safety_notes?: string;
    restrictions?: string;
    source_url?: string;
  }>;
  images?: {
    front?: string;
    ingredients?: string;
  };
  source: 'open_beauty_facts';
  last_modified_server?: number;
  last_synced_at?: Timestamp;
}
```

### 2. `ingredient_science` Collection

**Document ID:** Normalized INCI name (lowercase, trimmed)

**Document Structure:**
```typescript
{
  inci_name: string;              // Original INCI name (preserve case)
  cas_number?: string;
  ec_number?: string;
  functions: string[];           // e.g., ["humectant", "emollient"]
  restrictions?: string;
  safety_notes?: string;
  tags?: string[];               // e.g., ["hydration", "safe"]
  source_url?: string;
  last_updated: Timestamp;
}
```

**Important:** Document IDs must be normalized (lowercase, trimmed) for consistent lookups.

---

## ⚡ Server-Side Scoring (Heavy Computations)

**All compatibility scoring is done server-side** to keep the client fast.

### How It Works:

1. **Client sends user profile** as query parameter:
   ```
   GET /api/products/:id?user_profile={"hairType":"curly","porosity":"high",...}
   ```

2. **Server calculates:**
   - Product profile (moisture, protein, oil, irritant scores)
   - Compatibility score (0-100)
   - Explainable reasons

3. **Client receives:**
   ```json
   {
     "product_id": "...",
     "product_profile": { ... },
     "compatibility_score": {
       "score": 78,
       "explainers": ["Contains glycerin → increases moisture", ...]
     }
   }
   ```

### Benefits:
- ✅ Fast client-side rendering
- ✅ Consistent scoring logic
- ✅ Reduced client bundle size
- ✅ Better performance on mobile devices

---

## 🚦 Open Beauty Facts Rate Limits

**IMPORTANT:** Open Beauty Facts has rate limits. For mass syncs, prefer bulk dumps.

### Rate Limits:
- **API Calls:** ~10 requests/second (unofficial limit)
- **Bulk Dumps:** Recommended for >1000 products
- **Respect robots.txt:** https://world.openbeautyfacts.org/robots.txt

### Best Practices:

1. **For Initial Sync:**
   ```typescript
   // Use bulk dump instead of API
   // Download: https://world.openbeautyfacts.org/data/openbeautyfacts-products.jsonl.gz
   ```

2. **For Incremental Updates:**
   ```typescript
   // Use API with rate limiting
   // Add delays between requests
   await new Promise(resolve => setTimeout(resolve, 100)); // 100ms delay
   ```

3. **For Real-time Lookups:**
   ```typescript
   // Use cached Firestore data
   // Only call OBF API if product not in Firestore
   ```

### Implementation in `productSync.ts`:

The current `syncProducts` function:
- ✅ Fetches from OBF API
- ✅ Limits to 100 products per call
- ⚠️ **Consider adding rate limiting for production**

**Recommended Enhancement:**
```typescript
// Add rate limiting
const RATE_LIMIT_DELAY = 100; // ms between requests
for (const product of products) {
  await new Promise(resolve => setTimeout(resolve, RATE_LIMIT_DELAY));
  // Process product...
}
```

---

## 🔄 Current Product Data Source

**Question for Developer:** How does the product page currently fetch product data?

### Option A: Direct Firestore (Current Implementation)
- Uses `fetchProducts()` from `src/lib/utils/products.ts`
- Directly queries Firestore `products` collection
- **Action:** Update `ProductPage.tsx` to use new API endpoints OR keep Firestore direct access

### Option B: Firebase Functions (Callable)
- Uses `getProductDetails()` from `src/lib/firebase.ts`
- Calls Firebase callable function
- **Action:** Migrate to new HTTP endpoints or keep callable function

### Option C: Local JSON/Mock Data
- Uses mock data fallback
- **Action:** Replace with API endpoints

**Please confirm which approach you're using so we can:**
1. Update `ProductPage.tsx` accordingly
2. Ensure proper data flow
3. Maintain backward compatibility if needed

---

## 🔧 Migration Steps

### Step 1: Update Environment Variables
```bash
# .env file
VITE_API_BASE_URL=https://your-actual-functions-url.cloudfunctions.net
```

### Step 2: Deploy Functions
```bash
cd functions
npm run build
firebase deploy --only functions
```

### Step 3: Configure Firebase Hosting (Optional)
Copy `functions/firebase.json.example` to `firebase.json` and update with your project settings.

### Step 4: Seed CosIng Data
```bash
# Run migration script
firebase functions:shell
> const { runCosIngMigration } = require('./lib/migrations/seedCosIngData');
> runCosIngMigration('./data/cosing.json');
```

### Step 5: Sync Products
```bash
# Call syncProducts function from your app
# Or use Firebase Console → Functions → syncProducts
```

### Step 6: Update ProductPage Route
```typescript
// In your router
<Route path="/products/:productId" element={<ProductPage />} />
```

---

## 🐛 Troubleshooting

### Products Not Loading
- ✅ Check Firestore `products` collection exists
- ✅ Verify products are synced using `syncProducts`
- ✅ Check API_BASE_URL is correct
- ✅ Check browser console for CORS errors

### Compatibility Score Not Showing
- ✅ Ensure user profile is saved in localStorage
- ✅ Check user profile format matches expected schema
- ✅ Verify server is calculating score (check Network tab)

### Ingredient Science Missing
- ✅ Ensure CosIng data is seeded in `ingredient_science` collection
- ✅ Check ingredient names are normalized correctly
- ✅ Verify CosIng adapter is working

### Rate Limit Errors
- ✅ Add delays between OBF API calls
- ✅ Use bulk dumps for mass syncs
- ✅ Cache products in Firestore to reduce API calls

---

## 📝 Next Steps

1. **Provide BACKEND_BASE_URL** - Update `.env` file
2. **Confirm product data source** - Firestore, Functions, or JSON?
3. **Test API endpoints** - Verify all endpoints work
4. **Deploy functions** - Deploy to Firebase
5. **Seed CosIng data** - Run migration script
6. **Sync products** - Use `syncProducts` function
7. **Test ProductPage** - Verify compatibility scoring works

---

## 📞 Questions?

If you need clarification on any of these points, please ask:
- Backend base URL format
- Current product data fetching method
- Rate limiting strategy
- Database schema questions
- Migration timeline

