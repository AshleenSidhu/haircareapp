# Image Handling System - Implementation Guide

This document describes the image handling system for product ingestion and display, including Firebase Storage integration and fallback mechanisms.

## Overview

The image handling system provides:
1. **External URL Storage**: Saves Open Beauty Facts image URLs in Firestore
2. **Optional Firebase Storage**: Downloads and stores images in Firebase Storage for stable hosting
3. **Robust Fallbacks**: Multiple fallback options when images fail to load
4. **Secure API Keys**: Unsplash API key kept server-side

## Architecture

### Firestore Schema

Each product document in `products/{productId}` includes:

```typescript
{
  images: {
    front?: string;           // External URL from Open Beauty Facts
    ingredients?: string;     // External ingredients image URL
  },
  images_stored: {
    storage_url?: string | null;      // Firebase Storage URL (if stored)
    stored_at?: Timestamp | null;     // When image was stored
    image_type?: string;              // 'front' | 'ingredients'
    original_url?: string;            // Original external URL
  }
}
```

### Image Fallback Chain

The frontend `ProductImage` component tries images in this order:

1. **Firebase Storage URL** (`images_stored.storage_url`) - Highest priority, most reliable
2. **External Front Image** (`images.front`) - From Open Beauty Facts
3. **External Ingredients Image** (`images.ingredients`) - Fallback image
4. **Unsplash Placeholder** (`/api/placeholders/haircare`) - Backend-proxied placeholder
5. **Static Placeholder** (`/assets/img/product-placeholder.png`) - Final fallback

## Firebase Functions

### 1. `syncProducts` (Updated)

The product sync function now saves `images_stored` field (initialized as `null`):

```typescript
// In functions/src/productSync.ts
const images_stored = product.images_stored || {
  storage_url: null,
  stored_at: null,
};
```

### 2. `downloadAndStoreImage` (New)

Callable function that downloads an external image and stores it in Firebase Storage.

**Endpoint**: Callable function `downloadAndStoreImage`

**Parameters**:
```typescript
{
  productId: string;      // Product ID
  imageUrl: string;       // External image URL to download
  imageType?: string;     // 'front' | 'ingredients' (default: 'front')
}
```

**Returns**:
```typescript
{
  success: boolean;
  storage_url: string;    // Signed URL to stored image
  productId: string;
  imageType: string;
  size: number;           // Image size in bytes
  contentType: string;
}
```

**Usage Example**:
```typescript
import { getFunctions, httpsCallable } from 'firebase/functions';

const functions = getFunctions();
const downloadAndStoreImage = httpsCallable(functions, 'downloadAndStoreImage');

const result = await downloadAndStoreImage({
  productId: 'product123',
  imageUrl: 'https://images.openbeautyfacts.org/products/123/front.jpg',
  imageType: 'front'
});

console.log('Stored image URL:', result.data.storage_url);
```

### 3. `getHaircarePlaceholder` (Updated)

HTTP endpoint that proxies Unsplash API to get placeholder images.

**Endpoint**: `GET /api/placeholders/haircare` or `/getHaircarePlaceholder`

**Response**:
```json
{
  "url": "https://images.unsplash.com/...",
  "source": "unsplash",
  "attribution": {
    "photographer": "John Doe",
    "photographer_url": "https://unsplash.com/@johndoe",
    "unsplash_url": "https://unsplash.com/photos/..."
  }
}
```

## Frontend Components

### ProductImage Component

Reusable component with automatic fallback handling:

```tsx
import { ProductImage } from '../components/ProductImage';

<ProductImage
  product={product}
  alt={product.name}
  className="w-full h-full object-cover"
  onError={() => console.log('All fallbacks failed')}
/>
```

## Setup Instructions

### 1. Environment Variables

Set Firebase Functions environment variables:

```bash
# Set Unsplash API key
firebase functions:config:set unsplash.key="YOUR_UNSPLASH_ACCESS_KEY"

# Optional: Enable automatic image storage during sync
firebase functions:config:set store_images=true

# Deploy functions
firebase deploy --only functions
```

Or use Secret Manager (recommended for production):

```bash
# Set secret
firebase functions:secrets:set UNSPLASH_KEY

# Access in code: process.env.UNSPLASH_KEY
```

### 2. Firebase Storage Rules

Update `firestore.rules` to allow authenticated reads:

```javascript
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    // Products: authenticated users can read, only functions can write
    match /products/{productId} {
      allow read: if request.auth != null;
      allow write: if false; // Only backend functions can write
    }
    
    // Ingredient science: authenticated users can read
    match /ingredient_science/{ingredientId} {
      allow read: if request.auth != null;
      allow write: if false; // Only backend functions can write
    }
  }
}
```

