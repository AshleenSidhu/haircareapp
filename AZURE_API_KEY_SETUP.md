# ⚠️ IMPORTANT: Set Your Azure OpenAI API Key

The Azure OpenAI endpoint, deployment, and API version have been configured, but **you need to set your API key**.

## 🔑 Set the API Key

Run this command (replace `your-api-key-here` with your actual Azure API key):

```bash
firebase functions:config:set azure.openai_api_key="your-api-key-here"
```

## 📋 Quick Setup Checklist

- ✅ Endpoint configured: `https://ashle-mi7yrktu-eastus2.cognitiveservices.azure.com/`
- ✅ Deployment configured: `gpt-5-nano`
- ✅ API version configured: `2024-12-01-preview`
- ⚠️ **API Key**: You need to set this!

## 🚀 After Setting the Key

1. Deploy the function:
   ```bash
   cd functions
   npm run build
   firebase deploy --only functions:chatWithAI
   ```

2. Update your frontend `.env` file:
   ```env
   REACT_APP_AI_PROVIDER=azure
   ```

3. Restart your dev server and test the chat!

## 🔍 Find Your API Key

1. Go to Azure Portal
2. Navigate to your Azure OpenAI resource
3. Go to "Keys and Endpoint" section
4. Copy one of the keys (KEY 1 or KEY 2)

