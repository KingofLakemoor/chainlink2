import express from "express";
import path from "path";
import { scrapeLeagueSchedules, syncLeagueSchedules } from "./src/services/scheduleProcessor.js";
import { initializeApp, cert } from 'firebase-admin/app';

// Note: initializeApp for admin requires service account credentials in a production setting.
// Since we are migrating from Convex, let's export an endpoint or a button to trigger it manually,
// or set up a basic cron. For local/preview, we can sometimes initialize without credentials
// if it's the default project or we just use client SDK for now if Admin isn't available.

async function startServer() {
  const app = express();
  const PORT = 3000;

  app.use(express.json());

  // API boundaries
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

    // Automatic schedule syncing
    const SYNC_INTERVAL = 10 * 60 * 1000; // 10 minutes
    const LEAGUES_TO_SYNC = ["NBA", "NHL", "MLB", "PGA"];

    console.log(`[Cron] Initializing automatic schedule sync every ${SYNC_INTERVAL / 1000 / 60} minutes for leagues: ${LEAGUES_TO_SYNC.join(', ')}`);

    setInterval(async () => {
      console.log(`[Cron] Starting scheduled sync cycle...`);
      for (const league of LEAGUES_TO_SYNC) {
        try {
          await syncLeagueSchedules(league);
        } catch (e) {
          console.error(`[Cron] Error syncing ${league}:`, e);
        }
      }
      console.log(`[Cron] Scheduled sync cycle complete.`);
    }, SYNC_INTERVAL);

    // Also run an initial sync 5 seconds after startup
    setTimeout(async () => {
      console.log(`[Cron] Running initial sync...`);
      for (const league of LEAGUES_TO_SYNC) {
        try {
          await syncLeagueSchedules(league);
        } catch (e) {
          console.error(`[Cron] Error on initial sync for ${league}:`, e);
        }
      }
    }, 5000);
  });
}

startServer();
