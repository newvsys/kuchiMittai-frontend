import { initializeApp, getApps, getApp, FirebaseApp } from 'firebase/app';

export const firebaseConfig = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY!,
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN!,
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID!,
  storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET!,
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID!,
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID!,
};

export function getFirebaseApp(): FirebaseApp {
  return getApps().length ? getApp() : initializeApp(firebaseConfig);
}

/**
 * Lazily returns the Firebase Messaging instance.
 * Returns null on the server or in browsers that don't support FCM.
 */
export async function getFirebaseMessaging() {
  if (typeof window === 'undefined') return null;
  const { getMessaging, isSupported } = await import('firebase/messaging');
  const supported = await isSupported();
  if (!supported) return null;
  return getMessaging(getFirebaseApp());
}
