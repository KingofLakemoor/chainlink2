import { adminDb } from '../src/lib/firebase-admin.js';
import { syncLeagueSchedules } from '../src/services/scheduleProcessor.js';

async function run() {
  if (!adminDb) {
    console.error("No adminDb found");
    return;
  }

  console.log("Fetching pickemMatchups...");
  const pickemSnaps = await adminDb.collection('pickemMatchups').get();
  console.log(`Found ${pickemSnaps.size} pickem matchups in total.`);

  const now = Date.now();
  const TWELVE_HOURS = 12 * 60 * 60 * 1000;

  // Maps League -> Set of YYYYMMDD string
  const datesToSync: Record<string, Set<string>> = {};
  let stuckCount = 0;

  for (const doc of pickemSnaps.docs) {
    const data = doc.data();
    if (data.status === 'STATUS_FINAL' || data.status === 'STATUS_POSTPONED' || data.status === 'STATUS_ABANDONED') {
      continue;
    }

    if (data.startTime && (now - data.startTime) > TWELVE_HOURS) {
      stuckCount++;

      // Determine league by fetching the original matchup
      let league = 'MLB'; // Default, we will try to look it up
      if (data.gameId) {
         const mSnap = await adminDb.collection('matchups').doc(data.gameId).get();
         if (mSnap.exists) {
            league = mSnap.data()?.league || 'MLB';
         }
      }

      const d = new Date(data.startTime);
      const str = d.toLocaleString("en-US", { timeZone: "America/New_York", year: "numeric", month: "2-digit", day: "2-digit" });
      const [month, day, year] = str.split("/");
      const dateStr = `${year}${month}${day}`;

      if (!datesToSync[league]) {
        datesToSync[league] = new Set();
      }
      datesToSync[league].add(dateStr);

      console.log(`Found stuck game: ${data.title} (${data.gameId}) from ${new Date(data.startTime).toISOString()} - League: ${league}`);
    }
  }

  console.log(`\nFound ${stuckCount} stuck pickem matchups that need syncing.\n`);

  for (const league of Object.keys(datesToSync)) {
    const dates = Array.from(datesToSync[league]);
    console.log(`Syncing ${league} for dates: ${dates.join(', ')}...`);

    try {
        const result = await syncLeagueSchedules(league, true, dates);
        console.log(`Sync result for ${league}: Updated ${result.matchupsUpdated}, New ${result.scoreMatchupsCreated}, Error: ${result.error || 'None'}`);
    } catch(err) {
        console.error(`Error syncing ${league}:`, err);
    }
  }

  console.log("Done.");
  process.exit(0);
}

run().catch(err => {
  console.error("Error running script:", err);
  process.exit(1);
});
