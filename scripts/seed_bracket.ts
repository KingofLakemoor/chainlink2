import { adminDb } from '../src/lib/firebase-admin.ts';
import { scrapeLeagueSchedules } from '../src/services/espnScraper.ts';

const defaultTeams = [
  "Germany", "Paraguay",
  "France", "Sweden",
  "South Africa", "Canada",
  "Netherlands", "Morocco",
  "Portugal", "Croatia",
  "Spain", "Austria",
  "USA", "Bosnia and Herzegovina",
  "Belgium", "Senegal",
  "Brazil", "Japan",
  "Côte d'Ivoire", "Norway",
  "Mexico", "Ecuador",
  "England", "DR Congo",
  "Argentina", "Cabo Verde",
  "Australia", "Egypt",
  "Switzerland", "Algeria",
  "Colombia", "Ghana"
];

// Fallback match times corresponding to defaultTeams (r0-m0 to r0-m15)
const defaultMatchTimes: Record<string, string> = {
  'r0-m0': '2026-06-29T17:30:00.000Z',
  'r0-m1': '2026-06-30T18:00:00.000Z',
  'r0-m2': '2026-06-28T16:00:00.000Z',
  'r0-m3': '2026-06-29T22:00:00.000Z',
  'r0-m4': '2026-07-02T20:00:00.000Z',
  'r0-m5': '2026-07-02T16:00:00.000Z',
  'r0-m6': '2026-07-01T21:00:00.000Z',
  'r0-m7': '2026-07-01T17:00:00.000Z',
  'r0-m8': '2026-06-29T14:00:00.000Z',
  'r0-m9': '2026-06-30T14:00:00.000Z',
  'r0-m10': '2026-06-30T22:00:00.000Z',
  'r0-m11': '2026-07-01T13:00:00.000Z',
  'r0-m12': '2026-07-03T19:00:00.000Z',
  'r0-m13': '2026-07-03T15:00:00.000Z',
  'r0-m14': '2026-07-03T00:00:00.000Z',
  'r0-m15': '2026-07-03T22:30:00.000Z',
};


async function seed() {
  const bracketRef = adminDb.collection('brackets').doc('world-cup-2026');

  const res = await scrapeLeagueSchedules('FIFA');
  const allFifaMatchups = res.data || [];

  // Only consider matchups on or after June 28th
  const fifaMatchups = allFifaMatchups.filter(m => new Date(m.startTime) >= new Date('2026-06-28T00:00:00.000Z'));

  const matchTimes: Record<string, string> = { ...defaultMatchTimes };
  const bracketTeams: string[] = [...defaultTeams];

  // Update match times dynamically if the matchup exists in the filtered ESPN data
  for (let i = 0; i < bracketTeams.length / 2; i++) {
     const t1 = bracketTeams[i * 2];
     const t2 = bracketTeams[i * 2 + 1];

     const matchedGame = fifaMatchups.find(m => {
       let homeName = m.homeTeam?.name;
       let awayName = m.awayTeam?.name;
       if (homeName === "Ivory Coast") homeName = "Côte d'Ivoire";
       if (awayName === "Ivory Coast") awayName = "Côte d'Ivoire";
       if (homeName === "Congo DR") homeName = "DR Congo";
       if (awayName === "Congo DR") awayName = "DR Congo";
       if (homeName === "Cape Verde") homeName = "Cabo Verde";
       if (awayName === "Cape Verde") awayName = "Cabo Verde";

       return (homeName === t1 && awayName === t2) || (homeName === t2 && awayName === t1);
     });

     if (matchedGame) {
       matchTimes[`r0-m${i}`] = new Date(matchedGame.startTime).toISOString();
     }
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
