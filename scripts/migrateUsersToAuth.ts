import fs from 'node:fs';
import path from 'node:path';
import dotenv from 'dotenv';
import { initializeApp as initAdminApp, cert } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';
import { getAuth as getAdminAuth } from 'firebase-admin/auth';
import { initializeApp as initClientApp } from 'firebase/app';
import { getAuth as getClientAuth, sendSignInLinkToEmail } from 'firebase/auth';
import * as readline from 'node:readline/promises';
import { parseArgs } from 'node:util';

dotenv.config({ path: path.resolve(process.cwd(), '.env.local') });
dotenv.config({ path: path.resolve(process.cwd(), '.env') });

const initAdmin = () => {
  const saPath = process.env.GOOGLE_SERVICE_ACCOUNT_JSON_PATH;
  const saJson = process.env.GOOGLE_SERVICE_ACCOUNT_JSON;
  let credential;
  if (saPath) {
    credential = cert(JSON.parse(fs.readFileSync(path.resolve(process.cwd(), saPath), 'utf8')));
  } else if (saJson) {
    credential = cert(JSON.parse(saJson));
  } else if (process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL && process.env.GOOGLE_SERVICE_ACCOUNT_PRIVATE_KEY) {
    credential = cert({
      clientEmail: process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL,
      privateKey: process.env.GOOGLE_SERVICE_ACCOUNT_PRIVATE_KEY.replace(/\\n/g, '\n'),
      projectId: process.env.VITE_FIREBASE_PROJECT_ID || process.env.FIREBASE_PROJECT_ID
    });
  } else {
    throw new Error('No service account credentials found in .env.local');
  }
  initAdminApp({ credential, projectId: process.env.VITE_FIREBASE_PROJECT_ID || process.env.FIREBASE_PROJECT_ID });
  const databaseId = process.env.VITE_FIREBASE_DATABASE_ID || undefined;
  return databaseId ? getFirestore(databaseId) : getFirestore();
};

const db = initAdmin();
const adminAuth = getAdminAuth();

const clientApp = initClientApp({
  apiKey: process.env.VITE_FIREBASE_API_KEY,
  authDomain: process.env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.VITE_FIREBASE_PROJECT_ID,
});
const clientAuth = getClientAuth(clientApp);

const actionCodeSettings = {
  // URL you want to redirect back to. The domain (www.example.com) for this
  // URL must be in the authorized domains list in the Firebase Console.
  url: 'http://localhost:3000',
  handleCodeInApp: true,
};

const askForConfirmation = async (question: string): Promise<boolean> => {
  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout,
  });
  const answer = await rl.question(question);
  rl.close();
  return answer.toLowerCase() === 'yes';
};

async function migrateUsers() {
  const { values } = parseArgs({
    options: {
      uid: { type: 'string' },
      email: { type: 'string' },
    },
    strict: false,
  });

  const singleUid = values.uid;
  const singleEmail = values.email;

  if (!singleUid && !singleEmail) {
    console.warn('\nWARNING: You are about to run the migration script against ALL users in the database.');
    console.warn('This will create Firebase Auth accounts and send sign-in emails to everyone.');
    const confirmed = await askForConfirmation('Type "yes" to confirm and proceed: ');
    if (!confirmed) {
      console.log('Migration cancelled.');
      return;
    }
  }

  console.log('Starting User Migration...');
  
  let query: FirebaseFirestore.Query = db.collection('users');
  if (singleUid) {
    console.log(`Filtering for single UID: ${singleUid}`);
    query = query.where('uid', '==', singleUid);
  } else if (singleEmail) {
    console.log(`Filtering for single Email: ${singleEmail}`);
    query = query.where('email', '==', singleEmail);
  }

  const usersSnap = await query.get();
  let count = 0;

  for (const doc of usersSnap.docs) {
    const data = doc.data();
    const { email, displayName, role } = data;
    
    console.log(`\n--- Processing User: ${email || doc.id} ---`);
    if (!email) {
      console.log(`[SKIP] No email found for document ${doc.id}`);
      continue;
    }

    try {
      // 1. Try to get or create the user in Firebase Auth
      let authUser;
      try {
        authUser = await adminAuth.getUserByEmail(email);
        console.log(`[AUTH] User ${email} already exists in Firebase Auth.`);
      } catch (e: any) {
        if (e.code === 'auth/user-not-found') {
          authUser = await adminAuth.createUser({
            email,
            displayName,
            password: Math.random().toString(36).slice(-10) + 'A1!'
          });
          console.log(`[AUTH] Successfully created new Auth user for ${email} (UID: ${authUser.uid})`);
        } else {
          throw e;
        }
      }

      // Removed custom claims setting as per instructions

      // 3. Send sign-in link via client SDK
      try {
        await sendSignInLinkToEmail(clientAuth, email, actionCodeSettings);
        console.log(`[EMAIL] Successfully sent sign-in link to ${email}`);
      } catch (emailError: any) {
        console.error(`[EMAIL ERROR] Error sending email to ${email}:`, emailError.message);
        const link = await adminAuth.generateSignInWithEmailLink(email, actionCodeSettings);
        console.log(`[FALLBACK LINK] Sign-in link generated manually for ${email}:\n${link}`);
      }
      
      // 4. Update the firestore user document's UID if it doesn't match Auth UID
      if (doc.id !== authUser.uid) {
        console.log(`[FIRESTORE] Updating Firestore document ID from ${doc.id} to match Auth UID ${authUser.uid}`);
        await db.collection('users').doc(authUser.uid).set({
          ...data,
          uid: authUser.uid
        });
        await db.collection('users').doc(doc.id).delete();
        console.log(`[FIRESTORE] Successfully replaced old document with new UID.`);
      } else {
        console.log(`[FIRESTORE] Document ID already matches Auth UID.`);
      }

      console.log(`--- Finished processing ${email} ---`);
      count++;
    } catch (err: any) {
      console.error(`[ERROR] Failed to migrate user ${email}:`, err.message);
    }
  }

  console.log(`\nMigration complete. Processed ${count} user(s).`);
}

migrateUsers().catch(console.error);
