import * as firebaseAdmin from '../lib/firebase-admin.js';

// Allows test script to override adminDb
let getAdminDb = () => firebaseAdmin.adminDb;
export function setAdminDbMock(mock: any) { getAdminDb = () => mock; }

export async function gradeMatchups(matchups: any[]) {
  if (!getAdminDb()) {
    console.warn("[Grader] adminDb is not initialized. Skipping grading.");
    return;
  }

  const finalMatchups = matchups.filter(m => m.status === 'STATUS_FINAL' || m.status === 'STATUS_POSTPONED');
  if (finalMatchups.length === 0) return;

  console.log(`[Grader] Found ${finalMatchups.length} final matchups to grade.`);

  for (const matchup of finalMatchups) {
    try {
      await gradeSingleMatchup(matchup);
    } catch (e: any) {
      console.error(`[Grader] Error grading matchup ${matchup.gameId}:`, e);
    }
  }
}

export async function gradeSingleMatchup(matchup: any) {
  const adminDb = getAdminDb();
  if (!adminDb) return;

  const picksRef = adminDb.collection('picks');
  const pendingPicksSnap = await picksRef
    .where('matchupId', '==', matchup.gameId)
    .where('status', '==', 'PENDING')
    .get();

  if (pendingPicksSnap.empty) {
    console.log(`[Grader] No pending picks for matchup ${matchup.gameId}.`);
    return;
  }

  console.log(`[Grader] Grading ${pendingPicksSnap.size} picks for matchup ${matchup.gameId}.`);

  const homeScore = matchup.homeTeam?.score || 0;
  const awayScore = matchup.awayTeam?.score || 0;
  const lowerScoreWins = matchup.metadata?.lowerScoreWins;
  const isPostponed = matchup.status === 'STATUS_POSTPONED';

  let winnerId: string | null = null;
  let isTie = false;

  if (isPostponed) {
    isTie = true; // Treats postponed as a push to refund
  } else if (homeScore === awayScore) {
    isTie = true;
  } else if (lowerScoreWins) {
    winnerId = homeScore < awayScore ? matchup.homeTeam.id : matchup.awayTeam.id;
  } else {
    winnerId = homeScore > awayScore ? matchup.homeTeam.id : matchup.awayTeam.id;
  }

  for (const pickDoc of pendingPicksSnap.docs) {
    const pickData = pickDoc.data();
    const userId = pickData.userId;
    const wager = pickData.coins || 10;

    let pickStatus = 'LOSS';
    if (isTie) {
      pickStatus = 'PUSH';
    } else if (pickData.pick?.id === winnerId) {
      pickStatus = 'WIN';
    }

    try {
      await adminDb.runTransaction(async (transaction: any) => {
        const userRef = adminDb!.collection('users').doc(userId);
        const chainRef = adminDb!.collection('chains').doc(`${userId}_current`);

        const userDoc = await transaction.get(userRef);
        const chainDoc = await transaction.get(chainRef);

        if (!userDoc.exists) return;

        const userData = userDoc.data()!;
        let coins = userData.coins || 0;
        let stats = userData.stats || { wins: 0, losses: 0, pushes: 0 };

        let chainData = chainDoc.exists ? chainDoc.data()! : { chain: 0, wins: 0, losses: 0, best: 0 };

        // Apply logic
        if (pickStatus === 'WIN') {
          // Typically reward is cost * 2, let's assume standard wager * 2 for win
          coins += wager * 2;
          stats.wins += 1;
          chainData.chain += 1;
          chainData.wins += 1;
          if (chainData.chain > (chainData.best || 0)) {
            chainData.best = chainData.chain;
          }
        } else if (pickStatus === 'LOSS') {
          stats.losses += 1;
          chainData.chain = 0; // Reset chain
          chainData.losses += 1;
        } else if (pickStatus === 'PUSH') {
          // Refund wager
          coins += wager;
          stats.pushes += 1;
          // Chain typically doesn't break on a push, but doesn't increase
        }

        // Write updates
        transaction.update(pickDoc.ref, {
          status: pickStatus,
          updatedAt: Date.now()
        });

        transaction.update(userRef, {
          coins,
          stats,
          updatedAt: Date.now()
        });

        transaction.set(chainRef, {
          ...chainData,
          userId,
          active: true,
          updatedAt: Date.now()
        }, { merge: true });
      });

      console.log(`[Grader] Pick ${pickDoc.id} graded as ${pickStatus}. User ${userId} updated.`);
    } catch (err) {
      console.error(`[Grader] Failed to grade pick ${pickDoc.id}:`, err);
    }
  }
}
