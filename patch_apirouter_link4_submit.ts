import fs from 'fs';

let content = fs.readFileSync('src/apiRouter.ts', 'utf8');

const submitEndpoint = `apiRouter.post("/link4/submit", async (req, res) => {
  try {
    const { segmentId, picks, username, avatarUrl } = req.body;
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({ success: false, error: 'Unauthorized' });
    }

    const idToken = authHeader.split('Bearer ')[1];
    if (!adminAuth || !adminDb) return res.status(500).json({ success: false, error: "admin tools not initialized" });

    const decodedToken = await adminAuth.verifyIdToken(idToken);
    const uid = decodedToken.uid;

    await adminDb.runTransaction(async (transaction: any) => {
      const segmentRef = adminDb.collection('link4Segments').doc(segmentId);
      const segmentDoc = await transaction.get(segmentRef);
      if (!segmentDoc.exists) throw new Error("Segment not found");
      const segmentData = segmentDoc.data();
      const cost = segmentData.cost ?? 10;

      const userRef = adminDb.collection('users').doc(uid);
      const userDoc = await transaction.get(userRef);
      if (!userDoc.exists) throw new Error("User not found");

      const pickRef = adminDb.collection('link4Picks').doc(\`\${segmentId}_\${uid}\`);
      const pickDoc = await transaction.get(pickRef);

      const userData = userDoc.data();
      const currentLinks = userData.links || 0;

      if (pickDoc.exists) {
        // User is appending picks. No fee deduction.
        const existingData = pickDoc.data();
        if (existingData.hasLoss) throw new Error("You have been eliminated and cannot make more picks.");

        const currentPicks = Array.isArray(existingData.picks) ? existingData.picks : (existingData.picks ? Object.values(existingData.picks) : []);

        // Ensure they aren't overwriting existing picks, only appending
        const incomingPicksCount = picks.filter((p: any) => p !== null).length;
        if (incomingPicksCount <= currentPicks.length) {
            throw new Error("Invalid submission. You can only append new picks.");
        }

        // Ensure previous picks match exactly
        for (let i = 0; i < currentPicks.length; i++) {
           if (picks[i] === null || picks[i].id !== currentPicks[i].id) {
               throw new Error("Invalid submission. Cannot modify locked picks.");
           }
        }

        // Only store non-null picks
        const sanitizedPicks = picks.filter((p: any) => p !== null);

        transaction.update(pickRef, {
          picks: sanitizedPicks,
          updatedAt: Date.now()
        });

      } else {
        // First pick, deduct fee
        if (currentLinks < cost) {
          throw new Error(\`Not enough links. Link4 requires \${cost} links to enter.\`);
        }

        const sanitizedPicks = picks.filter((p: any) => p !== null);
        if (sanitizedPicks.length === 0) {
            throw new Error("Must provide at least one pick to enter.");
        }

        transaction.update(userRef, { links: currentLinks - cost });

        transaction.set(pickRef, {
          segmentId,
          userId: uid,
          username: username || 'Anonymous',
          avatarUrl: avatarUrl || \`https://api.dicebear.com/7.x/avataaars/svg?seed=\${uid}\`,
          picks: sanitizedPicks,
          hasLoss: false,
          submittedAt: Date.now(),
          updatedAt: Date.now()
        });
      }
    });

    res.json({ success: true });
  } catch (error: any) {
    console.error('Error submitting Link4 picks:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});`;

content = content.replace(/apiRouter\.post\("\/link4\/submit", async \(req, res\) => \{[\s\S]*?res\.status\(500\)\.json\(\{ success: false, error: error\.message \}\);\n  \}\n\}\);/m, submitEndpoint);

fs.writeFileSync('src/apiRouter.ts', content, 'utf8');
