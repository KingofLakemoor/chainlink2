import * as firebaseAdmin from '../lib/firebase-admin.js';

let getAdminDb = () => firebaseAdmin.adminDb;
export function setAdminDbMock(mock: any) { getAdminDb = () => mock; }

export async function gradeLink4Matchups(matchups: any[]) {
  if (!getAdminDb()) {
    console.warn("[Link4Grader] adminDb is not initialized. Skipping grading.");
    return;
  }

  const finalMatchups = matchups.filter(m => m.status === 'STATUS_FINAL' || m.status === 'STATUS_POSTPONED');
  if (finalMatchups.length === 0) return;

  console.log(`[Link4Grader] Found \${finalMatchups.length} final matchups to grade.`);

  // Evaluate all active link4 segments
  const adminDb = getAdminDb();
  if (!adminDb) return;

  const now = new Date().toISOString();
  // Find all active segments (endTime is in the future) or segments that haven't been marked as payoutComplete
  const segmentsRef = adminDb.collection('link4Segments');
  const activeSegmentsSnap = await segmentsRef.where('payoutComplete', '!=', true).get();

  if (activeSegmentsSnap.empty) {
    return;
  }

  for (const segmentDoc of activeSegmentsSnap.docs) {
    const segmentId = segmentDoc.id;
    const picksSnap = await adminDb.collection('link4Picks').where('segmentId', '==', segmentId).get();

    if (picksSnap.empty) continue;

    for (const pickDoc of picksSnap.docs) {
      const pickData = pickDoc.data();
      if (pickData.hasLoss) continue; // Already eliminated

      let isModified = false;
      let hasNewLoss = false;

      // Ensure the picks array exists
      if (!pickData.picks || !Array.isArray(pickData.picks)) continue;

      const newPicks = pickData.picks.map((pick: any) => {
        // Skip if this pick is already graded
        if (pick.status && pick.status !== 'PENDING') return pick;

        // Try to find the pick in the currently finalized matchups
        const matchupId = pick.id.replace('pick-', '');
        const finalizedMatchup = finalMatchups.find(m => m.gameId === matchupId || m.id === matchupId);

        if (!finalizedMatchup) return pick; // Not finalized in this batch

        // Determine outcome
        let status = 'PENDING';
        if (finalizedMatchup.status === 'STATUS_POSTPONED') {
           status = 'PUSH';
        } else {
           const homeScore = finalizedMatchup.homeTeam?.score || 0;
           const awayScore = finalizedMatchup.awayTeam?.score || 0;
           let won = false;
           if (homeScore === awayScore) {
             status = 'PUSH';
           } else {
             const pickedHome = pick.name === finalizedMatchup.homeTeam?.name;
             if (pickedHome && homeScore > awayScore) won = true;
             if (!pickedHome && awayScore > homeScore) won = true;
             status = won ? 'WIN' : 'LOSS';
           }
        }

        if (status === 'LOSS') {
           hasNewLoss = true;
        }

        isModified = true;
        return { ...pick, status };
      });

      if (isModified) {
        // If a loss occurred, mark remaining pending picks as cancelled
        if (hasNewLoss) {
          newPicks.forEach((pick: any) => {
             if (!pick.status || pick.status === 'PENDING') {
                pick.status = 'CANCELLED';
             }
          });
        }

        await adminDb.collection('link4Picks').doc(pickDoc.id).update({
          picks: newPicks,
          hasLoss: pickData.hasLoss || hasNewLoss,
          updatedAt: Date.now()
        });
        console.log(`[Link4Grader] Updated link4Pick \${pickDoc.id} with \${hasNewLoss ? 'a LOSS' : 'new grades'}.`);
      }
    }
  }
}
