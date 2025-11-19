# Debugging Product Sync Issues

## Why Products Aren't Showing in Firestore

The database isn't being populated because one of these issues is occurring:

### 1. **Authentication Required**
- Firestore rules require users to be **logged in** to write products
- Check: Are you logged in when visiting the Products page?
- Solution: Make sure you're authenticated before products can sync

### 2. **API Issues**
- Open Beauty Facts API might be slow or returning empty results
- BeautyFeeds API might be returning mock data (404 errors)
- Check browser console for API errors

### 3. **Firestore Write Errors**
- Permission errors (user not authenticated)
- Network errors
- Data validation errors

## How to Debug

### Step 1: Open Browser Console
1. Press `F12` to open Developer Tools
2. Go to the **Console** tab
3. Visit the Products page (`/products`)

### Step 2: Look for These Log Messages

**Good signs:**
```
[Products] Loading products from Firestore...
[Products] Loaded X products from Firestore
[Products] Checking if auto-sync is needed...
[Products] No products found, starting auto-sync...
[syncProducts] Starting sync with tags: shampoo, conditioner, hair-care, hair-treatment
[syncProducts] OpenBeautyFacts returned X products
[syncProducts] BeautyFeeds returned X products
[syncProducts] Attempting to save to Firestore: [Product Name]
[syncProducts] ✓ Successfully saved product: [Product Name]
```

**Bad signs (errors to look for):**
```
[Products] User not authenticated, cannot sync products
[syncProducts] Error fetching from OpenBeautyFacts: [error]
[syncProducts] ✗ Firestore error saving [Product]: [error]
[syncProducts] Firestore error code: permission-denied
```

### Step 3: Check Firestore Console
1. Go to [Firebase Console](https://console.firebase.google.com)
2. Select your project
3. Go to **Firestore Database**
4. Check if `products` collection exists
5. Check if any documents are being created

### Step 4: Verify Authentication
1. Check if you're logged in (should see your email in navigation)
2. If not logged in, log in first
3. Then visit Products page again

## Common Issues & Solutions

### Issue: "User not authenticated"
**Solution:** Log in to your account first

### Issue: "Firestore error code: permission-denied"
**Solution:** 
1. Check Firestore rules in `firestore.rules`
2. Make sure rule allows: `allow write: if request.auth != null;`
3. Deploy rules: `firebase deploy --only firestore:rules`

### Issue: "OpenBeautyFacts returned 0 products"
**Solution:** 
- API might be slow or rate-limited
- Try again in a few minutes
- Check network tab for API response

### Issue: "BeautyFeeds returned 0 products"
**Solution:**
- API endpoint might not exist (returns 404)
- Falls back to mock data
- Mock products should still be saved to Firestore

## Manual Test

To manually trigger sync and see detailed logs:

1. Open browser console (F12)
2. Visit `/products` page
3. Wait 2-3 seconds
4. Check console for sync logs
5. Look for any error messages

## Expected Behavior

1. **First Visit (No Products):**
   - Page loads
   - Waits 2 seconds
   - Detects no products
   - Starts auto-sync
   - Fetches from APIs
   - Saves to Firestore
   - Reloads products
   - Products appear on page

2. **Subsequent Visits (Products Exist):**
   - Page loads
   - Fetches products from Firestore
   - Products display immediately
   - No sync needed

## Still Not Working?

If products still aren't appearing:

1. **Check Console Logs** - Look for specific error messages
2. **Check Firestore Rules** - Make sure they're deployed
3. **Check Authentication** - Make sure you're logged in
4. **Check Network Tab** - See if API calls are failing
5. **Try Manual Sync** - Wait for auto-sync or refresh page

## Next Steps

Once you see the console logs, share:
- Any error messages you see
- How many products the APIs return
- Whether Firestore writes succeed or fail
- Any permission errors

This will help identify the exact issue!

