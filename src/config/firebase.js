import { initializeApp } from 'firebase/app';
import { getAuth } from 'firebase/auth';
import { getFirestore } from 'firebase/firestore';
import { getAnalytics } from 'firebase/analytics';

const firebaseConfig = {
  apiKey: process.env.REACT_APP_FIREBASE_API_KEY,
  authDomain: process.env.REACT_APP_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.REACT_APP_FIREBASE_PROJECT_ID,
  storageBucket: process.env.REACT_APP_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.REACT_APP_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.REACT_APP_FIREBASE_APP_ID,
  measurementId: process.env.REACT_APP_FIREBASE_MEASUREMENT_ID
};

// Validate configuration
if (!firebaseConfig.apiKey) {
  throw new Error('Firebase API key is missing. Make sure your .env file is properly configured.');
}

// Initialize Firebase
let app;
let analytics;

try {
  app = initializeApp(firebaseConfig);
  // Only initialize analytics in production and if it's available
  if (process.env.NODE_ENV === 'production' && typeof window !== 'undefined') {
    analytics = getAnalytics(app);
  }
} catch (error) {
  console.error('Error initializing Firebase:', error);
  throw error;
}

export const auth = getAuth(app);
export const db = getFirestore(app);

// Enable offline persistence
// enableIndexedDbPersistence(db)
//   .catch((err) => {
//     if (err.code === 'failed-precondition') {
//       console.warn('Firebase persistence failed: Multiple tabs open');
//     } else if (err.code === 'unimplemented') {
//       console.warn('Firebase persistence not supported in this browser');
//     }
//   });

console.log('Firebase initialized successfully');

export { analytics };
export default app;
