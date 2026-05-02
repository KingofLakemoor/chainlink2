import 'dotenv/config';
import express from "express";
import path from "path";
import { initializeApp, cert } from 'firebase-admin/app';
import { apiRouter } from './src/apiRouter.js';

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

  app.use('/api', apiRouter);

  // Catch-all 404 handler specifically for /api routes to prevent Vite fallback
  app.use('/api', (req, res) => {
    res.status(404).json({ success: false, error: 'Not Found' });
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
