# Developer Checklist - Product API Integration

## ✅ Pre-Implementation Checklist

### 1. Backend Base URL
- [ ] **CRITICAL:** Provide actual `BACKEND_BASE_URL` 
  - Current placeholder: `https://api.example.com`
  - Format: `https://REGION-PROJECT_ID.cloudfunctions.net`
  - Update `.env` file with: `VITE_API_BASE_URL=your-actual-url`

### 2. Current Product Data Source
- [ ] Confirm how product page currently fetches data:
  - [ ] Direct Firestore (`fetchProducts` from `src/lib/utils/products.ts`)
  - [ ] Firebase Functions callable (`getProductDetails` from `src/lib/firebase.ts`)
  - [ ] Local JSON/mock data
  - [ ] Other: _______________

### 3. Database Schema Verification
- [ ] Verify `products` collection exists in Firestore
- [ ] Verify `ingredient_science` collection exists in Firestore
- [ ] Confirm document structure matches schema in `IMPLEMENTATION_NOTES.md`

### 4. CosIng Data
- [ ] CosIng data seeded in `ingredient_science` collection
- [ ] Document IDs are normalized (lowercase, trimmed)
- [ ] Test lookup: `db.collection('ingredient_science').doc('glycerin').get()`

### 5. Products Synced
- [ ] Products synced from Open Beauty Facts
- [ ] Products have `normalized_ingredients` field
- [ ] Products have `ingredient_science` array populated
- [ ] Test: Check a product document in Firestore

---

## 🚀 Implementation Steps

### Step 1: Environment Setup
```bash
# 1. Update .env file
VITE_API_BASE_URL=https://your-actual-functions-url.cloudfunctions.net

# 2. Set Firebase Functions config (optional, for Unsplash)
firebase functions:config:set unsplash.key="your_key"
```

### Step 2: Deploy Functions
```bash
cd functions
npm install
npm run build
firebase deploy --only functions
```

### Step 3: Verify Endpoints
Test each endpoint:
```bash
# Products list
curl "https://your-url.cloudfunctions.net/apiProducts?category=hair-care&limit=10"

# Single product
curl "https://your-url.cloudfunctions.net/apiProductById?product_id=YOUR_PRODUCT_ID"

# Ingredient
curl "https://your-url.cloudfunctions.net/apiIngredient?normalized_inci=glycerin"

# Placeholder
curl "https://your-url.cloudfunctions.net/getHaircarePlaceholder"
```

### Step 4: Update ProductPage
- [ ] If using direct Firestore: Update `ProductPage.tsx` to use new API
- [ ] If using callable functions: Migrate to HTTP endpoints
- [ ] Test product page loads correctly
- [ ] Verify compatibility score displays

### Step 5: Test Compatibility Scoring
- [ ] Save user profile in localStorage (from quiz)
- [ ] Load product page with user profile
- [ ] Verify server calculates compatibility score
- [ ] Check Network tab for `compatibility_score` in response

---

## 🔍 Verification Tests

### Test 1: Product Data Structure
```typescript
// In browser console on product page
const product = await fetch(`${API_BASE}/api/products/YOUR_PRODUCT_ID`);
const data = await product.json();
console.log('Has product_profile:', !!data.product_profile);
console.log('Has ingredient_science:', !!data.ingredient_science);
console.log('Has compatibility_score:', !!data.compatibility_score);
```

### Test 2: Ingredient Science
```typescript
// Test ingredient lookup
const ing = await fetch(`${API_BASE}/api/ingredients/glycerin`);
const data = await ing.json();
console.log('Ingredient data:', data);
```

### Test 3: Compatibility Scoring
```typescript
// Test with user profile
const url = `${API_BASE}/api/products/YOUR_PRODUCT_ID?user_profile=${encodeURIComponent(JSON.stringify({
  hairType: 'curly',
  porosity: 'high',
  scalpSensitive: false,
  concerns: ['frizz']
}))}`;
const product = await fetch(url);
const data = await product.json();
console.log('Compatibility score:', data.compatibility_score);
```

---

## ⚠️ Important Notes

### Rate Limits
- **Open Beauty Facts:** ~10 requests/second
- **For mass syncs:** Use bulk dumps instead of API
- **Add delays** between requests in production

### Server-Side Scoring
- ✅ All compatibility scoring is done **server-side**
- ✅ Client sends user profile as query parameter
- ✅ Server returns calculated score
- ✅ Keeps client fast and consistent

### Database Collections
- ✅ `products` - Product data from Open Beauty Facts
- ✅ `ingredient_science` - CosIng ingredient data
- ✅ Both collections must exist and be populated

---

## 🐛 Common Issues

### Issue: "Product not found"
- **Check:** Product exists in Firestore `products` collection
- **Check:** Product ID matches document ID or barcode
- **Fix:** Sync products using `syncProducts` function

### Issue: "Ingredient science missing"
- **Check:** CosIng data seeded in `ingredient_science` collection
- **Check:** Ingredient names normalized correctly
- **Fix:** Run migration script: `runCosIngMigration()`

### Issue: "Compatibility score not showing"
- **Check:** User profile saved in localStorage
- **Check:** User profile sent as query parameter
- **Check:** Server calculates score (check Network tab)
- **Fix:** Verify user profile format matches expected schema

### Issue: "CORS errors"
- **Check:** Functions have `cors: true` in configuration
- **Check:** Firebase Hosting rewrites configured correctly
- **Fix:** Update function CORS settings

---

## 📞 Questions to Answer

1. **What is your actual Firebase Functions base URL?**
   - Format: `https://REGION-PROJECT_ID.cloudfunctions.net`

2. **How does the product page currently fetch data?**
   - Direct Firestore?
   - Firebase Functions callable?
   - Local JSON?

3. **Are products already synced?**
   - If yes, verify structure matches new schema
   - If no, run `syncProducts` function

4. **Is CosIng data seeded?**
   - If yes, verify document structure
   - If no, run migration script

---

## ✅ Final Checklist

Before marking as complete:
- [ ] Backend base URL configured
- [ ] Functions deployed and tested
- [ ] Products synced and verified
- [ ] CosIng data seeded and verified
- [ ] ProductPage updated and tested
- [ ] Compatibility scoring working
- [ ] All endpoints tested
- [ ] Error handling verified
- [ ] Rate limiting considered for production

---

**Once all items are checked, the integration is complete!** 🎉

