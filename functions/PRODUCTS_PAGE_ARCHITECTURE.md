# Products Page Architecture & Implementation Guide

## 🏗️ Architecture Overview

```
┌─────────────────────────────────────────────────────────────────┐
│                         FRONTEND (React)                        │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐         │
│  │ Product List │  │ Product Detail│  │  Filters UI  │         │
│  └──────┬───────┘  └──────┬───────┘  └──────┬───────┘         │
│         │                 │                  │                  │
│         └─────────────────┼──────────────────┘                 │
│                           │                                     │
└───────────────────────────┼─────────────────────────────────────┘
                            │
                            │ HTTPS Calls
                            │
┌───────────────────────────▼─────────────────────────────────────┐
│              FIREBASE FUNCTIONS (Node.js)                       │
│  ┌──────────────────────────────────────────────────────────┐  │
│  │ 1. getProductDetails(productId)                          │  │
│  │    ├─ BeautyFeeds API → Product Info                    │  │
│  │    ├─ Open Food Facts → Ingredient Safety                │  │
│  │    ├─ Sustainability Tagging                           │  │
│  │    └─ Store/Cache in Firestore                           │  │
│  └──────────────────────────────────────────────────────────┘  │
│  ┌──────────────────────────────────────────────────────────┐  │
│  │ 2. getGoogleReviews(productName)                        │  │
│  │    ├─ Web Scraping (Cheerio)                             │  │
│  │    ├─ Parse Reviews                                      │  │
│  │    └─ Claude/OpenAI Sentiment Analysis                   │  │
│  └──────────────────────────────────────────────────────────┘  │
│  ┌──────────────────────────────────────────────────────────┐  │
│  │ 3. filterProducts(filters)                              │  │
│  │    └─ Firestore Query with Filters                      │  │
│  └──────────────────────────────────────────────────────────┘  │
│  ┌──────────────────────────────────────────────────────────┐  │
│  │ 4. likeProduct(userId, productId)                       │  │
│  │    └─ Firestore User Profile Update                     │  │
│  └──────────────────────────────────────────────────────────┘  │
│  ┌──────────────────────────────────────────────────────────┐  │
│  │ 5. analyzeIngredient(ingredientName)                     │  │
│  │    ├─ Open Food Facts API                                │  │
│  │    └─ Claude/OpenAI Explanation                          │  │
│  └──────────────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────────────┘
                            │
                            │
┌───────────────────────────▼─────────────────────────────────────┐
│                    EXTERNAL APIs                                 │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐         │
│  │ BeautyFeeds  │  │ Open Food    │  │ Google       │         │
│  │ API          │  │ Facts API    │  │ Reviews      │         │
│  └──────────────┘  └──────────────┘  └──────────────┘         │
└─────────────────────────────────────────────────────────────────┘
                            │
┌───────────────────────────▼─────────────────────────────────────┐
│                    FIRESTORE DATABASE                            │
│  ┌──────────────────────────────────────────────────────────┐   │
│  │ products/{productId}                                    │   │
│  │   - Basic info, images, price                            │   │
│  │   - Ingredients with AI explanations                     │   │
│  │   - Sustainability tags                                  │   │
│  │   - Reviews summary                                     │   │
│  │   - Enrichment metadata                                 │   │
│  └──────────────────────────────────────────────────────────┘   │
│  ┌──────────────────────────────────────────────────────────┐   │
│  │ users/{userId}/likedProducts/{productId}                │   │
│  │   - Timestamp                                            │   │
│  │   - Notes                                                │   │
│  └──────────────────────────────────────────────────────────┘   │
│  ┌──────────────────────────────────────────────────────────┐   │
│  │ users/{userId}/profile                                   │   │
│  │   - Flagged allergens                                    │   │
│  │   - Preferences                                          │   │
│  └──────────────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────────┘
```

## 📊 Firestore Database Schema

