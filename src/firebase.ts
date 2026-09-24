import { initializeApp } from 'firebase/app';
import { getFirestore, connectFirestoreEmulator } from 'firebase/firestore';
import { getAuth, connectAuthEmulator } from 'firebase/auth';
import { getStorage } from 'firebase/storage';
import defaultAppletConfig from '../firebase-applet-config.json';

// Use environment variables or fallback to applet configuration
const env = (import.meta as any).env || {};

const firebaseConfig = {
  apiKey: env.VITE_FIREBASE_API_KEY || defaultAppletConfig.apiKey,
  authDomain: env.VITE_FIREBASE_AUTH_DOMAIN || defaultAppletConfig.authDomain,
  projectId: env.VITE_FIREBASE_PROJECT_ID || defaultAppletConfig.projectId,
  storageBucket: env.VITE_FIREBASE_STORAGE_BUCKET || defaultAppletConfig.storageBucket,
  messagingSenderId: env.VITE_FIREBASE_MESSAGING_SENDER_ID || defaultAppletConfig.messagingSenderId,
  appId: env.VITE_FIREBASE_APP_ID || defaultAppletConfig.appId
};

const app = initializeApp(firebaseConfig);
const firestoreDatabaseId = (env.VITE_FIREBASE_DATABASE_ID || defaultAppletConfig.firestoreDatabaseId || '').trim();
export const db = firestoreDatabaseId ? getFirestore(app, firestoreDatabaseId) : getFirestore(app);
export const auth = getAuth(app);
export const storage = getStorage(app);

// Only connect to local emulator if explicitly enabled
const useEmulator = env.VITE_USE_FIREBASE_EMULATOR === 'true';
if (useEmulator) {
  console.log('Connecting to local Firebase emulators on 8080/9099...');
  try {
    connectFirestoreEmulator(db, 'localhost', 8080);
    connectAuthEmulator(auth, 'http://localhost:9099');
  } catch (e) {
    console.warn('Could not connect to Firebase emulator:', e);
  }
}

if (env.DEV) {
  console.log(
    'Firebase connected to:',
    firebaseConfig.projectId,
    'Database ID:',
    firestoreDatabaseId || '(default)'
  );
}
