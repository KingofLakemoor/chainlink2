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

  const catalogPath = path.resolve(__dirname, '../achievements.json');
  const achievements = JSON.parse(fs.readFileSync(catalogPath, 'utf-8'));

  let count = 0;
  for (const a of achievements) {
    // Try to find if achievement with same type and threshold exists
    const snapshot = await adminDb.collection("achievements")
        .where("type", "==", a.type)
        .where("threshold", "==", a.threshold)
        .limit(1)
        .get();

    if (snapshot.empty) {
        const docRef = adminDb.collection("achievements").doc();
        await docRef.set(a);
        console.log(`Created achievement: ${a.name}`);
        count++;
    } else {
        console.log(`Achievement already exists: ${a.name} (type: ${a.type}, threshold: ${a.threshold})`);
        const docId = snapshot.docs[0].id;
        await adminDb.collection("achievements").doc(docId).update(a);
        console.log(`Updated achievement: ${a.name}`);
        count++;
    }
  }

  console.log(`Successfully seeded/updated ${count} achievements.`);
}

seed();
