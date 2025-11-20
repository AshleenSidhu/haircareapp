# Debug: Products Not Syncing to Firestore

## Quick Diagnostic Steps

### 1. Check Browser Console
When you click "Sync Products", look for these messages:

**Expected flow:**
```
[Products] Starting product sync via Firebase Function...
[Products] User authenticated: [user-id]
[Products] Calling syncProducts callable function...
[syncProducts] Starting sync with tags: shampoo, conditioner, hair-care, limit: 100
[syncProducts] Calling OBF adapter with tags: ...
[syncProducts] OBF adapter returned X products
[syncProducts] Processing product 1/X: [Product Name]
[syncProducts] Synced X/X products...
[syncProducts] Sync complete! Synced: X, Errors: 0
```

### 2. Check Firebase Functions Logs

1. Go to [Firebase Console](https://console.firebase.google.com)
2. Select your project
3. Go to **Functions** → **Logs**
4. Look for `[syncProducts]` log entries
5. Check for errors

### 3. Common Issues & Solutions

#### Issue: "No products found from Open Beauty Facts API"

**Possible causes:**
- API returned no results for the search tags
- Rate limit exceeded
- Network/API error

**Solution:**
- Check Open Beauty Facts API directly: https://world.openbeautyfacts.org/cgi/search.pl?action=process&tagtype_0=categories&tag_contains_0=contains&tag_0=en:shampoos&page_size=10&json=true
- Try different tags
- Wait a few minutes if rate limited

#### Issue: "Error processing product"

**Check logs for:**
- Product ID
- Product name
- Specific error message

**Common causes:**
- Missing required fields (name, brand)
- Firestore write permission error
- Data transformation error

#### Issue: "User must be authenticated"

**Solution:**
- Make sure you're logged in
- Check authentication token is valid
- Verify Firestore rules allow authenticated writes

#### Issue: Function not found / 404 error

**Solution:**
- Deploy functions: `firebase deploy --only functions`
- Check function name matches: `syncProducts`
- Verify region matches: `northamerica-northeast1`

### 4. Test Open Beauty Facts API Directly

```bash
# Test search endpoint
curl "https://world.openbeautyfacts.org/cgi/search.pl?action=process&tagtype_0=categories&tag_contains_0=contains&tag_0=en:shampoos&page_size=5&json=true&fields=code,product_name,brands"

# Test product by barcode
curl "https://world.openbeautyfacts.org/api/v2/product/3560070791460.json"
```

### 5. Manual Test in Browser Console

```javascript
// Test syncProducts function
import { syncProducts } from './lib/firebase';

const result = await syncProducts({
  tags: ['shampoo'],
  limit: 10
});

console.log('Sync result:', result);
```

### 6. Check Firestore After Sync

1. Go to Firebase Console → Firestore Database
2. Check `products` collection
3. Verify documents were created
4. Check document structure matches expected schema

### 7. Verify Function is Deployed

```bash
# List deployed functions
firebase functions:list

# Should see: syncProducts
```

### 8. Check Function Logs for Errors

```bash
# View recent logs
firebase functions:log --only syncProducts

# Or in Firebase Console
# Functions → Logs → Filter by "syncProducts"
```

## Expected Behavior

1. **User clicks "Sync Products"**
2. **Function called** → `syncProducts` callable function
3. **OBF API called** → Fetches products from Open Beauty Facts
4. **Products transformed** → Normalized ingredients, CosIng mapping
5. **Firestore write** → Products saved to `products` collection
6. **Success response** → Returns count of synced products

## Debugging Checklist

- [ ] User is authenticated
- [ ] Function is deployed
- [ ] Open Beauty Facts API is accessible
- [ ] Firestore rules allow writes
- [ ] Function logs show products being processed
- [ ] No errors in function logs
- [ ] Products appear in Firestore after sync

## Still Not Working?

1. **Check function logs** in Firebase Console
2. **Test OBF API directly** (see curl commands above)
3. **Verify authentication** is working
4. **Check Firestore rules** allow writes
5. **Deploy functions** if not already deployed

