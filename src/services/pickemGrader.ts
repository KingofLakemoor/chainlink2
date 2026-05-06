import * as firebaseAdmin from '../lib/firebase-admin.js';

let getAdminDb = () => firebaseAdmin.adminDb;
export function setAdminDbMock(mock: any) { getAdminDb = () => mock; }

export async function gradePickemMatchups(pickemMatchups: any[]) {
  if (!getAdminDb()) {
    console.warn("[PickemGrader] adminDb is not initialized. Skipping grading.");
    return;
  }

  const finalMatchups = pickemMatchups.filter(m => m.status === 'STATUS_FINAL' || m.status === 'STATUS_POSTPONED');
  if (finalMatchups.length === 0) return;

  console.log(`[PickemGrader] Found ${finalMatchups.length} final pickem matchups to grade.`);

  for (const matchup of finalMatchups) {
    try {
      await gradeSinglePickemMatchup(matchup);
    } catch (e: any) {
      console.error(`[PickemGrader] Error grading pickem matchup ${matchup.id}:`, e);
    }
  }
}

export async function gradeSinglePickemMatchup(matchup: any) {
  const adminDb = getAdminDb();
  if (!adminDb) return;

  const picksRef = adminDb.collection('pickemPicks');
  const pendingPicksSnap = await picksRef
    .where('matchupId', '==', matchup.id)
    .where('status', '==', 'PENDING')
    .get();

  if (pendingPicksSnap.empty) {
    console.log(`[PickemGrader] No pending picks for pickem matchup ${matchup.id}.`);
    return;
  }

  console.log(`[PickemGrader] Grading ${pendingPicksSnap.size} picks for pickem matchup ${matchup.id}.`);

  const homeScore = matchup.homeTeam?.score || 0;
  const awayScore = matchup.awayTeam?.score || 0;
  const lowerScoreWins = matchup.metadata?.lowerScoreWins;
  const isPostponed = matchup.status === 'STATUS_POSTPONED';

  let adjustedHomeScore = homeScore;
  if (matchup.type === 'SPREAD' && typeof matchup.metadata?.spread === 'number') {
    adjustedHomeScore += matchup.metadata.spread;
  }

  let winnerId: string | null = null;
  let isTie = false;

  if (isPostponed) {
    isTie = true; // Treats postponed as a push
  } else if (adjustedHomeScore === awayScore) {
    isTie = true;
  } else if (lowerScoreWins) {
    winnerId = adjustedHomeScore < awayScore ? matchup.homeTeam.id : matchup.awayTeam.id;
  } else {
    winnerId = adjustedHomeScore > awayScore ? matchup.homeTeam.id : matchup.awayTeam.id;
  }

  for (const pickDoc of pendingPicksSnap.docs) {
    const pickData = pickDoc.data();

    let pickStatus = 'LOSS';
    let pointsEarned = 0;

    if (isTie) {
      pickStatus = 'PUSH';
      pointsEarned = 0;
    } else if (pickData.pick?.teamId === winnerId) {
      pickStatus = 'WIN';
      pointsEarned = 1; // Assuming 1 point per correct pick
    }

    try {
      await adminDb.runTransaction(async (transaction: any) => {
        const pickRefGet = await transaction.get(pickDoc.ref);
        if (!pickRefGet.exists || pickRefGet.data()?.status !== 'PENDING') {
           console.warn(`[PickemGrader] Pick ${pickDoc.id} is no longer PENDING or does not exist. Skipping.`);
           return;
        }

        transaction.update(pickDoc.ref, {
          status: pickStatus,
          pointsEarned,
          updatedAt: Date.now()
        });
      });

      console.log(`[PickemGrader] Pick ${pickDoc.id} graded as ${pickStatus}. Points: ${pointsEarned}.`);
    } catch (err) {
      console.error(`[PickemGrader] Failed to grade pickem pick ${pickDoc.id}:`, err);
    }
  }
}
