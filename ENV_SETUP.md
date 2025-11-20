# Environment Variables Setup

## ✅ API Keys Integrated

The following API keys have been integrated into the `.env` file and adapters:

### 1. BeautyFeeds.io API ✅
- **API Key**: `f6b8e2e95439818289c2b0acbfb90b12d82210a8`
- **Status**: ✅ Configured in `.env` as `REACT_APP_BEAUTYFEEDS_API_KEY`
- **Usage**: Primary source for product info, images, brand, and pricing
- **Location**: 
  - Frontend: `src/lib/adapters/BeautyFeedsAdapter.ts`
  - Backend: `functions/src/adapters/BeautyFeedsAdapter.ts`

### 2. Open Beauty Facts ✅
- **API Key**: Not required (free, open-source)
- **Status**: ✅ No configuration needed
- **Usage**: Additional ingredient information, allergen info, sustainability labels

### 3. OpenAI API ⚠️
- **Status**: Needs your API key
- **Environment Variable**: `REACT_APP_OPENAI_API_KEY`
- **Usage**: AI-generated ingredient explanations and product recommendations
- **Get your key**: https://platform.openai.com/api-keys

### 4. Cosmethics/INCI API ⚠️
- **Status**: Optional - configure if you have an API key
- **Environment Variable**: `REACT_APP_COSMETHICS_API_KEY`
- **Usage**: Ingredient safety scores and scientific explanations
- **Fallback**: Uses local knowledge base if not configured

### 5. Google Places API ⚠️
- **Status**: Optional - configure if you have an API key
- **Environment Variable**: `REACT_APP_GOOGLE_PLACES_API_KEY`
- **Usage**: Product reviews and ratings
- **Get your key**: https://console.cloud.google.com/apis/credentials
- **Fallback**: Uses mock reviews if not configured

## 📝 .env File Structure

Your `.env` file should contain:

```env
# Firebase Configuration (already configured)
REACT_APP_FIREBASE_API_KEY=your-firebase-api-key
REACT_APP_FIREBASE_AUTH_DOMAIN=your-project.firebaseapp.com
REACT_APP_FIREBASE_PROJECT_ID=your-project-id
REACT_APP_FIREBASE_STORAGE_BUCKET=your-project.appspot.com
REACT_APP_FIREBASE_MESSAGING_SENDER_ID=your-sender-id
REACT_APP_FIREBASE_APP_ID=your-app-id
REACT_APP_FIREBASE_MEASUREMENT_ID=your-measurement-id

# OpenAI API (for AI recommendations)
REACT_APP_OPENAI_API_KEY=your-openai-api-key-here
REACT_APP_AI_MODEL=gpt-3.5-turbo

# BeautyFeeds.io API ✅ CONFIGURED
REACT_APP_BEAUTYFEEDS_API_KEY=f6b8e2e95439818289c2b0acbfb90b12d82210a8
REACT_APP_BEAUTYFEEDS_API_URL=https://api.beautyfeeds.io/v1

# Cosmethics/INCI API (optional)
REACT_APP_COSMETHICS_API_KEY=your-cosmethics-api-key
REACT_APP_COSMETHICS_API_URL=https://api.cosmethics.com/v1

# Google Places API (optional)
REACT_APP_GOOGLE_PLACES_API_KEY=your-google-places-api-key
```

## 🔧 How It Works

### Frontend (React)
- All API keys use `REACT_APP_` prefix (required by Create React App)
- Keys are loaded from `.env` file via `process.env.REACT_APP_*`
- Adapters automatically use environment variables with fallbacks

### Backend (Firebase Cloud Functions)
- API keys can be set via:
  1. Environment variables: `export BEAUTYFEEDS_API_KEY="your-key"`
  2. Firebase Functions config: `firebase functions:config:set beautyfeeds.api_key="your-key"`
- Adapters check both sources with fallback to hardcoded key (for BeautyFeeds)

## 🚀 Next Steps

1. **Restart your dev server** to load new environment variables:
   ```bash
   npm start
   ```

2. **Add your OpenAI API key** (if you have one):
   ```env
   REACT_APP_OPENAI_API_KEY=sk-your-key-here
   ```

3. **Add optional API keys** (if you have them):
   - Cosmethics API key for enhanced ingredient safety
   - Google Places API key for real reviews

4. **Test the integrations**:
   - BeautyFeeds API is ready to use
   - Open Beauty Facts works without configuration
   - Other APIs will use fallbacks if not configured

## ⚠️ Security Notes

- **Never commit `.env` file to Git** (it's in `.gitignore`)
- API keys in client-side code are visible in browser
- For production, consider using Firebase Functions as a proxy
- Monitor API usage in respective dashboards

## 📚 Adapter Files Updated

- ✅ `src/lib/adapters/BeautyFeedsAdapter.ts` - Now uses `REACT_APP_BEAUTYFEEDS_API_KEY`
- ✅ `functions/src/adapters/BeautyFeedsAdapter.ts` - Uses env vars or Firebase config
- ✅ `src/lib/adapters/IngredientAdapter.ts` - Optional Cosmethics API support
- ✅ `functions/src/adapters/IngredientAdapter.ts` - Cosmethics API integration

All adapters have fallback mechanisms, so the app works even without all API keys configured!

