# Product Page API Integration Guide

This document describes the integration of the product page with the ingredient-science backend.

## Overview

The product page integrates with a backend API that uses:
- **Open Beauty Facts** as the product source
- **CosIng** (EU Cosmetic Ingredient Database) as the ingredient-effect engine

## Backend API Endpoints

**Note:** Firebase Functions v2 routes by function name. To use `/api/products` paths, configure Firebase Hosting rewrites (see `functions/firebase.json.example`).

### 1. GET `/api/products` (or `/apiProducts`)

List products with pagination and filtering.

**Query Parameters:**
- `category` (optional): Filter by category (e.g., "hair-care")
- `limit` (optional): Number of products per page (default: 50, max: 100)
- `page` (optional): Page number (default: 1)

**Response:**
```json
{
  "meta": {
    "page": 1,
    "limit": 50,
    "total": 1234
  },
  "products": [
    {
      "product_id": "0123456789012",
      "barcode": "0123456789012",
      "name": "Gentle Shampoo",
      "brand": "OptionalBrand",
      "categories": ["Hair Care", "Shampoos"],
      "ingredients_inci": "Aqua, Sodium Laureth Sulfate, Glycerin, Cocamidopropyl Betaine",
      "ingredients_raw": [{"text": "Aqua"}, {"text": "Sodium Laureth Sulfate"}, ...],
      "normalized_ingredients": ["aqua", "sodium laureth sulfate", "glycerin", "cocamidopropyl betaine"],
      "ingredient_science": [
        {
          "inci_name": "glycerin",
          "functions": ["humectant"],
          "tags": ["hydration"],
          "safety_notes": "Generally safe",
          "source_url": "..."
        }
      ],
      "images": {
        "front": "https://world.openbeautyfacts.org/images/....jpg",
        "ingredients": "https://world.openbeautyfacts.org/images/....jpg"
      },
      "source": "open_beauty_facts",
      "last_modified_server": 1712340000,
      "last_synced_at": 1712341000,
      "product_profile": {
        "moisture_score": 80,
        "protein_score": 40,
        "oil_level": 20,
        "irritant_risk": 10,
        "explainers": [
          "Contains glycerin (humectant) → increases moisture",
          "Contains alcohol denat → may increase dryness on sensitive scalps"
        ]
      }
    }
  ]
}
```

### 2. GET `/api/products/:product_id` (or `/apiProductById`)

Get a single product by ID or barcode.

**Response:** Same as single product object in the list endpoint.

**Error Handling:**
- `404`: Product not found
- `500`: Server error

### 3. GET `/api/ingredients/:normalized_inci` (or `/apiIngredient`)

Get ingredient science data by normalized INCI name.

**Response:**
```json
{
  "inci_name": "glycerin",
  "cas_number": "...",
  "ec_number": "...",
  "functions": ["humectant"],
  "restrictions": "None",
  "safety_notes": "...",
  "tags": ["hydration", "humectant"],
  "source_url": "https://ec.europa.eu/..."
}
```

### 4. GET `/api/placeholders/haircare` (or `/getHaircarePlaceholder`)

Get placeholder image for haircare products (proxies Unsplash API).

**Response:**
```json
{
  "url": "https://images.unsplash.com/...",
  "source": "unsplash",
  "attribution": {
    "photographer": "...",
    "photographer_url": "...",
    "unsplash_url": "..."
  }
}
```

## Frontend Implementation

### Components

#### `ProductPage` (`src/pages/ProductPage.tsx`)

Main product page component that:
- Fetches product data from `/api/products/:product_id`
- Displays product images with fallback handling
- Shows ingredient list (INCI and normalized)
- Displays ingredient science data
- Calculates and displays compatibility score

#### `IngredientPopover` (`src/components/IngredientPopover.tsx`)

Popover component that displays ingredient science data when clicking on an ingredient.

#### `CompatibilityBadge` (`src/components/CompatibilityBadge.tsx`)

Displays compatibility score with color coding and explainable reasons.

### Hooks

#### `useFetchWithCache` (`src/hooks/useFetchWithCache.ts`)

Custom hook for fetching data with client-side caching:
- Caches responses in IndexedDB or localStorage
- Supports ETag/If-None-Match headers
- 24-hour TTL by default
- Automatic cache invalidation

**Usage:**
```typescript
const { data, loading, error } = useFetchWithCache<ApiProduct>(
  `${API_BASE}/api/products/${productId}`
);
```

#### `useIngredientCache` (`src/hooks/useIngredientCache.ts`)

Custom hook for caching ingredient science data:
- In-memory session cache
- Debounced requests
- Prevents duplicate API calls

**Usage:**
```typescript
const { fetchIngredient } = useIngredientCache();
const ingredient = await fetchIngredient('glycerin');
```

### Utilities

#### `ingredientNormalizer.ts`

Client-side ingredient normalization:
- Lowercase, trim whitespace
- Strip numeric descriptors and percentages
- Map common synonyms (e.g., `water` → `aqua`)
- Remove duplicates and bracketed descriptors

#### `compatibilityScore.ts`

Client-side compatibility scoring:
- Calculates score based on user profile (hair type, porosity, scalp sensitivity)
- Generates explainable reasons
- Returns score (0-100) and explainers array

## Firebase Hosting Configuration

