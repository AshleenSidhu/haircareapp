# Troubleshooting: Products Not Displaying

## Quick Checks

### 1. Check Browser Console
Open browser DevTools (F12) and check the Console tab for:
- `[Products] Loaded X products from Firestore` - Good sign
- `[Products] No products returned from fetchProducts` - Products might not exist
- `[fetchProducts] Filtered X mock products` - Shows filtering is working
- Any Firestore permission errors

### 2. Check Firestore Database
1. Go to Firebase Console → Firestore Database
2. Check if `products` collection exists
3. Check if there are any documents in the collection
4. Open a product document and verify it has:
   - `name` or `title` field
   - `brand` field
   - `images.front` or `imageUrl` field
   - `source` field (should be `open_beauty_facts` or `openbeautyfacts`)

### 3. Check Product Schema
Products synced from Open Beauty Facts should have:
```javascript
{
  name: "Product Name",           // or title
  brand: "Brand Name",
  images: {
    front: "https://...",         // or imageUrl
    ingredients: "https://..."
  },
  source: "open_beauty_facts",   // or "openbeautyfacts"
  categories: ["Hair Care", ...],
  // ... other fields
}
```

### 4. Common Issues

#### Issue: Products exist but not displaying
**Possible causes:**
- Products are being filtered out (check console for "Filtered X mock products")
- Schema mismatch (products have `name` but code expects `title`)
- Brand is "Unknown" and products are filtered out

**Solution:**
- Check browser console logs
- Verify product schema matches expected format
- Products from Open Beauty Facts should have `source: "open_beauty_facts"`

#### Issue: No products in Firestore
**Solution:**
1. Sync products using the sync function:
   ```javascript
   // In browser console or from your app
   await syncProducts({
     tags: ['shampoo', 'conditioner', 'hair-care'],
     limit: 100
   });
   ```
2. Or use the "Sync Products" button on the Products page

#### Issue: Firestore Permission Errors
**Error:** `permission-denied` in console

**Solution:**
1. Deploy Firestore rules:
   ```bash
   firebase deploy --only firestore:rules
   ```
2. Or update rules in Firebase Console:
   - Go to Firestore → Rules
   - Add: `allow read: if true;` for products collection
   - Publish rules

#### Issue: Firestore Index Required
**Error:** `failed-precondition` in console

**Solution:**
1. Click the link in the error message to create the index
2. Or create index manually in Firebase Console:
   - Go to Firestore → Indexes
   - Create composite index for `products` collection
   - Fields: `createdAt` (Descending)

### 5. Debug Steps

#### Step 1: Check if products exist
```javascript
// In browser console
import { db } from './lib/firebase';
import { collection, getDocs } from 'firebase/firestore';

const productsRef = collection(db, 'products');
const snapshot = await getDocs(productsRef);
console.log('Total products:', snapshot.size);
snapshot.docs.forEach((doc, i) => {
  if (i < 3) {
    console.log(`Product ${i}:`, doc.id, doc.data());
  }
});
```

#### Step 2: Check product schema
```javascript
// In browser console
const firstProduct = snapshot.docs[0]?.data();
console.log('First product schema:', {
  hasName: !!firstProduct.name,
  hasTitle: !!firstProduct.title,
  hasBrand: !!firstProduct.brand,
  hasImageUrl: !!firstProduct.imageUrl,
  hasImages: !!firstProduct.images,
  source: firstProduct.source
});
```

#### Step 3: Test fetchProducts function
```javascript
// In browser console
import { fetchProducts } from './lib/utils/products';

const products = await fetchProducts(undefined, 10);
console.log('Fetched products:', products.length);
console.log('First product:', products[0]);
```

### 6. Fix Schema Mismatch

If products use new schema (`name`, `images.front`) but code expects old schema (`title`, `imageUrl`):

The code has been updated to handle both schemas, but if issues persist:

1. **Option A:** Update products in Firestore to use old schema
2. **Option B:** Ensure `fetchProducts` handles both (already done)
3. **Option C:** Re-sync products with correct schema

### 7. Verify Sync Function Works

Test the sync function:
```javascript
// In browser console (must be authenticated)
import { syncProducts } from './lib/firebase';

const result = await syncProducts({
  tags: ['shampoo'],
  limit: 10
});
console.log('Sync result:', result);
```

### 8. Check Filtering Logic

Products might be filtered out if:
- Brand is "Unknown" (for non-Open Beauty Facts products)
- Name contains "Mock"
- Source is "manual" without proper brand

**To see what's being filtered:**
- Check console for: `[fetchProducts] Filtered X mock products`
- This shows how many products were removed

### 9. Force Display All Products (Debug)

Temporarily disable filtering to see all products:
```typescript
// In src/lib/utils/products.ts
// Comment out the filtering logic temporarily
const realProducts = products; // Instead of products.filter(...)
```

### 10. Check Network Tab

1. Open DevTools → Network tab
2. Filter by "firestore"
3. Check if Firestore queries are:
   - Being sent
   - Returning data
   - Failing with errors

## Still Not Working?

1. **Check Firebase Console:**
   - Firestore → Data → products collection
   - Verify documents exist and have correct fields

2. **Check Authentication:**
   - User must be logged in for sync to work
   - Firestore rules might require auth

3. **Check Environment:**
   - Verify Firebase config is correct
   - Check `.env` file has correct project ID

4. **Check Logs:**
   - Browser console for client-side errors
   - Firebase Console → Functions → Logs for server errors

## Expected Behavior

When working correctly:
1. Products page loads
2. Console shows: `[Products] Loaded X products from Firestore`
3. Products display in grid
4. Each product shows image, name, brand
5. Clicking product opens details modal

If any step fails, check the corresponding section above.

