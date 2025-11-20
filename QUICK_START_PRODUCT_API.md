# Quick Start: Product API Integration

This guide will help you quickly set up and use the product page API integration.

## Prerequisites

1. Firebase project with Firestore enabled
2. CosIng data seeded in `ingredient_science` collection
3. Products synced from Open Beauty Facts (use `syncProducts` function)

## Setup Steps

### 1. Seed CosIng Data

```bash
# In functions directory
cd functions
npm run build

# Run migration
firebase functions:shell
> const { runCosIngMigration } = require('./lib/migrations/seedCosIngData');
> runCosIngMigration('./data/cosing.json');
```

### 2. Sync Products

```bash
# Call syncProducts function from your app or Firebase Console
# This will fetch products from Open Beauty Facts and enrich with CosIng data
```

### 3. Configure Firebase Hosting (Optional)

To use `/api/products` paths instead of function names, add rewrites to `firebase.json`:

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

### 4. Set Environment Variables

**Frontend** (`.env`):
```env
VITE_API_BASE_URL=https://your-project.cloudfunctions.net
```

**Backend** (Firebase Functions):
```bash
firebase functions:config:set unsplash.key="your_key_here"
```

### 5. Deploy Functions

```bash
cd functions
npm run build
firebase deploy --only functions
```

## Usage Examples

### Fetch Products

```typescript
import { fetchProducts } from './lib/api/client';

const response = await fetchProducts({
  category: 'hair-care',
  limit: 50,
  page: 1
});

console.log(response.products);
```

### Fetch Single Product

```typescript
import { fetchProduct } from './lib/api/client';

const product = await fetchProduct('0123456789012');
console.log(product.name, product.ingredient_science);
```

### Use Product Page Component

```typescript
import { ProductPage } from './pages/ProductPage';

// In your router (React Router)
<Route path="/products/:productId" element={<ProductPage />} />
```

### Calculate Compatibility Score

```typescript
import { calculateCompatibility } from './lib/utils/compatibilityScore';

const userProfile = {
  hairType: 'curly',
  porosity: 'high',
  scalpSensitive: false,
  concerns: ['frizz', 'dryness']
};

const result = calculateCompatibility(product.product_profile, userProfile);
console.log(`Score: ${result.score}/100`);
console.log(result.explainers);
```

## Testing

### Test Product Endpoint

```bash
curl "https://your-project.cloudfunctions.net/apiProducts?category=hair-care&limit=10"
```

### Test Ingredient Endpoint

```bash
curl "https://your-project.cloudfunctions.net/apiIngredient?normalized_inci=glycerin"
```

## Troubleshooting

### Products Not Found

- Ensure products are synced using `syncProducts` function
- Check Firestore `products` collection exists
- Verify product IDs match what you're querying

### Ingredient Science Missing

- Ensure CosIng data is seeded in `ingredient_science` collection
- Check ingredient names are normalized correctly
- Verify ingredient INCI names match CosIng database

### Images Not Loading

- Check Open Beauty Facts image URLs are valid
- Verify placeholder API is working
- Check browser console for CORS errors

### Compatibility Score Not Showing

- Ensure user profile is saved in localStorage
- Check product has `product_profile` data
- Verify compatibility calculation function is imported correctly

## Next Steps

1. Customize compatibility scoring logic in `src/lib/utils/compatibilityScore.ts`
2. Add more ingredient synonyms in `src/lib/utils/ingredientNormalizer.ts`
3. Enhance UI components in `src/components/`
4. Add unit tests for normalization and scoring functions

