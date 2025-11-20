# Azure OpenAI Setup Guide

Your chat has been configured to use Microsoft Azure AI Foundry (Azure OpenAI).

## ✅ What's Been Done

1. ✅ Added `openai` package to `functions/package.json`
2. ✅ Updated Firebase Cloud Function to support Azure OpenAI
3. ✅ Updated frontend to use Azure as default provider
4. ✅ Installed dependencies

## 🔧 Environment Variables

Add these to your `.env` file in the **project root** (for frontend):

```env
REACT_APP_AI_PROVIDER=azure
```

Add these to your **Firebase Functions** environment (choose one method):

### Option 1: Firebase Runtime Config (Recommended)

```bash
cd functions
firebase functions:config:set azure.openai_endpoint="https://ashle-mi7yrktu-eastus2.cognitiveservices.azure.com/"
firebase functions:config:set azure.openai_api_key="your-api-key-here"
firebase functions:config:set azure.openai_deployment="gpt-5-nano"
firebase functions:config:set azure.openai_api_version="2024-12-01-preview"
```

### Option 2: Environment Variables in Functions

Create a `functions/.env` file (for local development):

```env
AZURE_OPENAI_ENDPOINT=https://ashle-mi7yrktu-eastus2.cognitiveservices.azure.com/
AZURE_OPENAI_API_KEY=your-api-key-here
AZURE_OPENAI_DEPLOYMENT=gpt-5-nano
AZURE_OPENAI_API_VERSION=2024-12-01-preview
```

**Note:** For production, use Firebase Runtime Config (Option 1) as environment variables in `.env` files are not automatically deployed.

## 📝 Configuration Details

Based on your Azure setup:

- **Endpoint**: `https://ashle-mi7yrktu-eastus2.cognitiveservices.azure.com/`
- **Model/Deployment**: `gpt-5-nano`
- **API Version**: `2024-12-01-preview`
- **API Key**: Your subscription key (from Azure portal)

## 🚀 Deploy

After setting up the configuration:

```bash
cd functions
npm run build
firebase deploy --only functions:chatWithAI
```

## 🧪 Test

1. Restart your frontend dev server
2. Open the chat page
3. Send a test message
4. Check Firebase Functions logs if there are issues:
   ```bash
   firebase functions:log --only chatWithAI
   ```

## 🔍 Troubleshooting

### "Azure OpenAI configuration not found"

- Verify the environment variables are set correctly
- Check Firebase Runtime Config: `firebase functions:config:get`
- Ensure you've deployed the function after setting config

### "API key not accessible"

- Make sure you're using Firebase Runtime Config for production
- For local testing, use `functions/.env` file
- Check function logs for detailed error messages

### Still using old provider?

- Check `.env` file has `REACT_APP_AI_PROVIDER=azure`
- Restart your dev server after changing `.env`

## 📚 Additional Resources

- [Azure OpenAI Documentation](https://learn.microsoft.com/en-us/azure/ai-services/openai/)
- [OpenAI SDK for Node.js](https://github.com/openai/openai-node)

