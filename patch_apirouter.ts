import fs from 'fs';

let content = fs.readFileSync('src/apiRouter.ts', 'utf8');

const insertCode = `
apiRouter.post("/link4/submit", async (req, res) => {
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
      const userRef = adminDb.collection('users').doc(uid);
      const userDoc = await transaction.get(userRef);
      if (!userDoc.exists) throw new Error("User not found");

      const userData = userDoc.data();
      const currentLinks = userData.links || 0;
      if (currentLinks < 10) {
        throw new Error("Not enough links. Link4 requires 10 links to enter.");
      }

      const pickRef = adminDb.collection('link4Picks').doc(\`\${segmentId}_\${uid}\`);
      const pickDoc = await transaction.get(pickRef);
      if (pickDoc.exists) {
        throw new Error("You have already submitted picks for this segment.");
      }

      transaction.update(userRef, { links: currentLinks - 10 });

      transaction.set(pickRef, {
        segmentId,
        userId: uid,
        username: username || 'Anonymous',
        avatarUrl: avatarUrl || \`https://api.dicebear.com/7.x/avataaars/svg?seed=\${uid}\`,
        picks,
        hasLoss: false,
        submittedAt: Date.now()
      });
    });

    res.json({ success: true });
  } catch (error: any) {
    console.error('Error submitting Link4 picks:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

`;

content = content.replace('apiRouter.post("/picks/cancel-pick", async (req, res) => {', insertCode + 'apiRouter.post("/picks/cancel-pick", async (req, res) => {');

fs.writeFileSync('src/apiRouter.ts', content, 'utf8');
