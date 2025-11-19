# API Integration Guide

This guide explains how to configure and use the integrated APIs for the Hair-Care App product features.

## 🔑 API Keys and Configuration

### 1. BeautyFeeds.io API
- **API Key**: `f6b8e2e95439818289c2b0acbfb90b12d82210a8`
- **Status**: ✅ Already configured in `functions/src/adapters/BeautyFeedsAdapter.ts`
- **Usage**: Primary source for product info, images, brand, and pricing
- **Endpoint**: Update `BEAUTYFEEDS_BASE_URL` in the adapter if the API endpoint differs

### 2. Open Beauty Facts
- **API Key**: Not required (free, open-source)
- **Status**: ✅ Already configured
- **Usage**: Additional ingredient information, allergen info, sustainability labels
- **Endpoint**: `https://world.openbeautyfacts.org/api/v0`

### 3. Cosmethics/INCI API
- **API Key**: Configure via environment variable
- **Status**: ⚠️ Needs configuration
- **Usage**: Ingredient safety scores, scientific explanations, allergen detection
- **Configuration**:
  ```bash
  # In Firebase Functions config
  firebase functions:config:set cosmethics.api_key="your-key-here"
  firebase functions:config:set cosmethics.api_url="https://api.cosmethics.com/v1"
  
  # Or use environment variables
  export COSMETHICS_API_KEY="your-key-here"
  export COSMETHICS_API_URL="https://api.cosmethics.com/v1"
  ```
- **Fallback**: Uses local knowledge base if API is unavailable

### 4. Google Places/Reviews API
- **API Key**: Configure via environment variable
- **Status**: ⚠️ Needs configuration
- **Usage**: Product reviews and ratings
- **Configuration**:
  ```bash
  # In Firebase Functions config
  firebase functions:config:set google.places_api_key="your-key-here"
  
  # Or use environment variable
  export GOOGLE_PLACES_API_KEY="your-key-here"
  ```
- **Fallback**: Uses mock reviews if API is unavailable

### 5. OpenAI API (for AI explanations)
- **API Key**: Configure via environment variable
- **Status**: ⚠️ Needs configuration
- **Usage**: AI-generated ingredient explanations and product recommendations
- **Configuration**:
  ```bash
  # In Firebase Functions config
  firebase functions:config:set openai.api_key="your-key-here"
  firebase functions:config:set openai.model="gpt-3.5-turbo"  # or "gpt-4"
  
  # Or use environment variables
  export OPENAI_API_KEY="your-key-here"
  export AI_MODEL="gpt-3.5-turbo"
  ```

## 📋 Cloud Functions

### Available Functions

#### 1. `syncProducts`
Fetches products from BeautyFeeds.io and Open Beauty Facts, enriches them, and stores in Firestore.

**Usage** (from frontend):
```typescript
import { getFunctions, httpsCallable } from 'firebase/functions';

const functions = getFunctions();
const syncProducts = httpsCallable(functions, 'syncProducts');

const result = await syncProducts({
  tags: ['shampoo', 'conditioner', 'hair-care'],
  limit: 50
});
```

#### 2. `enrichProduct`
Enriches a single product with AI explanations, reviews, and safety data.

**Usage**:
```typescript
const enrichProduct = httpsCallable(functions, 'enrichProduct');

const result = await enrichProduct({
  productId: 'product-123',
  userQuizAnswers: { /* user quiz data */ }
});
```

#### 3. `filterProducts`
Server-side product filtering with Firestore queries.

**Usage**:
```typescript
const filterProducts = httpsCallable(functions, 'filterProducts');

const result = await filterProducts({
  filters: {
    allergens: ['sulfates'],
    sustainability: { crueltyFree: true },
    minRating: 4.0
  },
  limit: 50
});
```

## 🔄 Product Sync Workflow

1. **Initial Sync**: Call `syncProducts` to fetch products from APIs
2. **Enrichment**: Products are automatically enriched with:
   - Ingredient safety analysis (Cosmethics/INCI)
   - Google Reviews
   - AI ingredient explanations
   - Sustainability information
3. **Storage**: Enriched products are stored in Firestore `products` collection
4. **Frontend**: Products are fetched and displayed with filtering

## 📊 Firestore Data Structure

### Products Collection (`products`)
```typescript
{
  id: string;
  title: string; // Product name
  brand: string;
  imageUrl?: string;
  tags: string[];
  ingredients: IngredientWithExplanation[];
  sustainability: {
    ecoFriendly: boolean;
    sustainable: boolean;
    crueltyFree: boolean;
    locallyOwned: boolean;
    smallBrand: boolean;
    explanation?: string;
  };
  safety: {
    overallScore: number;
    allergenWarnings: AllergenWarning[];
    flaggedIngredients: FlaggedIngredient[];
  };
  reviews: {
    averageRating: number;
    totalReviews: number;
    sentimentScore: number;
    reviews: Review[];
  };
  aiRecommendationExplanation?: string;
  source: 'openbeautyfacts' | 'beautyfeeds' | 'manual';
  createdAt: Timestamp;
  updatedAt: Timestamp;
}
```

## 🚀 Getting Started

1. **Configure API Keys**:
   ```bash
   cd functions
   firebase functions:config:set openai.api_key="your-openai-key"
   firebase functions:config:set google.places_api_key="your-google-key"
   firebase functions:config:set cosmethics.api_key="your-cosmethics-key"
   ```

2. **Deploy Cloud Functions**:
   ```bash
   firebase deploy --only functions
   ```

3. **Sync Products** (from frontend or via admin):
   ```typescript
   // Call syncProducts Cloud Function
   const result = await syncProducts({ tags: ['shampoo'], limit: 50 });
   ```

4. **Use Products Page**: The frontend will automatically fetch and display products from Firestore.

## 🔧 Troubleshooting

### API Not Available
- All adapters have fallback mechanisms (mock data or local knowledge base)
- Check console logs for API errors
- Verify API keys are correctly configured

### Products Not Syncing
- Check Cloud Functions logs: `firebase functions:log`
- Verify API keys are set correctly
- Ensure Firestore rules allow writes

### Reviews Not Showing
- Google Places API requires billing enabled
- Check API quota limits
- Verify API key has Places API enabled

## 📝 Notes

- **Caching**: All API calls are cached to reduce costs and improve performance
- **Rate Limiting**: Be mindful of API rate limits, especially for Google Places API
- **Cost Optimization**: Use caching and batch operations to minimize API calls
- **Fallbacks**: All adapters gracefully handle API failures with fallback data

