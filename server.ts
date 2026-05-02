import 'dotenv/config';
import express from "express";
import path from "path";
import { scrapeLeagueSchedules } from "./src/services/scheduleProcessor.js";
import { initializeApp, cert } from 'firebase-admin/app';

// Note: initializeApp for admin requires service account credentials in a production setting.
// Since we are using Firebase, let's export an endpoint or a button to trigger it manually,
// or set up a basic cron. For local/preview, we can sometimes initialize without credentials
// if it's the default project or we just use client SDK for now if Admin isn't available.

async function startServer() {
  const app = express();
  const PORT = 3000;

  app.use(express.json());

  // Global middleware to set Cross-Origin-Opener-Policy
  app.use((req, res, next) => {
    res.setHeader('Cross-Origin-Opener-Policy', 'same-origin-allow-popups');
    next();
  });

  // Dynamic Firebase config endpoint
  app.get('/__/firebase/init.json', async (req, res) => {
    try {
      const fs = await import('fs');
      const path = await import('path');
      const configPath = path.join(process.cwd(), 'firebase-applet-config.json');
      const configStr = fs.readFileSync(configPath, 'utf-8');
      const config = JSON.parse(configStr);
      res.json({
        ...config,
        apiKey: process.env.VITE_FIREBASE_API_KEY || ''
      });
    } catch (e) {
      console.error('Error serving init.json:', e);
      res.json({ apiKey: process.env.VITE_FIREBASE_API_KEY || '' });
    }
  });

  // API boundaries
  app.post("/api/picks/cancel-pick", async (req, res) => {
    try {
      const { matchupId } = req.body;
      const authHeader = req.headers.authorization;
      if (!authHeader || !authHeader.startsWith('Bearer ')) {
        return res.status(401).json({ success: false, error: 'Unauthorized' });
      }

      const idToken = authHeader.split('Bearer ')[1];
      const { adminAuth, adminDb } = await import("./src/lib/firebase-admin.js");
      if (!adminAuth || !adminDb) return res.status(500).json({ success: false, error: "admin tools not initialized" });

      const decodedToken = await adminAuth.verifyIdToken(idToken);
      const uid = decodedToken.uid;

      await adminDb.runTransaction(async (transaction: any) => {
        const userRef = adminDb.collection('users').doc(uid);
        const userDoc = await transaction.get(userRef);
        if (!userDoc.exists) throw new Error("User not found");

        const matchupRef = adminDb.collection('matchups').doc(matchupId);
        const matchupDoc = await transaction.get(matchupRef);
        if (!matchupDoc.exists) throw new Error("Matchup not found");

        const matchup = matchupDoc.data()!;
        if (!matchup.active) throw new Error("Matchup is locked");
        if (matchup.status !== 'STATUS_SCHEDULED' && matchup.status !== 'STATUS_POSTPONED') {
          throw new Error("Matchup has already started and cannot be cancelled");
        }

        const pickId = uid + "_" + matchupId;
        const pickRef = adminDb.collection('picks').doc(pickId);
        const pickDoc = await transaction.get(pickRef);

        if (!pickDoc.exists) {
          throw new Error("Pick not found");
        }

        const pickData = pickDoc.data()!;
        if (pickData.status !== 'PENDING') {
          throw new Error("Pick is no longer pending");
        }

        const profile = userDoc.data()!;
        const refundAmount = pickData.coins ?? 0;

        transaction.delete(pickRef);

        const updateData: any = { updatedAt: Date.now() };
        if (refundAmount > 0) {
          updateData.coins = profile.coins + refundAmount;
        }
        transaction.update(userRef, updateData);
      });

      res.json({ success: true });
    } catch (e: any) {
      console.error("Cancel pick error:", e.message, e);
      res.status(500).json({ success: false, error: e.message });
    }
  });

  app.post("/api/picks/make-pick", async (req, res) => {
    try {
      const { matchupId, team } = req.body;
      const authHeader = req.headers.authorization;
      if (!authHeader || !authHeader.startsWith('Bearer ')) {
        return res.status(401).json({ success: false, error: 'Unauthorized' });
      }

      const idToken = authHeader.split('Bearer ')[1];
      const { adminAuth, adminDb } = await import("./src/lib/firebase-admin.js");
      if (!adminAuth || !adminDb) return res.status(500).json({ success: false, error: "admin tools not initialized" });

      const decodedToken = await adminAuth.verifyIdToken(idToken);
      const uid = decodedToken.uid;

      // Start transaction to check existing pick, check coins, deduct coins, and save pick
      await adminDb.runTransaction(async (transaction: any) => {
        const userRef = adminDb.collection('users').doc(uid);
        const userDoc = await transaction.get(userRef);
        if (!userDoc.exists) throw new Error("User not found");

        const matchupRef = adminDb.collection('matchups').doc(matchupId);
        const matchupDoc = await transaction.get(matchupRef);
        if (!matchupDoc.exists) throw new Error("Matchup not found");

        const matchup = matchupDoc.data()!;
        if (!matchup.active) throw new Error("Matchup is locked");
        if (matchup.status !== 'STATUS_SCHEDULED' && matchup.status !== 'STATUS_POSTPONED') {
          throw new Error("Matchup has already started");
        }

        const profile = userDoc.data()!;
        if (matchup.cost > 0 && profile.coins < matchup.cost) {
          throw new Error("Not enough links!");
        }

        const picksQuery = adminDb.collection('picks').where('userId', '==', uid).where('status', '==', 'PENDING');
        const activePicks = await transaction.get(picksQuery);
        if (!activePicks.empty) {
          throw new Error("You already have an active pick!");
        }

        const pickId = uid + "_" + matchupId;
        const newPickRef = adminDb.collection('picks').doc(pickId);

        transaction.set(newPickRef, {
          userId: uid,
          matchupId,
          pick: team,
          status: 'PENDING',
          coins: matchup.cost,
          active: true,
          createdAt: Date.now(),
          updatedAt: Date.now()
        });

        const updateData: any = { updatedAt: Date.now() };
        if (matchup.cost > 0) {
          updateData.coins = profile.coins - matchup.cost;
        }
        transaction.update(userRef, updateData);
      });

      res.json({ success: true });
    } catch (e: any) {
      console.error("Make pick error:", e.message, e);
      res.status(500).json({ success: false, error: e.message });
    }
  });


  app.post("/api/admin/sync-schedules", async (req, res) => {
    try {
      const { league } = req.body;
      const result = await scrapeLeagueSchedules(league);
      res.json({ success: true, result });
    } catch (e: any) {
      console.error(e);
      res.status(500).json({ success: false, error: e.message });
    }
  });

  app.post("/api/admin/grade-matchup", async (req, res) => {
    try {
      const { gameId } = req.body;
      const { adminDb } = await import("./src/lib/firebase-admin.js");
      const { gradeMatchups } = await import("./src/services/grader.js");

      if (!adminDb) return res.status(500).json({ success: false, error: "adminDb not initialized" });

      const snap = await adminDb.collection('matchups').where('gameId', '==', gameId).get();
      if (snap.empty) {
         return res.status(404).json({ success: false, error: "Matchup not found" });
      }

      const matchup = snap.docs[0].data();
      await gradeMatchups([{ ...matchup, status: 'STATUS_FINAL' }]); // Force grade
      res.json({ success: true });
    } catch (e: any) {
      console.error("Make pick error:", e.message, e);
      res.status(500).json({ success: false, error: e.message });
    }
  });

  if (process.env.NODE_ENV !== "production") {
    const { createServer: createViteServer } = await import("vite");
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer();
