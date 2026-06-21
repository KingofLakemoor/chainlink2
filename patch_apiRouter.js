import fs from 'fs';

const content = fs.readFileSync('src/apiRouter.ts', 'utf8');

const claimDailyRoute = `
apiRouter.post("/shop/claim-daily", async (req, res) => {
  try {
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

      const profile = userDoc.data()!;
      if (!profile.premium) {
        throw new Error("Must be a ChainLink Pro member to claim daily links.");
      }

      const todayStr = new Date().toLocaleDateString('en-US', { timeZone: 'America/New_York' });
      if (profile.lastDailyClaim === todayStr) {
        throw new Error("You have already claimed your daily links today.");
      }

      const updateData: any = {
        updatedAt: Date.now(),
        links: (profile.links || 0) + 10,
        lastDailyClaim: todayStr
      };

      transaction.update(userRef, updateData);
    });

    res.json({ success: true });
  } catch (e: any) {
    console.error("Claim daily links error:", e.message, e);
    res.status(500).json({ success: false, error: e.message });
  }
});

`;

// Insert it right after the buy item route
const searchString = `    res.status(500).json({ success: false, error: e.message });
  }
});`;

const updatedContent = content.replace(searchString, searchString + '\n' + claimDailyRoute);

fs.writeFileSync('src/apiRouter.ts', updatedContent);
console.log("Patched src/apiRouter.ts");
