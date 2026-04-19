// ─── Firebase Client (INACTIVE) ──────────────────────────────────────────────
// To switch to Firebase:
// 1. Install: npm install firebase
// 2. Uncomment the code below
// 3. In store/useAuthStore.ts, replace the Supabase auth calls with the
//    Firebase equivalents exported from this file
// 4. Add your Firebase env vars to .env and app.config.ts
// ─────────────────────────────────────────────────────────────────────────────

// import { initializeApp, getApps, getApp } from 'firebase/app';
// import {
//   getAuth,
//   signInWithEmailAndPassword,
//   createUserWithEmailAndPassword,
//   signOut,
//   sendPasswordResetEmail,
//   onAuthStateChanged,
//   updateProfile,
// } from 'firebase/auth';

// const firebaseConfig = {
//   apiKey: process.env.EXPO_PUBLIC_FIREBASE_API_KEY,
//   authDomain: process.env.EXPO_PUBLIC_FIREBASE_AUTH_DOMAIN,
//   projectId: process.env.EXPO_PUBLIC_FIREBASE_PROJECT_ID,
//   storageBucket: process.env.EXPO_PUBLIC_FIREBASE_STORAGE_BUCKET,
//   messagingSenderId: process.env.EXPO_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
//   appId: process.env.EXPO_PUBLIC_FIREBASE_APP_ID,
// };

// const app = getApps().length === 0 ? initializeApp(firebaseConfig) : getApp();
// export const firebaseAuth = getAuth(app);

// export const firebaseSignIn = (email: string, password: string) =>
//   signInWithEmailAndPassword(firebaseAuth, email, password);

// export const firebaseSignUp = (email: string, password: string) =>
//   createUserWithEmailAndPassword(firebaseAuth, email, password);

// export const firebaseSignOut = () => signOut(firebaseAuth);

// export const firebaseResetPassword = (email: string) =>
//   sendPasswordResetEmail(firebaseAuth, email);

// export const firebaseOnAuthStateChanged = onAuthStateChanged;
// export const firebaseUpdateProfile = updateProfile;

export {};
