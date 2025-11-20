# Diagnose Products Not Showing

## Quick Diagnostic Steps

### Step 1: Check Browser Console
Open your browser console (F12) and look for these messages:

**If you see:**
```
[fetchProducts] Query successful! Found 0 documents in Firestore
```
→ **No products in Firestore** - You need to sync products

**If you see:**
```
[fetchProducts] Query successful! Found X documents in Firestore
[fetchProducts] Filtered out X mock/invalid products
[fetchProducts] Returning 0 real products
```
→ **Products exist but are being filtered out** - Check the sample products shown

**If you see:**
```
[fetchProducts] Query failed: permission-denied
```
→ **Firestore rules not deployed** - Deploy rules (see below)

**If you see:**
```
[fetchProducts] Query failed: failed-precondition
```
→ **Firestore index needed** - Create index (click the link in error)

### Step 2: Run Diagnostic in Browser Console

Copy and paste this into your browser console:

```javascript
// Diagnostic script
(async () => {
  console.log('=== PRODUCT DIAGNOSTIC ===');
  
  // Check Firebase connection
  const { db } = await import('./lib/firebase');
  console.log('✓ Firebase connected');
  
  // Check if products collection exists
  const { collection, getDocs, query, limit } = await import('firebase/firestore');
  const productsRef = collection(db, 'products');
  
  try {
    const snapshot = await getDocs(query(productsRef, limit(5)));
    console.log(`✓ Products collection exists`);
    console.log(`  Total documents: ${snapshot.size}`);
    
    if (snapshot.size === 0) {
      console.log('❌ No products in Firestore!');
      console.log('  → Need to sync products using syncProducts function');
      console.log('  → Or click "Sync Products" button on Products page');
    } else {
      console.log('✓ Products found in Firestore');
      snapshot.docs.forEach((doc, i) => {
        const data = doc.data();
        console.log(`  Product ${i + 1}:`, {
          id: doc.id,
          name: data.name || data.title,
          brand: data.brand,
          source: data.source,
          hasImage: !!(data.imageUrl || data.images?.front),
        });
      });
    }
  } catch (error) {
    console.error('❌ Error accessing Firestore:', error);
    if (error.code === 'permission-denied') {
      console.error('  → Firestore rules not deployed!');
      console.error('  → Run: firebase deploy --only firestore:rules');
    }
  }
  
  console.log('=== END DIAGNOSTIC ===');
})();
```

### Step 3: Check Firestore Directly

1. Go to [Firebase Console](https://console.firebase.google.com)
2. Select your project
3. Go to **Firestore Database**
4. Check if `products` collection exists
5. Check if there are any documents

### Step 4: Sync Products

If no products exist:

1. **Make sure you're logged in** (required for sync)
2. Go to Products page
3. Click "Sync Products" button
4. Wait for sync to complete
5. Refresh the page

Or manually sync from console:
```javascript
import { syncProducts } from './lib/firebase';
await syncProducts({ tags: ['shampoo', 'conditioner'], limit: 50 });
```

### Step 5: Check Firestore Rules

If you see permission errors:

1. **Deploy rules via CLI:**
   ```bash
   firebase deploy --only firestore:rules
   ```

2. **Or deploy via Console:**
   - Go to Firebase Console → Firestore → Rules
   - Copy contents of `firestore.rules`
   - Paste and click "Publish"

### Common Issues & Solutions

| Issue | Solution |
|-------|----------|
| No products in Firestore | Sync products using syncProducts function |
| Permission denied | Deploy Firestore rules |
| All products filtered out | Check product schema matches expected format |
| Query failed (index) | Create Firestore index (click link in error) |
| Products not syncing | Check user is authenticated |

### Expected Console Output (Success)

```
[fetchProducts] Starting fetch...
[fetchProducts] Attempting query with orderBy(createdAt)...
[fetchProducts] Query successful! Found 50 documents in Firestore
[fetchProducts] First product: { id: "...", title: "...", ... }
[fetchProducts] Total products from Firestore: 50
[fetchProducts] Filtered out 0 mock/invalid products
[fetchProducts] Returning 50 real products
[Products] Loaded 50 products from Firestore
```

### If Still Not Working

1. Check browser console for specific error messages
2. Check Firebase Console → Firestore for products
3. Verify you're logged in (required for sync)
4. Check network tab for failed requests
5. Verify Firestore rules are deployed

