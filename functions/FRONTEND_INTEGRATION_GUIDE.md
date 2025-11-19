# Frontend Integration Guide - Products Page

## Overview

This guide explains how to integrate the Products Page Firebase Functions with your React frontend.

## Firebase Functions Available

### 1. `getProductDetails(productId)`
Fetches detailed product information including ingredients, sustainability tags, reviews, and AI explanations.

### 2. `getGoogleReviews(productName, brand)`
Fetches Google Reviews for a product with AI sentiment analysis.

### 3. `filterProducts(filters)`
Filters products based on ingredients, allergens, sustainability, price, rating, etc.

### 4. `likeProduct(productId, notes?)`
Adds a product to user's favorites.

### 5. `unlikeProduct(productId)`
Removes a product from user's favorites.

### 6. `getLikedProducts()`
Gets all products liked by the current user.

## Frontend Setup

### 1. Install Dependencies

```bash
npm install firebase
```

### 2. Initialize Firebase in Your App

```typescript
// src/lib/firebase.ts
import { initializeApp } from 'firebase/app';
import { getFunctions, httpsCallable } from 'firebase/functions';

const firebaseConfig = {
  // Your Firebase config
};

const app = initializeApp(firebaseConfig);
const functions = getFunctions(app);

// Export callable functions
export const getProductDetails = httpsCallable(functions, 'getProductDetails');
export const getGoogleReviews = httpsCallable(functions, 'getGoogleReviews');
export const filterProducts = httpsCallable(functions, 'filterProducts');
export const likeProduct = httpsCallable(functions, 'likeProduct');
export const unlikeProduct = httpsCallable(functions, 'unlikeProduct');
export const getLikedProducts = httpsCallable(functions, 'getLikedProducts');
```

## Usage Examples

### Fetch Product Details

```typescript
import { getProductDetails } from '@/lib/firebase';

async function fetchProduct(productId: string) {
  try {
    const result = await getProductDetails({ productId });
    const product = result.data.product;
    
    console.log('Product:', product.name);
    console.log('Ingredients:', product.ingredients);
    console.log('Sustainability:', product.sustainability);
    console.log('Reviews:', product.reviews);
    
    return product;
  } catch (error) {
    console.error('Error fetching product:', error);
    throw error;
  }
}
```

### Filter Products

```typescript
import { filterProducts } from '@/lib/firebase';

async function searchProducts(filters: {
  allergens?: string[];
  includeIngredients?: string[];
  excludeIngredients?: string[];
  sustainability?: {
    ecoFriendly?: boolean;
    crueltyFree?: boolean;
    locallyOwned?: boolean;
  };
  minRating?: number;
  maxPrice?: number;
  tags?: string[];
}) {
  try {
    const result = await filterProducts({ filters });
    return result.data.products;
  } catch (error) {
    console.error('Error filtering products:', error);
    throw error;
  }
}

// Example usage
const ecoFriendlyProducts = await searchProducts({
  sustainability: {
    ecoFriendly: true,
    crueltyFree: true,
  },
  minRating: 4.0,
  maxPrice: 50,
});
```

### Like/Unlike Products

```typescript
import { likeProduct, unlikeProduct, getLikedProducts } from '@/lib/firebase';

// Like a product
async function addToFavorites(productId: string, notes?: string) {
  try {
    await likeProduct({ productId, notes });
    console.log('Product added to favorites');
  } catch (error) {
    console.error('Error liking product:', error);
  }
}

// Unlike a product
async function removeFromFavorites(productId: string) {
  try {
    await unlikeProduct({ productId });
    console.log('Product removed from favorites');
  } catch (error) {
    console.error('Error unliking product:', error);
  }
}

// Get all liked products
async function fetchLikedProducts() {
  try {
    const result = await getLikedProducts({});
    return result.data.products;
  } catch (error) {
    console.error('Error fetching liked products:', error);
    throw error;
  }
}
```

## React Component Examples

### Product Detail Page Component

