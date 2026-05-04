import { adminDb } from '../src/lib/firebase-admin.ts';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function seed() {
  if (!adminDb) {
    console.error("Admin DB not initialized. Please ensure GOOGLE_APPLICATION_CREDENTIALS is set, or run this script in an environment with Application Default Credentials (e.g. Cloud Run or a logged-in dev environment).");
    process.exit(1);
  }

  const catalogPath = path.resolve(__dirname, '../shop_items.json');
  const items = JSON.parse(fs.readFileSync(catalogPath, 'utf-8'));

  let count = 0;
  for (const item of items) {
    const { id, ...data } = item;
    const docRef = adminDb.collection("shopItems").doc(id);
    const doc = await docRef.get();

    const timestamp = Date.now();
    const itemData = {
        ...data,
        createdAt: doc.exists ? doc.data()?.createdAt : timestamp,
        updatedAt: timestamp
    };

    if (doc.exists) {
        await docRef.update(itemData);
        console.log(`Updated shop item: ${item.name} (${id})`);
    } else {
        await docRef.set(itemData);
        console.log(`Created shop item: ${item.name} (${id})`);
    }
    count++;
  }

  console.log(`Successfully seeded/updated ${count} shop items.`);
}

seed();