# AI Chat Setup Guide

## Why You're Seeing Mock Responses

The AI chat is currently showing mock responses because the AI API key is not configured. The chat supports both **Google Gemini** and **OpenAI** APIs.

The chat has three modes:
1. **Firebase Cloud Function** (Recommended - Secure) ✅
2. **Direct API** (Requires API key in frontend)
3. **Mock Responses** (Fallback - What you're seeing now)

## Option 1: Firebase Cloud Function (Recommended)

This keeps your API key secure on the backend.

### Using Google Gemini (Recommended - Free tier available)

#### Step 1: Get Gemini API Key
1. Go to https://makersuite.google.com/app/apikey
2. Create a new API key
3. Copy the key

#### Step 2: Set Gemini API Key in Firebase Functions

```bash
# Option A: Using Firebase Functions config (v1)
cd functions
firebase functions:config:set gemini.api_key="your-gemini-api-key-here"

# Option B: Using environment variable (v2 - recommended)
# Add to functions/.env or set in Firebase Console
GEMINI_API_KEY=your-gemini-api-key-here
```

#### Step 3: Deploy the Function

```bash
cd functions
npm run build
firebase deploy --only functions:chatWithAI
```

### Using OpenAI

#### Step 1: Set OpenAI API Key in Firebase Functions

```bash
# Option A: Using Firebase Functions config (v1)
cd functions
firebase functions:config:set openai.api_key="your-openai-api-key-here"

# Option B: Using environment variable (v2 - recommended)
# Add to functions/.env or set in Firebase Console
OPENAI_API_KEY=your-openai-api-key-here
```

#### Step 2: Deploy the Function

```bash
cd functions
npm run build
firebase deploy --only functions:chatWithAI
```

### Step 3: Configure Provider (Optional)

By default, the function uses Gemini. To use OpenAI, set in frontend `.env`:
```env
REACT_APP_AI_PROVIDER=openai
```

Or keep default (Gemini):
```env
REACT_APP_AI_PROVIDER=gemini
```

## Option 2: Direct API (Less Secure)

If you want to use direct API calls (not recommended for production):

### Using Google Gemini

#### Step 1: Get Gemini API Key
1. Go to https://makersuite.google.com/app/apikey
2. Create a new API key
3. Copy the key

#### Step 2: Add to Frontend .env

Add to your `.env` file in the project root:

```env
REACT_APP_GEMINI_API_KEY=your-gemini-api-key-here
REACT_APP_AI_PROVIDER=gemini
```

### Using OpenAI

#### Step 1: Get OpenAI API Key
1. Go to https://platform.openai.com/api-keys
2. Create a new API key
3. Copy the key

#### Step 2: Add to Frontend .env

```env
REACT_APP_OPENAI_API_KEY=sk-your-api-key-here
REACT_APP_AI_PROVIDER=openai
```

### Step 3: Restart Dev Server

```bash
npm start
```

**⚠️ Warning**: This exposes your API key in the frontend code. Anyone can see it in the browser. Use Firebase Functions instead for production.

## Option 3: Keep Mock Responses (Testing Only)

The mock responses are fine for testing the UI, but won't provide real AI responses.

## Current Implementation

The chat service tries in this order:
1. Firebase Cloud Function (`chatWithAI`) - if deployed (supports Gemini or OpenAI)
2. Direct Gemini API - if `REACT_APP_GEMINI_API_KEY` is set and provider is 'gemini'
3. Direct OpenAI API - if `REACT_APP_OPENAI_API_KEY` is set and provider is 'openai'
4. Mock responses - fallback

## Gemini vs OpenAI

**Google Gemini:**
- ✅ Free tier available (60 requests/minute)
- ✅ Good performance
- ✅ Easy to set up
- ✅ Recommended for most use cases

**OpenAI:**
- ✅ Very high quality responses
- ❌ Requires paid API key
- ✅ GPT-4 models available

Default: Gemini (can be changed via `REACT_APP_AI_PROVIDER`)

## Troubleshooting

### "Message blocked" or validation errors
- Check that your message is under 200 characters
- Check that it doesn't contain forbidden words
- See the character counter below the input

### Still seeing mock responses
1. Check browser console for errors
2. Verify Firebase function is deployed: `firebase functions:list`
3. Check that API key is set correctly
4. Try Option 2 (direct API) to test if OpenAI is working

### Firebase Function Errors
- Check Firebase Functions logs: `firebase functions:log`
- Verify API key is set: `firebase functions:config:get`
- Make sure function is deployed to correct region

## Next Steps

1. **For Production**: Use Firebase Cloud Function (Option 1)
2. **For Development**: Either use Firebase Function or Direct API
3. **For Testing UI**: Mock responses work fine

The chat is fully implemented with GPT-4 support - you just need to configure the API key!