```typescript
// src/components/ProductDetail.tsx
import React, { useState, useEffect } from 'react';
import { getProductDetails, likeProduct } from '@/lib/firebase';

interface ProductDetailProps {
  productId: string;
}

export function ProductDetail({ productId }: ProductDetailProps) {
  const [product, setProduct] = useState(null);
  const [loading, setLoading] = useState(true);
  const [liked, setLiked] = useState(false);

  useEffect(() => {
    async function fetchProduct() {
      try {
        const result = await getProductDetails({ productId });
        setProduct(result.data.product);
      } catch (error) {
        console.error('Error:', error);
      } finally {
        setLoading(false);
      }
    }
    fetchProduct();
  }, [productId]);

  const handleLike = async () => {
    try {
      await likeProduct({ productId });
      setLiked(true);
    } catch (error) {
      console.error('Error liking product:', error);
    }
  };

  if (loading) return <div>Loading...</div>;
  if (!product) return <div>Product not found</div>;

  return (
    <div className="product-detail">
      {/* Product Header */}
      <div className="product-header">
        <img src={product.imageUrl} alt={product.name} />
        <h1>{product.name}</h1>
        <p>{product.brand}</p>
        <p>${product.price}</p>
        <button onClick={handleLike}>
          {liked ? '❤️ Liked' : '🤍 Like'}
        </button>
      </div>

      {/* Sustainability Tags */}
      <div className="sustainability-tags">
        {product.sustainability.tags.map(tag => (
          <span key={tag} className="tag">{tag}</span>
        ))}
      </div>

      {/* Ingredients Breakdown */}
      <div className="ingredients">
        <h2>Ingredients</h2>
        {product.ingredients.map((ingredient, index) => (
          <div key={index} className="ingredient-item">
            <h3>{ingredient.name}</h3>
            <p>{ingredient.aiExplanation}</p>
            <span className={`safety-${ingredient.safetyLevel}`}>
              {ingredient.safetyLevel}
            </span>
          </div>
        ))}
      </div>

      {/* Reviews */}
      <div className="reviews">
        <h2>Reviews</h2>
        <div className="rating">
          ⭐ {product.reviews.averageRating} ({product.reviews.totalReviews} reviews)
        </div>
        {product.reviews.aiSummary && (
          <div className="review-summary">
            <h3>What People Say</h3>
            <p><strong>Overall:</strong> {product.reviews.aiSummary.overallSentiment}</p>
            <div>
              <strong>Loved:</strong>
              <ul>
                {product.reviews.aiSummary.whatPeopleLove.map((item, i) => (
                  <li key={i}>{item}</li>
                ))}
              </ul>
            </div>
          </div>
        )}
        <div className="review-list">
          {product.reviews.reviews.map((review, index) => (
            <div key={index} className="review-item">
              <p><strong>{review.author}</strong> - {review.rating}/5</p>
              <p>{review.text}</p>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
```

### Product Filter Component

```typescript
// src/components/ProductFilters.tsx
import React, { useState } from 'react';
import { filterProducts } from '@/lib/firebase';

export function ProductFilters({ onFilter }: { onFilter: (products: any[]) => void }) {
  const [filters, setFilters] = useState({
    ecoFriendly: false,
    crueltyFree: false,
    locallyOwned: false,
    minRating: 0,
    maxPrice: 1000,
  });

  const handleFilter = async () => {
    try {
      const result = await filterProducts({
        filters: {
          sustainability: {
            ecoFriendly: filters.ecoFriendly,
            crueltyFree: filters.crueltyFree,
            locallyOwned: filters.locallyOwned,
          },
          minRating: filters.minRating,
          maxPrice: filters.maxPrice,
        },
      });
      onFilter(result.data.products);
    } catch (error) {
      console.error('Error filtering:', error);
    }
  };

  return (
    <div className="filters">
      <h2>Filter Products</h2>
      
      <label>
        <input
          type="checkbox"
          checked={filters.ecoFriendly}
          onChange={(e) => setFilters({ ...filters, ecoFriendly: e.target.checked })}
        />
        🍃 Eco-Friendly
      </label>
      
      <label>
        <input
          type="checkbox"
          checked={filters.crueltyFree}
          onChange={(e) => setFilters({ ...filters, crueltyFree: e.target.checked })}
        />
        🐰 Cruelty-Free
      </label>
      
      <label>
        <input
          type="checkbox"
          checked={filters.locallyOwned}
          onChange={(e) => setFilters({ ...filters, locallyOwned: e.target.checked })}
        />
        🇨🇦 Locally Owned
      </label>
      
      <label>
        Min Rating:
        <input
          type="number"
          min="0"
          max="5"
          step="0.1"
          value={filters.minRating}
          onChange={(e) => setFilters({ ...filters, minRating: parseFloat(e.target.value) })}
        />
      </label>
      
      <label>
        Max Price: $
        <input
          type="number"
          min="0"
          value={filters.maxPrice}
          onChange={(e) => setFilters({ ...filters, maxPrice: parseFloat(e.target.value) })}
        />
      </label>
      
      <button onClick={handleFilter}>Apply Filters</button>
    </div>
  );
}
```

