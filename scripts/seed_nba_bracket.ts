import "dotenv/config";
import { adminDb } from '../src/lib/firebase-admin.js';

async function seed() {
  if (!adminDb) {
    console.error("Admin DB not initialized. Please ensure GOOGLE_APPLICATION_CREDENTIALS is set, or run this script in an environment with Application Default Credentials (e.g. Cloud Run or a logged-in dev environment).");
    process.exit(1);
  }

  const teams = [
    "Oklahoma City Thunder", "Los Angeles Lakers",
    "Minnesota Timberwolves", "San Antonio Spurs",
    "Denver Nuggets", "Phoenix Suns",
    "LA Clippers", "Dallas Mavericks",
    "Detroit Pistons", "Cleveland Cavaliers",
    "New York Knicks", "Philadelphia 76ers",
    "Boston Celtics", "Miami Heat",
    "Milwaukee Bucks", "Indiana Pacers"
  ];

  const pointValues = {
    "Round 1": 10,
    "Round 2": 20,
    "Round 3": 40,
    "Round 4": 80
  };

  const bracketData = {
    name: "2024 NBA Playoffs Test Bracket",
    sport: "NBA",
    isPublic: true,
    maxEntries: 0,
    openDate: Date.now(),
    lockDate: Date.now() + 86400000 * 7,
    teams: teams,
    pointValues: pointValues,
    status: 'OPEN',
    createdAt: Date.now(),
    updatedAt: Date.now()
  };

  try {
    const docRef = await adminDb.collection("brackets").add(bracketData);
    console.log(`Successfully created bracket with ID: ${docRef.id}`);
  } catch (err) {
    console.error("Error creating bracket:", err);
  }
}

seed();
