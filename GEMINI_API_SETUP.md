# Gemini API Key Setup



## ✅ Already Configured

The API key has been set in Firebase Functions config using:
```bash
firebase functions:config:set gemini.api_key="AIzaSyBR_eIwxP9SRkN-EIpamOcD8x6oKypu_MI"
```

## 🚀 Next Steps

### 1. Deploy the Functions

Deploy your Firebase Functions to make the API key available:

```bash
cd functions
npm run build
firebase deploy --only functions:chatWithAI
```

### 2. For Local Development (Optional)

If you want to test locally, you can also set it as an environment variable:

**Windows (PowerShell):**
```powershell
$env:GEMINI_API_KEY="AIzaSyBR_eIwxP9SRkN-EIpamOcD8x6oKypu_MI"
```

**Windows (CMD):**
```cmd
set GEMINI_API_KEY=AIzaSyBR_eIwxP9SRkN-EIpamOcD8x6oKypu_MI
```

**Linux/Mac:**
```bash
export GEMINI_API_KEY="AIzaSyBR_eIwxP9SRkN-EIpamOcD8x6oKypu_MI"
```

Or add to your `.env` file in the `functions` directory:
```
GEMINI_API_KEY=AIzaSyBR_eIwxP9SRkN-EIpamOcD8x6oKypu_MI
```

### 3. Test the Chat

After deploying, restart your frontend and test the chat. You should now get real AI responses instead of mock responses!

## 📝 Notes

- The API key is stored securely in Firebase Functions config
- For production, the key is only accessible from your Firebase Functions
- The chat will automatically use Gemini as the AI provider
- Free tier: 60 requests/minute (generous for testing)

## 🔍 Troubleshooting

If you still see mock responses:

1. **Check browser console** for error messages
2. **Verify deployment**: Make sure `chatWithAI` function is deployed
3. **Check function logs**: 
   ```bash
   firebase functions:log --only chatWithAI
   ```
4. **Verify API key**: The key should be accessible from the function

## 🔐 Security

- Never commit API keys to git
- The key is stored securely in Firebase
- Only your Firebase Functions can access it
- Frontend code never sees the API key directly