### Liked Products Dashboard

```typescript
// src/components/LikedProducts.tsx
import React, { useState, useEffect } from 'react';
import { getLikedProducts, unlikeProduct } from '@/lib/firebase';

export function LikedProducts() {
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchLiked() {
      try {
        const result = await getLikedProducts({});
        setProducts(result.data.products);
      } catch (error) {
        console.error('Error:', error);
      } finally {
        setLoading(false);
      }
    }
    fetchLiked();
  }, []);

  const handleUnlike = async (productId: string) => {
    try {
      await unlikeProduct({ productId });
      setProducts(products.filter(p => p.productId !== productId));
    } catch (error) {
      console.error('Error unliking:', error);
    }
  };

  if (loading) return <div>Loading...</div>;

  return (
    <div className="liked-products">
      <h1>Your Liked Products</h1>
      {products.length === 0 ? (
        <p>No liked products yet</p>
      ) : (
        <div className="product-grid">
          {products.map((item) => (
            <div key={item.productId} className="product-card">
              <img src={item.productImageUrl} alt={item.productName} />
              <h3>{item.productName}</h3>
              <p>{item.productBrand}</p>
              <button onClick={() => handleUnlike(item.productId)}>
                Remove
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
```

## TypeScript Types

Create a types file for your frontend:

```typescript
// src/types/products.ts
export interface Product {
  id: string;
  name: string;
  brand: string;
  imageUrl?: string;
  price?: number;
  currency?: string;
  description?: string;
  category?: string;
  
  ingredients: IngredientWithExplanation[];
  sustainability: SustainabilityInfo;
  safety: SafetyInfo;
  reviews: ReviewData;
}

export interface IngredientWithExplanation {
  name: string;
  aiExplanation: string;
  safetyLevel: 'safe' | 'caution' | 'avoid';
  allergenFlag?: boolean;
  whatItDoes?: string;
  sensitiveScalpSafe?: boolean;
}

export interface SustainabilityInfo {
  ecoFriendly: boolean;
  sustainable: boolean;
  crueltyFree: boolean;
  locallyOwned: boolean;
  smallBrand: boolean;
  recyclablePackaging?: boolean;
  plantBased?: boolean;
  harmfulChemicals?: string[];
  tags: string[];
  explanation?: string;
}

export interface SafetyInfo {
  overallScore: number;
  allergenWarnings: AllergenWarning[];
  flaggedIngredients: FlaggedIngredient[];
}

export interface ReviewData {
  averageRating: number;
  totalReviews: number;
  sentimentScore: number;
  reviews: Review[];
  aiSummary?: {
    overallSentiment: string;
    whatPeopleLove: string[];
    whatPeopleHate: string[];
    commonPatterns: string[];
  };
}
```

## Error Handling

Always wrap Firebase Function calls in try-catch blocks:

```typescript
try {
  const result = await getProductDetails({ productId });
  // Handle success
} catch (error: any) {
  if (error.code === 'unauthenticated') {
    // Redirect to login
  } else if (error.code === 'not-found') {
    // Show not found message
  } else {
    // Show generic error
  }
}
```

## Best Practices

1. **Cache Results**: Cache product data in your app state to avoid unnecessary API calls
2. **Loading States**: Always show loading indicators while fetching data
3. **Error Boundaries**: Use React Error Boundaries for better error handling
4. **Optimistic Updates**: Update UI immediately for like/unlike actions
5. **Pagination**: For large product lists, implement pagination
6. **Debounce Filters**: Debounce filter inputs to avoid excessive API calls

## Next Steps

1. Create the Product Detail page component
2. Create the Product List/Grid component
3. Create the Filter sidebar/panel
4. Create the Liked Products dashboard
5. Add loading skeletons
6. Add error handling UI
7. Add animations and transitions
8. Test with real data

