import { adminDb } from '../src/lib/firebase-admin.js';
import { gradePickemMatchups } from '../src/services/pickemGrader.js';

async function run() {
  if (!adminDb) {
    console.error("No adminDb found");
    return;
  }

  console.log("Fetching all pickemMatchups...");
  const pickemSnaps = await adminDb.collection('pickemMatchups').get();
  console.log(`Found ${pickemSnaps.size} pickem matchups.`);

  let batch = adminDb.batch();
  let opCount = 0;
  const pickemMatchupsToGrade: any[] = [];
  let updateCount = 0;

  for (const doc of pickemSnaps.docs) {
    const pData = doc.data();
    if (!pData.gameId) continue;

    const matchupSnap = await adminDb.collection('matchups').doc(pData.gameId).get();
    if (!matchupSnap.exists) {
        console.warn(`Original matchup ${pData.gameId} not found for pickemMatchup ${doc.id}`);
        continue;
    }

    const matchup = matchupSnap.data() as any;

    const updateData = {
      status: matchup.status,
      statusDesc: matchup.statusDesc,
      'homeTeam.score': matchup.homeTeam?.score ?? 0,
      'awayTeam.score': matchup.awayTeam?.score ?? 0,
      updatedAt: Date.now()
    };

    if (pData.status !== updateData.status ||
        pData.statusDesc !== updateData.statusDesc ||
        pData.homeTeam?.score !== updateData['homeTeam.score'] ||
        pData.awayTeam?.score !== updateData['awayTeam.score']) {

      console.log(`Updating pickemMatchup ${doc.id} (${pData.title}) to match original matchup: ${updateData.status} (${updateData.statusDesc})`);
      batch.update(doc.ref, updateData);
      opCount++;
      updateCount++;

      if (opCount >= 500) {
        await batch.commit();
        batch = adminDb.batch();
        opCount = 0;
      }

      if (updateData.status === 'STATUS_FINAL' || updateData.status === 'STATUS_POSTPONED') {
        pickemMatchupsToGrade.push({
          ...pData,
          status: matchup.status,
          statusDesc: matchup.statusDesc,
          homeTeam: { ...(pData.homeTeam || {}), score: matchup.homeTeam?.score ?? 0 },
          awayTeam: { ...(pData.awayTeam || {}), score: matchup.awayTeam?.score ?? 0 },
          id: doc.id
        });
      }
    }
  }

  if (opCount > 0) {
    await batch.commit();
  }

  console.log(`Updated ${updateCount} pickem matchups.`);

  if (pickemMatchupsToGrade.length > 0) {
    console.log(`Grading ${pickemMatchupsToGrade.length} final/postponed pickem matchups...`);
    await gradePickemMatchups(pickemMatchupsToGrade);
    console.log("Grading complete.");
  } else {
    console.log("No pickem matchups needed grading.");
  }

  console.log("Done.");
  process.exit(0);
}

run().catch(err => {
  console.error("Error running script:", err);
  process.exit(1);
});
