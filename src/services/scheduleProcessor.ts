import { adminDb } from '../lib/firebase-admin.js';
import { gradeMatchups } from './grader.js';
import { gradePickemMatchups } from './pickemGrader.js';
import { League, LeagueResponse, scrapeLeagueSchedules } from './espnScraper.js';

export { scrapeLeagueSchedules } from './espnScraper.js';

export async function syncLeagueSchedules(league: League, scoreboardOnly: boolean = false): Promise<LeagueResponse> {
  let scraperConfig: { maxMoneylineOdds?: number } | undefined = undefined;
  if (adminDb) {
    try {
      const scraperSnap = await adminDb.collection('systemSettings').doc('scraper').get();
      if (scraperSnap.exists) {
        scraperConfig = scraperSnap.data() as { maxMoneylineOdds?: number };
      }
    } catch (e) {
      console.error("Error fetching scraper config", e);
    }
  }

  const response = await scrapeLeagueSchedules(league, scoreboardOnly, scraperConfig);

  if (response.data && response.data.length > 0 && adminDb) {
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
        if (scrapedMatchup.isRawPGAData) {
          const competitors = scrapedMatchup.competition.competitors || [];

          for (const [existingGameId, doc] of existingMap.entries()) {
            const data = doc.data();
            if (data.league !== 'PGA' || data.abandoned) continue;

            const homeGolferId = data.homeTeam?.id;
            const awayGolferId = data.awayTeam?.id;

            const homeComp = competitors.find((c: any) => String(c.id) === homeGolferId);
            const awayComp = competitors.find((c: any) => String(c.id) === awayGolferId);

            if (homeComp && awayComp) {
              const period = data.metadata?.period || 1;
              const isRoundScore = data.metadata?.matchupType === 'ROUND_SCORE';

              let homeScore = 0;
              let awayScore = 0;

              let homeFinal = false;
              let awayFinal = false;
              let homeStarted = false;
              let awayStarted = false;

              const parseGolfScore = (val: any) => {
                 if (val === null || val === undefined) return 0;
                 const strVal = String(val).toUpperCase();
                 if (strVal === 'E' || strVal === 'EVEN' || strVal === 'WD' || strVal === 'MC') return 0;
                 const parsed = parseFloat(strVal);
                 return isNaN(parsed) ? 0 : parsed;
              };

              if (isRoundScore) {
                 const homeLs = homeComp.linescores?.find((ls: any) => ls.period === period);
                 const awayLs = awayComp.linescores?.find((ls: any) => ls.period === period);

                 homeScore = homeLs ? parseGolfScore(homeLs.displayValue || homeLs.value) : 0;
                 awayScore = awayLs ? parseGolfScore(awayLs.displayValue || awayLs.value) : 0;

                 const now = Date.now();
                 homeStarted = !!(homeLs?.teeTime && new Date(homeLs.teeTime).getTime() <= now);
                 awayStarted = !!(awayLs?.teeTime && new Date(awayLs.teeTime).getTime() <= now);

                 // If the whole tournament is post or they have finished their specific round
                 // Note: ESPN doesn't always cleanly mark individual rounds as 'post', so we rely on teeTimes and general status if needed
                 // But typically if they are on a later round, the previous round is final.
                 const currentRound = homeComp.status?.period || 1;
                 if (homeComp.status?.type?.state === 'post' || currentRound > period || (currentRound === period && homeComp.status?.type?.completed)) homeFinal = true;

                 const awayCurrentRound = awayComp.status?.period || 1;
                 if (awayComp.status?.type?.state === 'post' || awayCurrentRound > period || (awayCurrentRound === period && awayComp.status?.type?.completed)) awayFinal = true;

              } else {
                 homeScore = parseGolfScore(homeComp.score?.displayValue || homeComp.score?.value || homeComp.score);
                 awayScore = parseGolfScore(awayComp.score?.displayValue || awayComp.score?.value || awayComp.score);

                 if (homeComp.status?.type?.state === 'post') homeFinal = true;
                 if (awayComp.status?.type?.state === 'post') awayFinal = true;

                 if (homeComp.status?.type?.state === 'in' || homeFinal) homeStarted = true;
                 if (awayComp.status?.type?.state === 'in' || awayFinal) awayStarted = true;
              }

              let newStatus = data.status;
              let newActive = data.active;

              if (homeFinal && awayFinal) {
                newStatus = 'STATUS_FINAL';
                newActive = false;
              } else if (homeStarted || awayStarted) {
                newStatus = 'STATUS_IN_PROGRESS';
                newActive = false;
              }

              let currentThruDesc = 'In Progress';
              if (newStatus === 'STATUS_IN_PROGRESS') {
                const homeThru = homeComp.status?.thru || 0;
                const awayThru = awayComp.status?.thru || 0;
                let minThru = 0;

                if (homeThru > 0 && awayThru > 0) {
                  minThru = Math.min(homeThru, awayThru);
                } else if (homeThru > 0) {
                  minThru = homeThru;
                } else if (awayThru > 0) {
                  minThru = awayThru;
                }

                if (minThru > 0) {
                  currentThruDesc = `THRU ${minThru}`;
                }
              }

              const needsUpdate = data.status !== newStatus ||
                  data.statusDesc !== (newStatus === 'STATUS_FINAL' ? 'Final' : newStatus === 'STATUS_IN_PROGRESS' ? currentThruDesc : 'Upcoming') ||
                  data.homeTeam?.score !== homeScore ||
                  data.awayTeam?.score !== awayScore ||
                  data.active !== newActive;

              if (needsUpdate) {
                const updateData: any = {
                  ...data,
                  status: newStatus,
                  statusDesc: newStatus === 'STATUS_FINAL' ? 'Final' : newStatus === 'STATUS_IN_PROGRESS' ? currentThruDesc : 'Upcoming',
                  active: newActive,
                  homeTeam: {
                      ...data.homeTeam,
                      score: homeScore
                  },
                  awayTeam: {
                      ...data.awayTeam,
                      score: awayScore
                  },
                  updatedAt: Date.now()
                };

                const flattenedUpdate: any = {
                  active: updateData.active,
                  status: updateData.status,
                  statusDesc: updateData.statusDesc,
                  'homeTeam.score': updateData.homeTeam.score,
                  'awayTeam.score': updateData.awayTeam.score,
                  updatedAt: updateData.updatedAt
                };

                Object.keys(flattenedUpdate).forEach(key => flattenedUpdate[key] === undefined && delete flattenedUpdate[key]);

                batch.update(doc.ref, flattenedUpdate);
                opCount++;
                updateCount++;

                if (newStatus === 'STATUS_FINAL' && data.status !== 'STATUS_FINAL') {
                  matchupsToGrade.push({ ...data, ...updateData, id: existingGameId, gameId: existingGameId });
                }

                if (opCount >= 500) {
                  await batch.commit();
                  batch = adminDb.batch();
                  opCount = 0;
                }
              }
            }
          }
          continue;
        }

        const gameId = scrapedMatchup.gameId;
        scrapedGameIds.add(gameId);
        const existingDoc = existingMap.get(gameId);

        if (existingDoc) {
          const existingData = existingDoc.data();

          if (existingData.abandoned) {
            continue;
          }

          const newTitle = existingData.hasCustomTitle ? existingData.title : scrapedMatchup.title;

          let finalActive = existingData.active;

          if (!scoreboardOnly) {
            let scraperActive = scrapedMatchup.active;
            if (!scraperActive && existingData.type !== 'SCORE') {
              scraperActive = true;
            }

            // Only deactivate if scraper says it shouldn't be active (e.g. wild odds)
            // If it's already active, don't let defaultActive=false override it
            if (existingData.active && !scraperActive) {
              const picksSnap = await adminDb.collection('picks').where('matchupId', '==', gameId).limit(1).get();
              if (!picksSnap.empty) {
                finalActive = true;
              } else {
                finalActive = false;
              }
            }
          }

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
              existingData.awayTeam?.id !== scrapedMatchup.awayTeam?.id ||
              existingData.active !== finalActive ||
              existingData.metadata?.overUnder !== scrapedMatchup.metadata?.overUnder ||
              JSON.stringify(existingData.metadata?.homeLinescores) !== JSON.stringify(scrapedMatchup.metadata?.homeLinescores) ||
              JSON.stringify(existingData.metadata?.awayLinescores) !== JSON.stringify(scrapedMatchup.metadata?.awayLinescores) ||
              (existingData.type !== 'SPREAD' && existingData.metadata?.spread !== scrapedMatchup.metadata?.spread);

          if (needsUpdate || existingDoc.id !== gameId) {
            const updateData: any = {
              ...existingData,
              title: newTitle,
              active: finalActive,
              status: scrapedMatchup.status,
              statusDesc: scrapedMatchup.statusDesc,
              startTime: scrapedMatchup.startTime,
              homeTeam: {
                  ...(existingData.homeTeam || {}),
                  id: scrapedMatchup.homeTeam?.id || existingData.homeTeam?.id,
                  name: scrapedMatchup.homeTeam?.name || existingData.homeTeam?.name,
                  image: scrapedMatchup.homeTeam?.image || existingData.homeTeam?.image,
                  score: scrapedMatchup.homeTeam?.score ?? existingData.homeTeam?.score ?? 0
              },
              awayTeam: {
                  ...(existingData.awayTeam || {}),
                  id: scrapedMatchup.awayTeam?.id || existingData.awayTeam?.id,
                  name: scrapedMatchup.awayTeam?.name || existingData.awayTeam?.name,
                  image: scrapedMatchup.awayTeam?.image || existingData.awayTeam?.image,
                  score: scrapedMatchup.awayTeam?.score ?? existingData.awayTeam?.score ?? 0
              },
              metadata: {
                  ...(existingData.metadata || {}),
                  overUnder: scrapedMatchup.metadata?.overUnder,
                  spread: existingData.type === 'SPREAD' ? existingData.metadata?.spread : scrapedMatchup.metadata?.spread,
                  homeLinescores: scrapedMatchup.metadata?.homeLinescores,
                  awayLinescores: scrapedMatchup.metadata?.awayLinescores,
                  network: scrapedMatchup.metadata?.network
              },
              updatedAt: Date.now()
            };

            // Flatten update properties specifically for batch.update when NOT migrating
            const flattenedUpdate: any = {
              title: updateData.title,
              active: updateData.active,
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
              'metadata.homeLinescores': updateData.metadata.homeLinescores,
              'metadata.awayLinescores': updateData.metadata.awayLinescores,
              'metadata.network': updateData.metadata.network,
              updatedAt: updateData.updatedAt
            };

            Object.keys(flattenedUpdate).forEach(key => flattenedUpdate[key] === undefined && delete flattenedUpdate[key]);

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
          if (data.status === 'STATUS_SCHEDULED' && !data.abandoned && !scrapedGameIds.has(gameId) && data.league !== 'PGA' && data.league !== 'CBASE') {
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
                'homeTeam.score': matchup.homeTeam?.score ?? 0,
                'awayTeam.score': matchup.awayTeam?.score ?? 0,
                updatedAt: Date.now()
              };
              await doc.ref.update(updateData);

              pickemMatchupsToGrade.push({
                ...pData,
                status: matchup.status,
                statusDesc: matchup.statusDesc,
                homeTeam: { ...(pData.homeTeam || {}), score: matchup.homeTeam?.score ?? 0 },
                awayTeam: { ...(pData.awayTeam || {}), score: matchup.awayTeam?.score ?? 0 },
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
    } catch (e: any) {
      console.error(`[Sync] Error writing to Firestore for ${league}:`, e);
      response.error = e.message;
    }
  } else if (!adminDb) {
    console.warn(`[Sync] Skipping Firestore write for ${league} because adminDb is not initialized.`);
  }

  return response;
}
