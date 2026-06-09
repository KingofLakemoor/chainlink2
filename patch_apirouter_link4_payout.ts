import fs from 'fs';

let content = fs.readFileSync('src/apiRouter.ts', 'utf8');

const insertCode = `
apiRouter.post("/admin/link4/payout", validateAdmin, async (req, res) => {
  try {
    const { segmentId } = req.body;
    if (!adminDb) return res.status(500).json({ success: false, error: 'admin tools not initialized' });

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

         // Assuming gradeLink4Matchups has already ran and marked statuses.
         // We only score completed picks. If they have a pending pick, they can't win yet unless we force grade.
         for (const pick of rawPicks as any[]) {
            if (pick.status === 'WIN') {
               wins++;
               // To compute ML score, we actually need the matchup metadata which was done locally in Link4Page.
               // For a robust backend payout, we should retrieve the matchup documents.
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

            // Send notification
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

    res.json({ success: true });
  } catch (e: any) {
    console.error('Link4 payout error:', e);
    res.status(500).json({ success: false, error: e.message });
  }
});

`;

content = content.replace('apiRouter.post("/admin/sync-schedules", validateAdmin, async (req, res) => {', insertCode + 'apiRouter.post("/admin/sync-schedules", validateAdmin, async (req, res) => {');

fs.writeFileSync('src/apiRouter.ts', content, 'utf8');
