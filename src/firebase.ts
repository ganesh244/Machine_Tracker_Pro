import { initializeApp } from 'firebase/app';
import { getFirestore, connectFirestoreEmulator } from 'firebase/firestore';
import { getAuth, connectAuthEmulator } from 'firebase/auth';
import { getStorage } from 'firebase/storage';

// Use environment variables for production readiness
const env = (import.meta as any).env;
const useProductionFirebase = env.VITE_USE_PRODUCTION_FIREBASE === 'true';
const isUsingEmulator = env.DEV && !useProductionFirebase;

const firebaseConfig = isUsingEmulator
  ? {
      apiKey: env.VITE_FIREBASE_API_KEY || 'demo-api-key',
      authDomain: env.VITE_FIREBASE_AUTH_DOMAIN || 'demo-farmmech.firebaseapp.com',
      projectId: env.VITE_FIREBASE_PROJECT_ID || 'demo-farmmech',
      storageBucket: env.VITE_FIREBASE_STORAGE_BUCKET || 'demo-farmmech.appspot.com',
      messagingSenderId: env.VITE_FIREBASE_MESSAGING_SENDER_ID || '000000000000',
      appId: env.VITE_FIREBASE_APP_ID || '1:000000000000:web:demo'
    }
  : {
      apiKey: env.VITE_FIREBASE_API_KEY,
      authDomain: env.VITE_FIREBASE_AUTH_DOMAIN,
      projectId: env.VITE_FIREBASE_PROJECT_ID,
      storageBucket: env.VITE_FIREBASE_STORAGE_BUCKET,
      messagingSenderId: env.VITE_FIREBASE_MESSAGING_SENDER_ID,
      appId: env.VITE_FIREBASE_APP_ID
    };

const app = initializeApp(firebaseConfig);
const firestoreDatabaseId = (env.VITE_FIREBASE_DATABASE_ID || '').trim();
export const db = firestoreDatabaseId ? getFirestore(app, firestoreDatabaseId) : getFirestore(app);
export const auth = getAuth(app);

// Connect to local Firebase Emulator only in development
if (isUsingEmulator) {
  console.log('Connecting to local Firebase emulators...');
  connectFirestoreEmulator(db, 'localhost', 8080);
  connectAuthEmulator(auth, 'http://localhost:9099');
}

if (env.DEV) {
  console.log(
    'Firebase project:',
    firebaseConfig.projectId,
    'mode:',
    isUsingEmulator ? 'emulator' : 'cloud',
    'firestoreDb:',
    firestoreDatabaseId || '(default)'
  );
}

export const storage = getStorage(app);
