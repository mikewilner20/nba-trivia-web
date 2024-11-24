import {
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  signOut as firebaseSignOut,
  onAuthStateChanged
} from 'firebase/auth';
import { doc, setDoc } from 'firebase/firestore';
import { auth, db } from '../config/firebase';

// Collection names
export const USER_COLLECTION = 'users';
export const USER_STATS_COLLECTION = 'userStats';

// Track the current user state
let currentUser = null;

// Set up auth state listener
onAuthStateChanged(auth, (user) => {
  currentUser = user;
  if (user) {
    console.log('User is signed in:', user.uid);
  } else {
    console.log('User is signed out');
  }
});

// Get the current user, waiting for auth to initialize if necessary
export const getCurrentUser = () => {
  // If we already have a user (or null), return it
  if (currentUser !== undefined) {
    return currentUser;
  }
  
  // If auth hasn't initialized yet, use the direct Firebase auth
  return auth.currentUser;
};

export const signIn = async (email, password) => {
  try {
    const response = await signInWithEmailAndPassword(auth, email, password);
    return response.user;
  } catch (error) {
    console.error('Sign in error:', error);
    throw error;
  }
};

export const signUp = async (email, password) => {
  try {
    const response = await createUserWithEmailAndPassword(auth, email, password);
    const user = response.user;
    
    try {
      // Initialize user document in Firestore
      await setDoc(doc(db, USER_COLLECTION, user.uid), {
        email: user.email,
        createdAt: new Date().toISOString(),
      });
    } catch (error) {
      console.error('Error creating user profile:', error);
      // Continue with signup even if profile creation fails
    }

    try {
      // Initialize user stats
      await setDoc(doc(db, USER_STATS_COLLECTION, user.uid), {
        userId: user.uid,
        email: user.email,
        totalGamesPlayed: 0,
        totalScore: 0,
        highScore: 0,
        lastPlayed: null,
        createdAt: new Date().toISOString()
      });
    } catch (error) {
      console.error('Error creating user stats:', error);
      // Continue with signup even if stats creation fails
    }
    
    return user;
  } catch (error) {
    console.error('Sign up error:', error);
    throw error;
  }
};

export const signOut = async () => {
  try {
    await firebaseSignOut(auth);
    currentUser = null; // Clear the cached user
  } catch (error) {
    console.error('Sign out error:', error);
    throw error;
  }
};

// Helper function to check if user is authenticated
export const isAuthenticated = () => {
  const user = getCurrentUser();
  return !!user;
};
