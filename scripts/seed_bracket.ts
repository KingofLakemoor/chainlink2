import { adminDb } from '../src/lib/firebase-admin.ts';
import { scrapeLeagueSchedules } from '../src/services/espnScraper.ts';

const defaultTeams = [
  "Germany", "France",
  "South Africa", "Morocco",
  "Portugal", "Spain",
  "USA", "Belgium",
  "Brazil", "Côte d'Ivoire",
  "Mexico", "England",
  "Argentina", "Australia",
  "Switzerland", "Colombia"
];

// Fallback match times corresponding to defaultTeams
const defaultMatchTimes: Record<string, string> = {};


async function seed() {
  const bracketRef = adminDb.collection('brackets').doc('world-cup-2026');

  const res = await scrapeLeagueSchedules('FIFA');
  const allFifaMatchups = res.data || [];

  // Only consider matchups on or after July 4th
  const fifaMatchups = allFifaMatchups.filter(m => new Date(m.startTime) >= new Date('2026-07-04T00:00:00.000Z'));

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
