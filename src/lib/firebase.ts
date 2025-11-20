import { initializeApp } from 'firebase/app';
import { getAuth } from 'firebase/auth';
import { getFirestore } from 'firebase/firestore';
import { getStorage } from 'firebase/storage';
import { getAnalytics } from 'firebase/analytics';
import { getFunctions, httpsCallable } from 'firebase/functions';

// Firebase configuration from environment variables
const firebaseConfig = {
  apiKey: process.env.REACT_APP_FIREBASE_API_KEY?.trim(),
  authDomain: process.env.REACT_APP_FIREBASE_AUTH_DOMAIN?.trim(),
  projectId: process.env.REACT_APP_FIREBASE_PROJECT_ID?.trim(),
  storageBucket: process.env.REACT_APP_FIREBASE_STORAGE_BUCKET?.trim(),
  messagingSenderId: process.env.REACT_APP_FIREBASE_MESSAGING_SENDER_ID?.trim(),
  appId: process.env.REACT_APP_FIREBASE_APP_ID?.trim(),
  measurementId: process.env.REACT_APP_FIREBASE_MEASUREMENT_ID?.trim(),
};

// Validate that required config values are present
if (!firebaseConfig.apiKey || !firebaseConfig.projectId) {
  const errorMessage = `
╔══════════════════════════════════════════════════════════════╗
║  Firebase Configuration Error                                ║
╠══════════════════════════════════════════════════════════════╣
║  Missing required Firebase environment variables.            ║
║                                                              ║
║  Please create a .env file in the project root with:        ║
║                                                              ║
║  REACT_APP_FIREBASE_API_KEY=your_api_key                    ║
║  REACT_APP_FIREBASE_AUTH_DOMAIN=your_project.firebaseapp.com║
║  REACT_APP_FIREBASE_PROJECT_ID=your_project_id              ║
║  REACT_APP_FIREBASE_STORAGE_BUCKET=your_project.appspot.com ║
║  REACT_APP_FIREBASE_MESSAGING_SENDER_ID=your_sender_id      ║
║  REACT_APP_FIREBASE_APP_ID=your_app_id                      ║
║                                                              ║
║  Get these from: Firebase Console > Project Settings >      ║
║  General > Your apps > Web app                              ║
║                                                              ║
║  After creating .env, restart the development server.       ║
╚══════════════════════════════════════════════════════════════╝
  `;
  console.error(errorMessage);
  console.error('Current status:', {
    apiKey: firebaseConfig.apiKey ? '✓ Found' : '✗ Missing',
    projectId: firebaseConfig.projectId ? '✓ Found' : '✗ Missing',
    authDomain: firebaseConfig.authDomain ? '✓ Found' : '✗ Missing',
  });
  
  // Throw a more helpful error
  throw new Error(
    'Firebase configuration is missing. Please create a .env file with your Firebase credentials. ' +
    'See .env.example for the required variables.'
  );
}

// Initialize Firebase
let app;
try {
  app = initializeApp(firebaseConfig);
} catch (error: any) {
  console.error('Failed to initialize Firebase:', error);
  throw new Error(
    `Firebase initialization failed: ${error.message}. ` +
    'Please check your .env file and ensure all Firebase configuration values are correct.'
  );
}

// Initialize Analytics (only in browser environment)
let analytics: ReturnType<typeof getAnalytics> | null = null;
if (typeof window !== 'undefined') {
  try {
    analytics = getAnalytics(app);
  } catch (error) {
    console.warn('Firebase Analytics initialization failed:', error);
  }
}

export const auth = getAuth(app);
export const db = getFirestore(app);
export const storage = getStorage(app);
export { analytics };

// Initialize Firebase Functions
const functions = getFunctions(app, 'northamerica-northeast1');

// Export callable functions with explicit region
export const getProductDetails = httpsCallable(functions, 'getProductDetails');
export const syncProducts = httpsCallable(functions, 'syncProducts');
