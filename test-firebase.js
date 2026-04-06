import { initializeApp } from 'firebase/app';
import { getFirestore, collection, query, where, getDocs } from 'firebase/firestore';
import fs from 'fs';

const config = JSON.parse(fs.readFileSync('./firebase-applet-config.json', 'utf8'));
const app = initializeApp(config);
const db = getFirestore(app, config.firestoreDatabaseId);

async function test() {
  try {
    const q = query(collection(db, 'users'), where('email', '==', 'ganeshkeesara123@gmail.com'));
    const snap = await getDocs(q);
    console.log("Success! Docs:", snap.size);
  } catch(e) {
    console.error("FIREBASE ERROR:", e.message);
    process.exit(1);
  }
}
test();
