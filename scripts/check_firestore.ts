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
  plantersSnap.docs.forEach((doc) => {
    const d = doc.data();
    if (d.lastReading === undefined) {
      console.log("Planter with missing lastReading:", doc.id, d);
    }
  });
}

main().then(() => process.exit(0));
