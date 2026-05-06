import { adminDb } from '../lib/firebase-admin.js';
import { gradeMatchups } from './grader.js';
import { gradePickemMatchups } from './pickemGrader.js';
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

          const newTitle = existingData.hasCustomTitle ? existingData.title : scrapedMatchup.title;
          const needsUpdate = existingData.status !== scrapedMatchup.status || existingData.statusDesc !== scrapedMatchup.statusDesc ||
              existingData.startTime !== scrapedMatchup.startTime ||
              existingData.homeTeam?.score !== scrapedMatchup.homeTeam?.score ||
              existingData.awayTeam?.score !== scrapedMatchup.awayTeam?.score ||
              existingData.title !== newTitle ||
              existingData.homeTeam?.name !== scrapedMatchup.homeTeam?.name ||
              existingData.homeTeam?.image !== scrapedMatchup.homeTeam?.image ||
              existingData.homeTeam?.id !== scrapedMatchup.homeTeam?.id ||
              existingData.awayTeam?.name !== scrapedMatchup.awayTeam?.name ||
              existingData.awayTeam?.image !== scrapedMatchup.awayTeam?.image ||
              existingData.awayTeam?.id !== scrapedMatchup.awayTeam?.id;

          if (needsUpdate || existingDoc.id !== gameId) {
            const updateData: any = {
              ...existingData,
              title: newTitle,
              status: scrapedMatchup.status,
              statusDesc: scrapedMatchup.statusDesc,
              startTime: scrapedMatchup.startTime,
              homeTeam: {
                  ...(existingData.homeTeam || {}),
                  id: scrapedMatchup.homeTeam?.id || existingData.homeTeam?.id,
                  name: scrapedMatchup.homeTeam?.name || existingData.homeTeam?.name,
                  image: scrapedMatchup.homeTeam?.image || existingData.homeTeam?.image,
                  score: scrapedMatchup.homeTeam?.score || existingData.homeTeam?.score || 0
              },
              awayTeam: {
                  ...(existingData.awayTeam || {}),
                  id: scrapedMatchup.awayTeam?.id || existingData.awayTeam?.id,
                  name: scrapedMatchup.awayTeam?.name || existingData.awayTeam?.name,
                  image: scrapedMatchup.awayTeam?.image || existingData.awayTeam?.image,
                  score: scrapedMatchup.awayTeam?.score || existingData.awayTeam?.score || 0
              },
              metadata: {
                  ...(existingData.metadata || {}),
                  overUnder: scrapedMatchup.metadata?.overUnder,
                  spread: existingData.type === 'SPREAD' ? existingData.metadata?.spread : scrapedMatchup.metadata?.spread,
                  network: scrapedMatchup.metadata?.network
              },
              updatedAt: Date.now()
            };

            // Flatten update properties specifically for batch.update when NOT migrating
            const flattenedUpdate: any = {
              title: updateData.title,
              status: updateData.status,
              statusDesc: updateData.statusDesc,
              startTime: updateData.startTime,
              'homeTeam.id': updateData.homeTeam.id,
              'homeTeam.name': updateData.homeTeam.name,
              'homeTeam.image': updateData.homeTeam.image,
              'homeTeam.score': updateData.homeTeam.score,
              'awayTeam.id': updateData.awayTeam.id,
              'awayTeam.name': updateData.awayTeam.name,
              'awayTeam.image': updateData.awayTeam.image,
              'awayTeam.score': updateData.awayTeam.score,
              'metadata.overUnder': updateData.metadata.overUnder,
              'metadata.spread': updateData.metadata.spread,
              'metadata.network': updateData.metadata.network,
              updatedAt: updateData.updatedAt
            };

            if (existingData.status === 'STATUS_SCHEDULED' &&
                (scrapedMatchup.status === 'STATUS_IN_PROGRESS' ||
                 scrapedMatchup.status === 'STATUS_FINAL' ||
                 scrapedMatchup.status === 'STATUS_POSTPONED')) {
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

            if (!updateData.abandoned &&
               ((scrapedMatchup.status === 'STATUS_FINAL' && existingData.status !== 'STATUS_FINAL') ||
                (scrapedMatchup.status === 'STATUS_POSTPONED' && existingData.status !== 'STATUS_POSTPONED'))) {
              matchupsToGrade.push({ ...existingData, ...updateData, gameId: scrapedMatchup.gameId, id: gameId });
            }
          }
        } else {
          const newDocRef = matchupsRef.doc(gameId);

          let abandoned = false;
          let active = scrapedMatchup.active && defaultActive;

          if (scrapedMatchup.status === 'STATUS_IN_PROGRESS' ||
              scrapedMatchup.status === 'STATUS_FINAL' ||
              scrapedMatchup.status === 'STATUS_POSTPONED') {
            abandoned = true;
            active = false;
          }

          const newMatchupData = {
            ...scrapedMatchup,
            active,
            abandoned,
            updatedAt: Date.now(),
            createdAt: Date.now()
          };

          batch.set(newDocRef, newMatchupData);
          opCount++;
          newCount++;

          existingMap.set(gameId, { data: () => newMatchupData, ref: newDocRef } as any);
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

        const pickemMatchupsToGrade: any[] = [];
        for (const matchup of matchupsToGrade) {
          try {
            const pickemSnaps = await adminDb.collection('pickemMatchups').where('gameId', '==', matchup.gameId).get();
            for (const doc of pickemSnaps.docs) {
              const pData = doc.data();
              // Sync standard matchup score and status into the pickem matchup
              const updateData = {
                status: matchup.status,
                statusDesc: matchup.statusDesc,
                'homeTeam.score': matchup.homeTeam?.score || 0,
                'awayTeam.score': matchup.awayTeam?.score || 0,
                updatedAt: Date.now()
              };
              await doc.ref.update(updateData);

              pickemMatchupsToGrade.push({
                ...pData,
                status: matchup.status,
                statusDesc: matchup.statusDesc,
                homeTeam: { ...(pData.homeTeam || {}), score: matchup.homeTeam?.score || 0 },
                awayTeam: { ...(pData.awayTeam || {}), score: matchup.awayTeam?.score || 0 },
                id: doc.id
              });
            }
          } catch (err) {
            console.error(`[Sync] Error syncing pickem matchup for game ${matchup.gameId}:`, err);
          }
        }

        if (pickemMatchupsToGrade.length > 0) {
          await gradePickemMatchups(pickemMatchupsToGrade);
        }
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
