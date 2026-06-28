import { adminDb } from '../src/lib/firebase-admin.ts';
import { scrapeLeagueSchedules } from '../src/services/espnScraper.ts';

const defaultFallbackTeams = [
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

  const res = await scrapeLeagueSchedules('FIFA');
  const fifaMatchups = res.data || [];

  const matchTimes: Record<string, string> = {};
  const bracketTeams: string[] = [];

  // Create teams and matchtimes from the specific matchup cards
  for (let i = 0; i < fifaMatchups.length; i++) {
     const m = fifaMatchups[i];
     let homeName = m.homeTeam?.name || `TBD Home ${i}`;
     let awayName = m.awayTeam?.name || `TBD Away ${i}`;

     if (homeName === "Ivory Coast") homeName = "Côte d'Ivoire";
     if (awayName === "Ivory Coast") awayName = "Côte d'Ivoire";
     if (homeName === "Congo DR") homeName = "DR Congo";
     if (awayName === "Congo DR") awayName = "DR Congo";
     if (homeName === "Cape Verde") homeName = "Cabo Verde";
     if (awayName === "Cape Verde") awayName = "Cabo Verde";

     bracketTeams.push(awayName, homeName);
     matchTimes[`r0-m${i}`] = new Date(m.startTime).toISOString();
  }

  // Fill the rest with the defaultTeams that were not used
  const usedTeams = new Set(bracketTeams);
  const remainingTeams = defaultFallbackTeams.filter(t => !usedTeams.has(t));

  let i = fifaMatchups.length;
  // Pad until we have exactly 32 teams (16 matchups)
  while (bracketTeams.length < 32) {
     const t1 = remainingTeams.shift() || `TBD Team ${bracketTeams.length + 1}`;
     const t2 = remainingTeams.shift() || `TBD Team ${bracketTeams.length + 2}`;
     bracketTeams.push(t1, t2);

     const matchDate = new Date();
     matchDate.setDate(matchDate.getDate() + 10);
     matchTimes[`r0-m${i}`] = matchDate.toISOString();
     i++;
  }

  await bracketRef.set({
    name: "2026 World Cup Bracket",
    sport: "World Cup 2026",
    teams: bracketTeams,
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
