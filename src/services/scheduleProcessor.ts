import { adminDb } from '../lib/firebase-admin.js';
import { gradeMatchups } from './grader.js';
import { League, LeagueResponse, scrapeLeagueSchedules } from './espnScraper.js';

export { scrapeLeagueSchedules } from './espnScraper.js';

export async function syncLeagueSchedules(league: League): Promise<LeagueResponse> {
  const response = await scrapeLeagueSchedules(league);

  if (response.data && response.data.length > 0 && adminDb) {
    console.log(`[Sync] Fetched ${response.data.length} matchups for ${league}. Writing to Firestore...`);

    try {
      const leagueSettingsSnap = await adminDb.collection('leagueSettings').doc(league).get();
      let defaultActive = true;
      if (leagueSettingsSnap.exists) {
        const settings = leagueSettingsSnap.data();
        if (settings && typeof settings.active === 'boolean') {
          defaultActive = settings.active;
        }
      }

      const matchupsRef = adminDb.collection('matchups');
      const existingSnap = await matchupsRef.where('league', '==', league).get();

      const existingMap = new Map<string, any>();
      existingSnap.docs.forEach(d => {
        existingMap.set(d.data().gameId, d);
      });

      let batch = adminDb.batch();
      let opCount = 0;
      let newCount = 0;
      let updateCount = 0;
      const matchupsToGrade: any[] = [];

      for (const scrapedMatchup of response.data) {
        const gameId = scrapedMatchup.gameId;
        const existingDoc = existingMap.get(gameId);

        if (existingDoc) {
          const existingData = existingDoc.data();
          if (existingData.status !== scrapedMatchup.status ||
              existingData.startTime !== scrapedMatchup.startTime ||
              existingData.homeTeam?.score !== scrapedMatchup.homeTeam?.score ||
              existingData.awayTeam?.score !== scrapedMatchup.awayTeam?.score)
          {
            batch.update(existingDoc.ref, {
              status: scrapedMatchup.status,
              startTime: scrapedMatchup.startTime,
              'homeTeam.score': scrapedMatchup.homeTeam?.score || 0,
              'awayTeam.score': scrapedMatchup.awayTeam?.score || 0,
              'metadata.overUnder': scrapedMatchup.metadata?.overUnder,
              'metadata.spread': scrapedMatchup.metadata?.spread,
              'metadata.network': scrapedMatchup.metadata?.network,
              updatedAt: Date.now()
            });
            opCount++;
            updateCount++;

            if (scrapedMatchup.status === 'STATUS_FINAL') {
              matchupsToGrade.push(scrapedMatchup);
            }
          }
        } else {
          const newDocRef = matchupsRef.doc();
          batch.set(newDocRef, {
            ...scrapedMatchup,
            active: scrapedMatchup.active && defaultActive,
            updatedAt: Date.now(),
            createdAt: Date.now()
          });
          opCount++;
          newCount++;

          existingMap.set(gameId, { data: () => scrapedMatchup, ref: newDocRef } as any);
        }

        if (opCount === 500) {
          await batch.commit();
          batch = adminDb.batch();
          opCount = 0;
        }
      }

      if (opCount > 0) {
        await batch.commit();
      }

      if (matchupsToGrade.length > 0) {
        await gradeMatchups(matchupsToGrade);
      }

      response.scoreMatchupsCreated = newCount;
      response.matchupsUpdated = updateCount;
      console.log(`[Sync] ${league} complete: inserted ${newCount}, updated ${updateCount}.`);
    } catch (e: any) {
      console.error(`[Sync] Error writing to Firestore for ${league}:`, e);
      response.error = e.message;
    }
  } else if (!adminDb) {
    console.warn(`[Sync] Skipping Firestore write for ${league} because adminDb is not initialized.`);
  }

  return response;
}
