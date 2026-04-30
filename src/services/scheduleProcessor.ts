import { adminDb } from '../lib/firebase-admin.js';
import { gradeMatchups } from './grader.js';
import { League, LeagueResponse, scrapeLeagueSchedules } from './espnScraper.js';

export { scrapeLeagueSchedules } from './espnScraper.js';

export async function syncLeagueSchedules(league: League, scoreboardOnly: boolean = false): Promise<LeagueResponse> {
  const response = await scrapeLeagueSchedules(league, scoreboardOnly);

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
      const scrapedGameIds = new Set<string>();

      for (const scrapedMatchup of response.data) {
        const gameId = scrapedMatchup.gameId;
        scrapedGameIds.add(gameId);
        const existingDoc = existingMap.get(gameId);

        if (existingDoc) {
          const existingData = existingDoc.data();

          if (existingData.abandoned) {
            continue;
          }

          const needsUpdate = existingData.status !== scrapedMatchup.status || existingData.statusDesc !== scrapedMatchup.statusDesc ||
              existingData.startTime !== scrapedMatchup.startTime ||
              existingData.homeTeam?.score !== scrapedMatchup.homeTeam?.score ||
              existingData.awayTeam?.score !== scrapedMatchup.awayTeam?.score;

          if (needsUpdate || existingDoc.id !== gameId) {
            const updateData: any = {
              ...existingData,
              status: scrapedMatchup.status,
              statusDesc: scrapedMatchup.statusDesc,
              startTime: scrapedMatchup.startTime,
              homeTeam: {
                  ...(existingData.homeTeam || {}),
                  score: scrapedMatchup.homeTeam?.score || existingData.homeTeam?.score || 0
              },
              awayTeam: {
                  ...(existingData.awayTeam || {}),
                  score: scrapedMatchup.awayTeam?.score || existingData.awayTeam?.score || 0
              },
              metadata: {
                  ...(existingData.metadata || {}),
                  overUnder: scrapedMatchup.metadata?.overUnder,
                  spread: scrapedMatchup.metadata?.spread,
                  network: scrapedMatchup.metadata?.network
              },
              updatedAt: Date.now()
            };

            // Flatten update properties specifically for batch.update when NOT migrating
            const flattenedUpdate: any = {
              status: updateData.status,
              statusDesc: updateData.statusDesc,
              startTime: updateData.startTime,
              'homeTeam.score': updateData.homeTeam.score,
              'awayTeam.score': updateData.awayTeam.score,
              'metadata.overUnder': updateData.metadata.overUnder,
              'metadata.spread': updateData.metadata.spread,
              'metadata.network': updateData.metadata.network,
              updatedAt: updateData.updatedAt
            };

            if (existingData.status === 'STATUS_SCHEDULED' && scrapedMatchup.status === 'STATUS_IN_PROGRESS') {
              const pendingPicksSnap = await adminDb.collection('picks')
                .where('matchupId', '==', gameId)
                .where('status', '==', 'PENDING')
                .limit(1)
                .get();

              if (pendingPicksSnap.empty) {
                updateData.abandoned = true;
                updateData.active = false;
                flattenedUpdate.abandoned = true;
                flattenedUpdate.active = false;
              }
            }

            if (existingDoc.id !== gameId) {
              const newDocRef = matchupsRef.doc(gameId);
              batch.set(newDocRef, updateData);
              batch.delete(existingDoc.ref);
              opCount += 2;
              existingMap.set(gameId, { data: () => updateData, ref: newDocRef } as any);
            } else if (needsUpdate) {
              batch.update(existingDoc.ref, flattenedUpdate);
              opCount++;
            }
            updateCount++;

            if ((scrapedMatchup.status === 'STATUS_FINAL' && existingData.status !== 'STATUS_FINAL') ||
                (scrapedMatchup.status === 'STATUS_POSTPONED' && existingData.status !== 'STATUS_POSTPONED')) {
              matchupsToGrade.push({ ...existingData, ...updateData, gameId: scrapedMatchup.gameId, id: gameId });
            }
          }
        } else {
          const newDocRef = matchupsRef.doc(gameId);
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

        if (opCount >= 500) {
          await batch.commit();
          batch = adminDb.batch();
          opCount = 0;
        }
      }

      // Check for removed/cancelled games only on full schedule sync
      if (!scoreboardOnly) {
        for (const [gameId, doc] of existingMap.entries()) {
          const data = doc.data();
          // If it was scheduled, not abandoned, and no longer in the scraped data
          if (data.status === 'STATUS_SCHEDULED' && !data.abandoned && !scrapedGameIds.has(gameId)) {
            const pendingPicksSnap = await adminDb.collection('picks')
              .where('matchupId', '==', gameId)
              .where('status', '==', 'PENDING')
              .limit(1)
              .get();

            if (pendingPicksSnap.empty) {
              // No picks, safe to hide and let cron purge
              batch.update(doc.ref, { abandoned: true, active: false, updatedAt: Date.now() });
              opCount++;
              updateCount++;
            } else {
              // Has picks, mark as postponed so grader refunds them
              batch.update(doc.ref, { status: 'STATUS_POSTPONED', statusDesc: 'Canceled', updatedAt: Date.now() });
              opCount++;
              updateCount++;
              matchupsToGrade.push({ ...data, status: 'STATUS_POSTPONED', id: gameId, gameId });
            }

            if (opCount >= 500) {
              await batch.commit();
              batch = adminDb.batch();
              opCount = 0;
            }
          }
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
