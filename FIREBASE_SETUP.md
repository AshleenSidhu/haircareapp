# Firebase Setup Guide

## Error: Firebase Invalid API Key

You're seeing this error because Firebase environment variables are not configured. Follow these steps to fix it:

## Step 1: Get Your Firebase Configuration

1. Go to [Firebase Console](https://console.firebase.google.com/)
2. Select your project (or create a new one)
3. Click the gear icon ⚙️ next to "Project Overview"
4. Select **"Project settings"**
5. Scroll down to **"Your apps"** section
6. If you don't have a web app yet:
   - Click **"</>"** (Web) icon
   - Register your app with a nickname (e.g., "HairCare Web App")
   - Click **"Register app"**
7. Copy the `firebaseConfig` object values

## Step 2: Create .env File

Create a file named `.env` in the **root directory** of your project (same level as `package.json`) with the following content:

```env
REACT_APP_FIREBASE_API_KEY=your_api_key_here
REACT_APP_FIREBASE_AUTH_DOMAIN=your_project_id.firebaseapp.com
REACT_APP_FIREBASE_PROJECT_ID=your_project_id
REACT_APP_FIREBASE_STORAGE_BUCKET=your_project_id.appspot.com
REACT_APP_FIREBASE_MESSAGING_SENDER_ID=your_messaging_sender_id
REACT_APP_FIREBASE_APP_ID=your_app_id
REACT_APP_FIREBASE_MEASUREMENT_ID=your_measurement_id_optional
```

**Replace the placeholder values** with your actual Firebase config values from Step 1.

### Example:
```env
REACT_APP_FIREBASE_API_KEY=AIzaSyBxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
REACT_APP_FIREBASE_AUTH_DOMAIN=my-haircare-app.firebaseapp.com
REACT_APP_FIREBASE_PROJECT_ID=my-haircare-app
REACT_APP_FIREBASE_STORAGE_BUCKET=my-haircare-app.appspot.com
REACT_APP_FIREBASE_MESSAGING_SENDER_ID=123456789012
REACT_APP_FIREBASE_APP_ID=1:123456789012:web:abcdef123456
REACT_APP_FIREBASE_MEASUREMENT_ID=G-XXXXXXXXXX
```

## Step 3: Enable Google Authentication

1. In Firebase Console, go to **Authentication** > **Sign-in method**
2. Click on **Google**
3. Toggle **Enable**
4. Set a **Project support email**
5. Click **Save**

## Step 4: Restart Development Server

After creating the `.env` file:

1. **Stop** your current development server (Ctrl+C)
2. **Restart** it with `npm start`

**Important:** Create React App only reads `.env` files when the server starts, so you must restart after creating or modifying the `.env` file.

## Troubleshooting

### Still seeing the error?
- ✅ Make sure `.env` is in the root directory (not in `src/`)
- ✅ Make sure all variable names start with `REACT_APP_`
- ✅ Make sure there are no spaces around the `=` sign
- ✅ Make sure you restarted the development server
- ✅ Check the browser console for more detailed error messages

### Can't find your Firebase config?
- Go to Firebase Console > Project Settings > General
- Scroll to "Your apps" section
- Click on your web app
- The config object will be shown there

## Security Note

⚠️ **Never commit your `.env` file to Git!** It's already in `.gitignore`, but make sure it stays that way. The `.env` file contains sensitive credentials.

