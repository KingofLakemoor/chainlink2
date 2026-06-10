import fs from 'fs';

let content = fs.readFileSync('src/services/link4Grader.ts', 'utf8');

const insertCode = `
export async function payoutLink4Segment(segmentId: string) {
  const adminDb = getAdminDb();
  if (!adminDb) return;

  await adminDb.runTransaction(async (transaction: any) => {
    const segmentRef = adminDb.collection('link4Segments').doc(segmentId);
    const segmentDoc = await transaction.get(segmentRef);

    if (!segmentDoc.exists) throw new Error("Segment not found");
    if (segmentDoc.data().payoutComplete) throw new Error("Payout already completed for this segment");

    const picksSnap = await transaction.get(adminDb.collection('link4Picks').where('segmentId', '==', segmentId));
    if (picksSnap.empty) {
       transaction.update(segmentRef, { payoutComplete: true, updatedAt: Date.now() });
       return; // no one played
    }

    const allPicks = picksSnap.docs.map((d: any) => ({ id: d.id, ...d.data() }));
    const totalPot = allPicks.length * 10;
    const payoutAmount = Math.floor(totalPot * 0.60);

    // Find the winner
    let highestScore = -Infinity;
    let winnerId = null;

    for (const entry of allPicks) {
       if (entry.hasLoss) continue; // Eliminated

       let wins = 0;
       let score = 0;
       let stillPending = false;

       const rawPicks = Array.isArray(entry.picks) ? entry.picks : (entry.picks ? Object.values(entry.picks) : []);

       for (const pick of rawPicks as any[]) {
          if (pick.status === 'WIN') {
             wins++;
             const matchupDoc = await transaction.get(adminDb.collection('matchups').doc(pick.id.replace('pick-', '')));
             if (matchupDoc.exists) {
               const matchup = matchupDoc.data();
               const pickedHome = pick.name === matchup.homeTeam?.name;
               const ml = pickedHome ? matchup.metadata?.mlHome : matchup.metadata?.mlAway;
               if (ml !== undefined && ml !== null) {
                  score += ml;
               }
             }
          } else if (pick.status === 'PENDING') {
             stillPending = true;
          }
       }

       if (wins === 4 && !stillPending) {
          if (score > highestScore) {
             highestScore = score;
             winnerId = entry.userId;
          }
       }
    }

    if (winnerId) {
       const userRef = adminDb.collection('users').doc(winnerId);
       const userDoc = await transaction.get(userRef);
       if (userDoc.exists) {
          const userData = userDoc.data();
          transaction.update(userRef, { links: (userData.links || 0) + payoutAmount });

          const notificationsRef = adminDb.collection('notifications').doc();
          transaction.set(notificationsRef, {
            title: 'Link4 Winner! 🎉',
            body: \`You won the Link4 Segment! \${payoutAmount} links have been added to your account.\`,
            audience: 'USER',
            targetUserId: winnerId,
            status: 'PENDING',
            scheduledTime: Date.now(),
            createdAt: Date.now()
          });
       }
    }

    transaction.update(segmentRef, { payoutComplete: true, updatedAt: Date.now() });
  });
}

export async function processCompletedLink4Segments() {
  const adminDb = getAdminDb();
  if (!adminDb) return;

  const now = new Date().toISOString();
  const segmentsSnap = await adminDb.collection('link4Segments')
    .where('payoutComplete', '!=', true)
    .where('endTime', '<=', now)
    .get();

  if (segmentsSnap.empty) return;

  console.log(\`[Link4Grader] Found \${segmentsSnap.size} completed segments to payout.\`);

  for (const segmentDoc of segmentsSnap.docs) {
    try {
      await payoutLink4Segment(segmentDoc.id);
      console.log(\`[Link4Grader] Successfully paid out segment \${segmentDoc.id}.\`);
    } catch (e: any) {
      console.error(\`[Link4Grader] Error paying out segment \${segmentDoc.id}:\`, e);
    }
  }
}
`;

content = content + insertCode;

fs.writeFileSync('src/services/link4Grader.ts', content, 'utf8');