Update Storage rules in Firebase Console:

```javascript
rules_version = '2';
service firebase.storage {
  match /b/{bucket}/o {
    // Product images: authenticated users can read, only functions can write
    match /products/{productId}/{allPaths=**} {
      allow read: if request.auth != null;
      allow write: if false; // Only backend functions can write
    }
  }
}
```

### 3. Static Placeholder Image

Create a static placeholder image:

1. Create directory: `public/assets/img/`
2. Add `product-placeholder.png` (recommended: 400x400px, transparent or white background)
3. The image will be served at `/assets/img/product-placeholder.png`

### 4. Deploy Functions

```bash
cd functions
npm install
npm run build
firebase deploy --only functions
```

## Usage Patterns

### Pattern 1: Store URLs Only (Recommended for MVP)

By default, the system stores external URLs only. Images are loaded directly from Open Beauty Facts:

- ✅ Fast sync (no image downloads)
- ✅ Low storage costs
- ✅ Simple implementation
- ⚠️ Dependent on external service availability

### Pattern 2: Store Images in Firebase Storage

For production stability, download and store images:

```typescript
// After syncing products, optionally store images
const product = await getProduct(productId);
if (product.images?.front && !product.images_stored?.storage_url) {
  await downloadAndStoreImage({
    productId: product.product_id,
    imageUrl: product.images.front,
    imageType: 'front'
  });
}
```

**Benefits**:
- ✅ Stable hosting (no external dependencies)
- ✅ CDN delivery (Firebase Storage)
- ✅ Better performance
- ⚠️ Higher storage costs
- ⚠️ Slower initial sync

### Pattern 3: Hybrid Approach

Store images only when external URLs fail:

```typescript
// Check if external image is accessible
const response = await fetch(product.images.front, { method: 'HEAD' });
if (!response.ok) {
  // External image failed, store in Firebase Storage
  await downloadAndStoreImage({
    productId: product.product_id,
    imageUrl: product.images.front,
    imageType: 'front'
  });
}
```

## Testing

### Test Image Fallback

1. Create a product with invalid image URL
2. Verify fallback chain works:
   - External URL fails
   - Placeholder API is called
   - Static placeholder is shown

### Test Image Storage

```typescript
// In Firebase Functions emulator
const result = await downloadAndStoreImage({
  productId: 'test123',
  imageUrl: 'https://images.openbeautyfacts.org/products/123/front.jpg'
});

// Verify:
// 1. Image is stored in Storage: products/test123/front.jpg
// 2. Firestore updated with storage_url
// 3. Signed URL is valid and accessible
```

## Cost Considerations

### Storage Costs

- **External URLs Only**: $0 (no storage)
- **Firebase Storage**: ~$0.026/GB/month
- **Egress**: ~$0.12/GB (first 10GB free/month)

### Recommendations

- **MVP/Hackathon**: Use external URLs only
- **Production**: Store images for critical products
- **Hybrid**: Store images on-demand when external URLs fail

## Security Notes

1. **Unsplash API Key**: Never expose in client code. Always proxy through backend.
2. **Image Validation**: `downloadAndStoreImage` validates:
   - URL protocol (http/https only)
   - Content type (image/* only)
   - File size (max 10MB)
3. **Authentication**: All image operations require authentication.
4. **Storage Access**: Use signed URLs with expiration dates.

## Troubleshooting

### Images Not Loading

1. Check browser console for CORS errors
2. Verify external URLs are accessible
3. Check Firebase Storage rules allow reads
4. Verify placeholder API is deployed

### Storage Upload Fails

1. Check Firebase Storage bucket exists
2. Verify function has Storage admin permissions
3. Check image size (max 10MB)
4. Verify image URL is accessible from Functions

### Placeholder API Returns Default

1. Check `UNSPLASH_KEY` is set in Functions config
2. Verify Unsplash API quota not exceeded
3. Check function logs for errors

## Next Steps

1. ✅ Implemented: Basic image handling with fallbacks
2. ✅ Implemented: Firebase Storage integration
3. ✅ Implemented: Unsplash placeholder proxy
4. 🔄 Optional: Image optimization (resize/compress before storage)
5. 🔄 Optional: Batch image storage during sync
6. 🔄 Optional: Image CDN caching headers

## Support

For issues or questions:
- Check function logs: `firebase functions:log`
- Check browser console for frontend errors
- Verify environment variables are set correctly

