import { adminDb } from '../src/lib/firebase-admin.ts';

const defaultTeams = [
  "South Africa", "Canada",
  "Netherlands", "Morocco",
  "Germany", "Paraguay",
  "France", "Sweden",
  "Belgium", "Senegal",
  "USA", "Bosnia and Herzegovina",
  "Spain", "Austria",
  "Portugal", "Croatia",
  "Brazil", "Japan",
  "Côte d'Ivoire", "Norway",
  "Mexico", "Ecuador",
  "England", "DR Congo",
  "Switzerland", "Algeria",
  "Colombia", "Ghana",
  "Australia", "Egypt",
  "Argentina", "Cabo Verde"
];

async function seed() {
  const bracketRef = adminDb.collection('brackets').doc('world-cup-2026');

  // Fake match times to ensure the bracket works correctly initially
  const matchTimes: Record<string, string> = {};
  for (let i = 0; i < 16; i++) {
    const matchDate = new Date();
    // Add 10 days to make sure matches are open by default.
    matchDate.setDate(matchDate.getDate() + 10);
    matchTimes[`r0-m${i}`] = matchDate.toISOString();
  }

  await bracketRef.set({
    name: "2026 World Cup Bracket",
    sport: "World Cup 2026",
    teams: defaultTeams,
    pointValues: {
      "Round of 32": 10,
      "Round of 16": 20,
      "Quarter Finals": 40,
      "Semi Finals": 80,
      "Finals": 160
    },
    cost: 10,
    prizePotPercent: 0.60,
    isPublic: true,
    maxEntries: 0,
    openDate: Date.now(),
    lockDate: Date.now() + 86400000 * 30, // 30 days lock
    matchTimes,
    status: 'OPEN',
    createdAt: Date.now(),
    updatedAt: Date.now()
  }, { merge: true });

  console.log("Seeded world cup bracket.");
}

seed();