### Collection: `products`
```typescript
{
  id: string;                    // Auto-generated or from API
  name: string;
  brand: string;
  imageUrl?: string;
  images?: string[];             // Multiple product images
  price?: number;
  currency?: string;
  category?: string;
  description?: string;
  upc?: string;
  
  // Ingredients with AI explanations
  ingredients: Array<{
    name: string;
    aiExplanation: string;       // "What this does for curls"
    safetyLevel: 'safe' | 'caution' | 'avoid';
    allergenFlag?: boolean;
    whatItDoes: string;          // "Moisturizes and defines curls"
    sensitiveScalpSafe?: boolean;
  }>;
  
  // Sustainability Information
  sustainability: {
    ecoFriendly: boolean;
    sustainable: boolean;
    crueltyFree: boolean;
    locallyOwned: boolean;
    smallBrand: boolean;
    recyclablePackaging?: boolean;
    plantBased?: boolean;
    harmfulChemicals?: string[];  // List of flagged chemicals
    tags: string[];              // ['♻️ recyclable', '🍃 eco-friendly', etc.]
    explanation?: string;         // AI-generated sustainability explanation
  };
  
  // Safety & Allergens
  safety: {
    overallScore: number;         // 0-100
    allergenWarnings: Array<{
      ingredient: string;
      severity: 'low' | 'medium' | 'high';
      description: string;
    }>;
    flaggedIngredients: Array<{
      name: string;
      concern: string;
      severity: 'low' | 'medium' | 'high';
    }>;
  };
  
  // Google Reviews Summary
  reviews: {
    averageRating: number;
    totalReviews: number;
    sentimentScore: number;      // -1 to 1
    topReviews: Array<{
      author: string;
      rating: number;
      text: string;
      date: string;
    }>;
    aiSummary: {
      overallSentiment: string;
      whatPeopleLove: string[];
      whatPeopleHate: string[];
      commonPatterns: string[];
    };
  };
  
  // AI Recommendation Explanation
  aiRecommendationExplanation?: string;
  
  // Metadata
  source: 'beautyfeeds' | 'openbeautyfacts' | 'manual';
  sourceId?: string;
  url?: string;
  tags: string[];
  createdAt: Timestamp;
  updatedAt: Timestamp;
  enriched: boolean;
  enrichedAt?: Timestamp;
}
```

### Collection: `users/{userId}/likedProducts`
```typescript
{
  productId: string;
  productName: string;
  productBrand: string;
  productImageUrl?: string;
  likedAt: Timestamp;
  notes?: string;
  addedToRegimen?: boolean;
}
```

### Collection: `users/{userId}/profile`
```typescript
{
  flaggedAllergens: string[];
  preferences: {
    vegan: boolean;
    crueltyFree: boolean;
    organic: boolean;
    locallyOwned: boolean;
  };
  hairType?: string;
  concerns?: string[];
}
```

## 🔄 Data Flow

### 1. Product Details Flow
```
User clicks product
  ↓
Frontend calls getProductDetails(productId)
  ↓
Firebase Function:
  1. Check Firestore cache
  2. If not cached:
     a. Fetch from BeautyFeeds API
     b. Fetch ingredient details from Open Food Facts
     c. Generate sustainability tags
     d. Analyze ingredients with AI
     e. Store in Firestore
  3. Return enriched product data
  ↓
Frontend displays product details
```

### 2. Reviews Flow
```
User views product reviews
  ↓
Frontend calls getGoogleReviews(productName)
  ↓
Firebase Function:
  1. Check Firestore cache
  2. If not cached:
     a. Scrape Google Reviews (Cheerio)
     b. Parse review data
     c. Send to Claude/OpenAI for sentiment analysis
     d. Store in Firestore
  3. Return reviews + AI summary
  ↓
Frontend displays reviews with sentiment summary
```

### 3. Filtering Flow
```
User applies filters
  ↓
Frontend calls filterProducts(filters)
  ↓
Firebase Function:
  1. Build Firestore query with filters
  2. Execute query
  3. Return filtered products
  ↓
Frontend displays filtered results
```

## 🔐 Security Rules

```javascript
// firestore.rules
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    // Products are read-only for authenticated users
    match /products/{productId} {
      allow read: if request.auth != null;
      allow write: if false; // Only via Cloud Functions
    }
    
    // User liked products
    match /users/{userId}/likedProducts/{productId} {
      allow read, write: if request.auth != null && request.auth.uid == userId;
    }
    
    // User profile
    match /users/{userId}/profile {
      allow read, write: if request.auth != null && request.auth.uid == userId;
    }
  }
}
```

## 📦 Required NPM Packages

```json
{
  "dependencies": {
    "firebase-admin": "^12.0.0",
    "firebase-functions": "^4.5.0",
    "axios": "^1.6.0",
    "cheerio": "^1.0.0-rc.12",
    "node-cache": "^5.1.2"
  }
}
```

## 🚀 Implementation Steps

1. ✅ Install dependencies (`cheerio` for web scraping)
2. ✅ Create Firebase Functions
3. ✅ Update Firestore security rules
4. ✅ Test functions locally
5. ✅ Deploy to Firebase
6. ✅ Create frontend components
7. ✅ Integrate with React app

## 💡 Best Practices

1. **Caching**: Cache API responses in Firestore to reduce API calls
2. **Rate Limiting**: Implement rate limiting for API calls
3. **Error Handling**: Graceful fallbacks when APIs fail
4. **User Privacy**: Don't store personal data unnecessarily
5. **Cost Optimization**: Cache aggressively, batch requests
6. **Human-Centered Design**: Clear explanations, no fear-mongering

