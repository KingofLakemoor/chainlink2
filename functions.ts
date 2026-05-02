import { onSchedule } from "firebase-functions/v2/scheduler";
import { onRequest, HttpsOptions } from "firebase-functions/v2/https";
import { syncLeagueSchedules } from "./src/services/scheduleProcessor.js";
import "./src/lib/firebase-admin.js"; // Ensure Firebase is initialized
import express from 'express';
import { apiRouter } from './src/apiRouter.js';

const LEAGUES_TO_SYNC = ["NBA", "NHL", "MLB", "PGA", "WNBA", "NFL", "WBB", "MBB", "MLS", "EPL", "NWSL", "COLLEGE-FOOTBALL"];

export const frequentSync = onSchedule({ schedule: "every 2 minutes", timeoutSeconds: 300 }, async (event) => {
  console.log(`[Cron] Starting frequent (scoreboard-only) sync cycle...`);
  for (const league of LEAGUES_TO_SYNC) {
    try {
      await syncLeagueSchedules(league, true);
    } catch (e) {
      console.error(`[Cron] Error syncing ${league}:`, e);
    }
  }

  // Safety Background Loop: Find stuck picks and grade them
  console.log(`[Cron] Running safety check for stuck pending picks...`);
  try {
    const { adminDb } = await import("./src/lib/firebase-admin.js");
    const { gradeMatchups } = await import("./src/services/grader.js");
    if (adminDb) {
      // Limit the query to prevent massive memory usage and read operations
      const stuckPicksSnap = await adminDb.collection('picks')
        .where('status', '==', 'PENDING')
        .limit(100)
        .get();
      if (!stuckPicksSnap.empty) {
        const matchupIds = new Set<string>();
        stuckPicksSnap.docs.forEach((doc: any) => matchupIds.add(doc.data().matchupId));

        if (matchupIds.size > 0) {
          // Batch query to find any matchups that are finalized/postponed
          const matchupsToGrade = [];
          for (const mId of Array.from(matchupIds)) {
            const mSnap = await adminDb.collection('matchups').doc(mId).get();
            if (mSnap.exists) {
              const mData = mSnap.data()!;
              if (mData.status === 'STATUS_FINAL' || mData.status === 'STATUS_POSTPONED') {
                matchupsToGrade.push({ ...mData, gameId: mId });
              }
            }
          }
          if (matchupsToGrade.length > 0) {
            console.log(`[Cron] Safety loop found ${matchupsToGrade.length} stuck completed matchups. Triggering grader.`);
            await gradeMatchups(matchupsToGrade);
          }
        }
      }
    }
  } catch (e) {
    console.error(`[Cron] Error in safety loop:`, e);
  }

  console.log(`[Cron] Frequent sync cycle complete.`);
});

export const nightlySync = onSchedule({ schedule: "0 9 * * *", timeoutSeconds: 300 }, async (event) => {
  console.log(`[Cron] Starting nightly full scheduled sync cycle (2 AM Arizona time)...`);
  for (const league of LEAGUES_TO_SYNC) {
    try {
      await syncLeagueSchedules(league, false);
    } catch (e) {
      console.error(`[Cron] Error on nightly sync for ${league}:`, e);
    }
  }

  console.log(`[Cron] Starting purge of abandoned matchups...`);
  try {
    const { adminDb } = await import("./src/lib/firebase-admin.js");
    if (adminDb) {
      let purgedCount = 0;
      while (true) {
        const abandonedSnap = await adminDb.collection('matchups')
          .where('abandoned', '==', true)
          .limit(500)
          .get();

        if (abandonedSnap.empty) {
          break;
        }

        const batch = adminDb.batch();
        abandonedSnap.docs.forEach((doc: any) => {
          batch.delete(doc.ref);
        });
        await batch.commit();
        purgedCount += abandonedSnap.size;
      }
      console.log(`[Cron] Purged ${purgedCount} abandoned matchups.`);
    }
  } catch (e) {
    console.error(`[Cron] Error purging abandoned matchups:`, e);
  }

  console.log(`[Cron] Nightly scheduled sync cycle complete.`);
});

const app = express();
app.use(express.json());
app.use('/api', apiRouter);

export const api = onRequest(app as any);
