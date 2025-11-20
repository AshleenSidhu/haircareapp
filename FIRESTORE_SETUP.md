# Firestore Database Setup Guide

## ✅ Good News: Collections Are Auto-Created!

**You don't need to manually create collections in Firestore!** Collections are automatically created when you write the first document to them.

## 🔧 What You Need to Do

### 1. Deploy Firestore Security Rules

I've created `firestore.rules` file for you. You need to deploy it:

```bash
firebase deploy --only firestore:rules
```

Or if you don't have Firebase CLI installed:
1. Go to Firebase Console: https://console.firebase.google.com
2. Select your project: `hair-care-ad421`
3. Go to **Firestore Database** → **Rules** tab
4. Copy and paste the rules from `firestore.rules` file
5. Click **Publish**

### 2. Create Firestore Indexes (Optional but Recommended)

I've created `firestore.indexes.json` file. Deploy it:

```bash
firebase deploy --only firestore:indexes
```

Or manually in Firebase Console:
1. Go to **Firestore Database** → **Indexes** tab
2. Click **Create Index** if prompted
3. The indexes will be created automatically when you first query

### 3. Enable Firestore Database

If you just created the database, make sure it's enabled:

1. Go to Firebase Console
2. Select your project
3. Go to **Firestore Database**
4. If you see "Get Started", click it
5. Choose **Start in test mode** (we have rules, so it's safe)
6. Select a location (choose closest to your users)

## 📋 Collections That Will Be Created Automatically

When you sync products, these collections will be created:

1. **`products`** - Main product catalog
   - Created when you click "Sync Products"
   - Contains all product information

2. **`quizResults`** - User quiz answers
   - Created when users complete the quiz
   - Already exists if users have taken the quiz

3. **`users/{userId}/likedProducts`** - User's liked products
   - Created when a user likes a product
   - Subcollection under each user

4. **`users/{userId}/recommendations`** - User's recommendations
   - Created when recommendations are generated
   - Subcollection under each user

## 🚀 Quick Start

1. **Make sure Firestore is enabled** in Firebase Console
2. **Deploy security rules** (see above)
3. **Go to Products page** in your app
4. **Click "Sync Products"** button
5. **Collections will be created automatically!**

## 🔒 Security Rules Explained

The rules I created allow:
- ✅ **Products**: Anyone can read, only logged-in users can write
- ✅ **Quiz Results**: Users can only access their own
- ✅ **Liked Products**: Users can only access their own
- ✅ **Recommendations**: Users can only access their own

## ⚠️ Important Notes

- **No manual collection creation needed** - Firestore creates them automatically
- **Security rules are important** - They protect your data
- **Indexes help with queries** - They're created automatically when needed, but it's faster to deploy them upfront

## 🧪 Test It

After deploying rules, try syncing products:
1. Log in to your app
2. Go to `/products` page
3. Click "Sync Products from APIs"
4. Check Firebase Console → Firestore Database
5. You should see the `products` collection appear!

## 📝 What I Created For You

- ✅ `firestore.rules` - Security rules for your database
- ✅ `firestore.indexes.json` - Indexes for faster queries
- ✅ `firebase.json` - Firebase configuration file

All set! Just deploy the rules and start syncing products! 🎉

