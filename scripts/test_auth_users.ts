import { initializeApp } from 'firebase/app';
import { getFirestore, collection, getDocs, doc, getDoc } from 'firebase/firestore';
import { getAuth, signInWithEmailAndPassword } from 'firebase/auth';
import fs from 'node:fs';
import path from 'node:path';

const config = JSON.parse(fs.readFileSync(path.resolve(process.cwd(), 'firebase-applet-config.json'), 'utf8'));

const app = initializeApp({
  apiKey: config.apiKey,
  authDomain: config.authDomain,
  projectId: config.projectId,
  storageBucket: config.storageBucket,
  messagingSenderId: config.messagingSenderId,
  appId: config.appId
});

const auth = getAuth(app);
const db = getFirestore(app, config.firestoreDatabaseId);

async function main() {
  try {
    const cred = await signInWithEmailAndPassword(auth, 'ganeshkeesara123@gmail.com', 'password123');
    console.log("Logged in successfully! Auth UID:", cred.user.uid);
    console.log("Email:", cred.user.email);

    const token = await cred.user.getIdTokenResult();
    console.log("Custom claims:", token.claims);

    const profileDoc = await getDoc(doc(db, 'users', cred.user.uid));
    console.log("Profile doc exists by uid?", profileDoc.exists());
    if (profileDoc.exists()) {
      console.log("Profile data:", profileDoc.data());
    }

    const allUsersSnap = await getDocs(collection(db, 'users'));
    console.log("Total users in Firestore:", allUsersSnap.size);
    allUsersSnap.docs.forEach(d => {
      console.log("User doc ID:", d.id, "email:", d.data().email, "role:", d.data().role, "displayName:", d.data().displayName);
    });

  } catch (err) {
    console.error("Error signing in or fetching users:", err);
  }
}

main().then(() => process.exit(0));
