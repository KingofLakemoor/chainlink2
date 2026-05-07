import "dotenv/config";
import { adminDb } from '../src/lib/firebase-admin.js';

async function seed() {
  if (!adminDb) {
    console.error("Admin DB not initialized. Please ensure GOOGLE_APPLICATION_CREDENTIALS is set, or run this script in an environment with Application Default Credentials (e.g. Cloud Run or a logged-in dev environment).");
    process.exit(1);
  }

  const teams = [
    "Mexico", "South Africa", "South Korea", "Czechia",
    "Canada", "Bosnia-Herzegovina", "Qatar", "Switzerland",
    "Brazil", "Morocco", "Haiti", "Scotland",
    "United States", "Paraguay", "Australia", "Türkiye",
    "Germany", "Curacao", "Ivory Coast", "Ecuador",
    "Netherlands", "Japan", "Sweden", "Tunisia",
    "Belgium", "Egypt", "Iran", "New Zealand",
    "Spain", "Cape Verde", "Saudi Arabia", "Uruguay",
    "France", "Senegal", "Iraq", "Norway",
    "Argentina", "Algeria", "Austria", "Jordan",
    "Portugal", "Congo DR", "Uzbekistan", "Colombia",
    "England", "Croatia", "Ghana", "Panama"
  ];

  const pointValues = {
    "Round of 32": 10,
    "Round of 16": 20,
    "Quarter Finals": 40,
    "Semi Finals": 80,
    "Finals": 160
  };

  const bracketData = {
    name: "2026 World Cup Bracket",
    sport: "World Cup 2026",
    isPublic: true,
    maxEntries: 0,
    openDate: Date.now(),
    lockDate: Date.now() + 86400000 * 30, // Starts further out
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
