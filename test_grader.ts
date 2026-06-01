import { db } from './src/lib/firebase';
import { collection, getDocs, doc, setDoc, query, where, orderBy } from 'firebase/firestore';

async function checkAchievements() {
  const achs = await getDocs(query(collection(db, 'achievements'), orderBy('weight', 'desc')));
  console.log(`Loaded ${achs.size} achievements`);
  achs.docs.forEach(doc => {
    const data = doc.data();
    if (data.type === 'CHAINWIN') console.log(`Achievement: ${data.name} (type: ${data.type}, threshold: ${data.threshold})`);
  });

  const shopItems = await getDocs(query(collection(db, 'shopItems')));
  shopItems.docs.forEach(doc => {
    const data = doc.data();
    if (data.type === 'TITLE' && !data.forSale && data.cost === 0) {
        console.log(`Title: ${data.name} (type: ${data.type}, cost: ${data.cost})`);
    }
  });

  process.exit(0);
}
// We don't have enough setup for this test script to run directly
// Just trying to see how achievements are modeled
