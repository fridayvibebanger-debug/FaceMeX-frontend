import { initializeApp, getApps } from 'firebase/app';
import { getStorage } from 'firebase/storage';
import { getAuth } from 'firebase/auth';

const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
  appId: import.meta.env.VITE_FIREBASE_APP_ID,
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
};

if (!firebaseConfig.apiKey || !firebaseConfig.projectId) {
  console.warn('Firebase env vars are missing. Set VITE_FIREBASE_API_KEY, VITE_FIREBASE_PROJECT_ID, etc. in environment variables.');
}

export function getFirebaseApp() {
  if (!getApps().length) {
    return initializeApp(firebaseConfig);
  }
  return getApps()[0];
}

export function getFirebaseStorage() {
  const app = getFirebaseApp();
  return getStorage(app);
}

export function getFirebaseAuth() {
  const app = getFirebaseApp();
  return getAuth(app);
}