To use `/api/products` paths instead of function names, configure Firebase Hosting rewrites in `firebase.json`:

```json
{
  "hosting": {
    "rewrites": [
      {
        "source": "/api/products",
        "function": "apiProducts"
      },
      {
        "source": "/api/products/**",
        "function": "apiProductById"
      },
      {
        "source": "/api/ingredients/**",
        "function": "apiIngredient"
      },
      {
        "source": "/api/placeholders/haircare",
        "function": "getHaircarePlaceholder"
      }
    ]
  }
}
```

## Environment Variables

### Frontend

Create a `.env` file in the project root:

```env
# Backend API base URL
VITE_API_BASE_URL=https://your-api-domain.com

# Optional: Unsplash API key (for placeholder images)
UNSPLASH_KEY=your_unsplash_key_here
```

**Note:** The `UNSPLASH_KEY` is only needed if you want to use the Unsplash placeholder API. The backend endpoint `/api/placeholders/haircare` will proxy requests to Unsplash.

### Backend (Firebase Functions)

Set environment variables for Firebase Functions:

```bash
# Set Unsplash key (optional)
firebase functions:config:set unsplash.key="your_unsplash_key"

# Or use .env file with firebase-functions-config
```

Alternatively, set environment variables in Firebase Console under Functions > Configuration.

## Caching Strategy

### Client-Side Caching

1. **Product Data**: Cached in IndexedDB/localStorage for 24 hours
2. **Ingredient Data**: Cached in-memory for the session
3. **ETag Support**: Uses `If-None-Match` headers to check for updates

### Cache Invalidation

- Product cache expires after 24 hours
- Ingredient cache persists for the session
- Manual refresh available via `refetch()` function

## Image Fallback Strategy

The product page implements a multi-level image fallback:

1. **Primary**: `images.front` from Open Beauty Facts
2. **Secondary**: `images.ingredients` from Open Beauty Facts
3. **Tertiary**: Placeholder from `/api/placeholders/haircare` (if Unsplash key is configured)
4. **Final**: Static placeholder `/assets/img/product-placeholder.png`

## Compatibility Scoring

The compatibility score is calculated client-side based on:

1. **Product Profile** (from backend):
   - `moisture_score`: 0-100
   - `protein_score`: 0-100
   - `oil_level`: 0-100
   - `irritant_risk`: 0-100
   - `explainers`: Array of explainable reasons

2. **User Profile** (from localStorage/context):
   - `hairType`: straight | wavy | curly | coily | mixed
   - `porosity`: low | medium | high
   - `scalpSensitive`: boolean
   - `concerns`: string[]

3. **Scoring Logic**:
   - Starts at 50 (neutral)
   - Adjusts based on porosity requirements
   - Penalizes heavy oils for low-porosity hair
   - Rewards moisture for high-porosity hair
   - Considers scalp sensitivity
   - Factors in user concerns

## Error Handling

### API Errors

- **5xx Errors**: Shows "Try again later" message
- **404 Errors**: Shows "Product not found" with back button
- **Network Errors**: Falls back to cached data if available

### Image Errors

- Automatically tries fallback images
- Shows placeholder if all images fail to load

### Telemetry

API latency and failures can be tracked in:
- Sentry (if configured)
- Crashlytics (if configured)
- Browser console (development)

## Testing

### Unit Tests

Test the `normalizeIngredient` function with edge cases:
- Commas inside parentheses
- Inconsistent casing
- Numeric descriptors
- Common synonyms

### Integration Tests

Test the product page with:
- Stubbed product payload
- Mock API responses
- Compatibility score calculations
- Image fallback scenarios

## Seeding CosIng Data

To seed CosIng data into Firestore:

1. **Download CosIng data** from: https://ec.europa.eu/growth/tools-databases/cosing/
2. **Convert to JSON format** (see `functions/src/migrations/seedCosIngData.ts` for example structure)
3. **Run migration script**:

```bash
# Using Firebase Functions shell
firebase functions:shell
> seedCosIngData(data)

# Or using Node.js directly
node -e "require('./functions/lib/migrations/seedCosIngData').runCosIngMigration('./data/cosing.json')"
```

The CosIng data will be stored in the `ingredient_science` collection in Firestore, with normalized INCI names as document IDs.

## Example Usage

### Fetching a Product

```typescript
import { fetchProduct } from './lib/api/client';

const product = await fetchProduct('0123456789012');
console.log(product.name, product.ingredient_science);
```

### Using the Product Page

```typescript
import { ProductPage } from './pages/ProductPage';

// In your router
<Route path="/products/:productId" element={<ProductPage />} />
```

### Displaying Compatibility Score

```typescript
import { calculateCompatibility } from './lib/utils/compatibilityScore';

const result = calculateCompatibility(productProfile, userProfile);
console.log(`Score: ${result.score}/100`);
console.log(result.explainers);
```

## Security Notes

- **API Keys**: Never store `UNSPLASH_KEY` or other keys in client code
- **Backend Proxy**: Use `/api/placeholders` endpoint to proxy Unsplash requests
- **CORS**: Backend endpoints should have CORS enabled for your frontend domain

## Future Enhancements

- [ ] Real-time product updates via WebSockets
- [ ] Batch ingredient fetching
- [ ] Advanced filtering and search
- [ ] Product comparison feature
- [ ] User reviews integration
- [ ] AI-powered ingredient explanations

