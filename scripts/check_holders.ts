import { initializeApp } from 'firebase/app';
import { getFirestore, collection, getDocs } from 'firebase/firestore';
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

const db = getFirestore(app, config.firestoreDatabaseId);

async function main() {
  const plantersSnap = await getDocs(collection(db, 'planters'));
  const holders = new Map();
  plantersSnap.docs.forEach((doc) => {
    const d = doc.data();
    const holder = d.currentHolderId || 'NO_HOLDER';
    holders.set(holder, (holders.get(holder) || 0) + 1);
  });
  console.log("Planter holders distribution:");
  for (const [holder, count] of holders.entries()) {
    console.log(`  ${holder}: ${count}`);
  }
}

main().then(() => process.exit(0));
