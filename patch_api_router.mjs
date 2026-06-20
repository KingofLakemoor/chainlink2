import fs from 'fs';

const content = fs.readFileSync('src/apiRouter.ts', 'utf8');

const targetIndex = content.indexOf('apiRouter.post("/picks/cancel-pick"');

const newRoute = `
apiRouter.post("/picks/forfeit-pick", async (req, res) => {
  try {
    const { matchupId } = req.body;
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({ success: false, error: 'Unauthorized' });
    }

    const idToken = authHeader.split('Bearer ')[1];
    const adminAuth = (await import('./lib/firebase-admin.js')).adminAuth;
    const adminDb = (await import('./lib/firebase-admin.js')).adminDb;

    if (!adminAuth || !adminDb) return res.status(500).json({ success: false, error: "admin tools not initialized" });

    const decodedToken = await adminAuth.verifyIdToken(idToken);
    const uid = decodedToken.uid;

    await adminDb.runTransaction(async (transaction) => {
      const userRef = adminDb.collection('users').doc(uid);
      const userDoc = await transaction.get(userRef);
      if (!userDoc.exists) throw new Error("User not found");
      const userData = userDoc.data();

      if (!userData.premium) {
        throw new Error("Must be a ChainLink Pro member to forfeit a pick.");
      }

      const matchupRef = adminDb.collection('matchups').doc(matchupId);
      const matchupDoc = await transaction.get(matchupRef);
      if (!matchupDoc.exists) throw new Error("Matchup not found");

      const matchup = matchupDoc.data();

      if (matchup.status === 'STATUS_SCHEDULED' || matchup.status === 'STATUS_FINAL' || matchup.status === 'STATUS_POSTPONED' || matchup.status === 'STATUS_CANCELED' || matchup.statusDesc?.toLowerCase().includes('final')) {
        throw new Error("Matchup cannot be forfeited in its current state.");
      }

      const pickId = uid + "_" + matchupId;
      const pickRef = adminDb.collection('picks').doc(pickId);
      const pickDoc = await transaction.get(pickRef);

      if (!pickDoc.exists) {
        throw new Error("Pick not found");
      }

      const pickData = pickDoc.data();
      if (pickData.status !== 'PENDING') {
        throw new Error("Pick is no longer pending");
      }

      const chainRef = adminDb.collection('chains').doc(\`\${uid}_current\`);
      const chainDoc = await transaction.get(chainRef);

      // Update pick
      transaction.update(pickRef, {
        status: 'LOSS',
        score: 0,
        settledAt: Date.now(),
        forfeited: true,
        updatedAt: Date.now()
      });

      // Update user stats
      let stats = userData.stats || { wins: 0, losses: 0, pushes: 0 };
      let allTimeStats = userData.allTimeStats || { wins: stats.wins, losses: stats.losses, pushes: stats.pushes };
      let statsByLeague = userData.statsByLeague || {};
      const matchupLeague = matchup.league;
      if (!statsByLeague[matchupLeague]) {
        statsByLeague[matchupLeague] = { wins: 0, losses: 0, pushes: 0 };
      }

      stats.losses += 1;
      allTimeStats.losses += 1;
      statsByLeague[matchupLeague].losses += 1;

      transaction.update(userRef, {
        stats,
        allTimeStats,
        statsByLeague,
        updatedAt: Date.now()
      });

      // Update chain
      if (chainDoc.exists) {
         let chainData = chainDoc.data();
         chainData.chain = chainData.chain > 0 ? -1 : (chainData.chain === 0 ? -1 : chainData.chain - 1);
         chainData.losses = (chainData.losses || 0) + 1;
         transaction.update(chainRef, chainData);
      }
    });

    res.json({ success: true });
  } catch (e) {
    console.error("Forfeit pick error:", e.message, e);
    res.status(500).json({ success: false, error: e.message });
  }
});
`;

const updatedContent = content.slice(0, targetIndex) + newRoute + content.slice(targetIndex);

fs.writeFileSync('src/apiRouter.ts', updatedContent, 'utf8');
