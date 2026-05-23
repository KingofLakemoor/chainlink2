import { onSchedule } from "firebase-functions/v2/scheduler";
import { onRequest, HttpsOptions } from "firebase-functions/v2/https";
import { syncLeagueSchedules } from "./src/services/scheduleProcessor.js";
import "./src/lib/firebase-admin.js"; // Ensure Firebase is initialized
import express from 'express';
import cors from 'cors';
import { apiRouter } from './src/apiRouter.js';

const LEAGUES_TO_SYNC = ["NBA", "NHL", "MLB", "PGA", "WNBA", "NFL", "WBB", "MBB", "MLS", "EPL", "NWSL", "CFB", "CBASE", "FIFA", "FRA", "TUR", "RPL", "CHN", "ATP", "WTA"];

export const frequentSync = onSchedule({ schedule: "every 2 minutes", timeoutSeconds: 300 }, async (event) => {
  console.log(`[Cron] Starting frequent (scoreboard-only) sync cycle...`);
  for (const league of LEAGUES_TO_SYNC) {
    try {
      await syncLeagueSchedules(league, true);
    } catch (e) {
      console.error(`[Cron] Error syncing ${league}:`, e);
    }
  }

  // Safety Background Loop: Find stuck picks and grade them
  console.log(`[Cron] Running safety check for stuck pending picks...`);
  try {
    const { adminDb } = await import("./src/lib/firebase-admin.js");
    const { gradeMatchups } = await import("./src/services/grader.js");
    if (adminDb) {
      // Limit the query to prevent massive memory usage and read operations
      const stuckPicksSnap = await adminDb.collection('picks')
        .where('status', '==', 'PENDING')
        .limit(100)
        .get();
      if (!stuckPicksSnap.empty) {
        const matchupIds = new Set<string>();
        stuckPicksSnap.docs.forEach((doc: any) => matchupIds.add(doc.data().matchupId));

        if (matchupIds.size > 0) {
          // Batch query to find any matchups that are finalized/postponed
          const matchupsToGrade = [];
          for (const mId of Array.from(matchupIds)) {
            const mSnap = await adminDb.collection('matchups').doc(mId).get();
            if (mSnap.exists) {
              const mData = mSnap.data()!;
              if (mData.status === 'STATUS_FINAL' || mData.status === 'STATUS_POSTPONED') {
                matchupsToGrade.push({ ...mData, gameId: mId });
              }
            }
          }
          if (matchupsToGrade.length > 0) {
            console.log(`[Cron] Safety loop found ${matchupsToGrade.length} stuck completed matchups. Triggering grader.`);
            await gradeMatchups(matchupsToGrade);
          }
        }
      }
    }
  } catch (e) {
    console.error(`[Cron] Error in safety loop:`, e);
  }

  // Process notifications bundle
  console.log(`[Cron] Processing pending notifications...`);
  try {
    const { adminDb, adminAuth } = await import("./src/lib/firebase-admin.js");
    const { getMessaging } = await import("firebase-admin/messaging");
    if (adminDb) {
      const pendingNotifsSnap = await adminDb.collection('notifications')
        .where('status', '==', 'PENDING')
        .where('scheduledTime', '<=', Date.now())
        .get();

      if (!pendingNotifsSnap.empty) {
        console.log(`[Cron] Found ${pendingNotifsSnap.size} pending notifications to send.`);
        const batch = adminDb.batch();

        for (const doc of pendingNotifsSnap.docs) {
          const notifData = doc.data();
          let tokens: string[] = [];

          if (notifData.audience === 'GLOBAL') {
            // Fetch all users with fcmTokens
            const usersSnap = await adminDb.collection('users').where('fcmTokens', '!=', []).get();
            usersSnap.docs.forEach((uDoc: any) => {
              const uData = uDoc.data();
              if (uData.notificationsEnabled !== false && uData.fcmTokens && Array.isArray(uData.fcmTokens)) {
                tokens.push(...uData.fcmTokens);
              }
            });
          } else if (notifData.audience === 'USER' && notifData.targetUserId) {
            const userSnap = await adminDb.collection('users').doc(notifData.targetUserId).get();
            if (userSnap.exists) {
              const uData = userSnap.data()!;
              if (uData.notificationsEnabled !== false && uData.fcmTokens && Array.isArray(uData.fcmTokens)) {
                tokens = uData.fcmTokens;
              }
            }
          }

          if (tokens.length > 0) {
            const message = {
              notification: {
                title: notifData.title,
                body: notifData.body,
              },
              tokens: tokens
            };

            try {
              const response = await getMessaging().sendEachForMulticast(message);
              console.log(`[Cron] Successfully sent message to ${response.successCount} devices. Failed: ${response.failureCount}`);

              if (response.failureCount > 0) {
                const failedTokens: string[] = [];
                response.responses.forEach((resp: any, idx: number) => {
                  if (!resp.success) {
                    failedTokens.push(tokens[idx]);
                  }
                });
                // In a robust implementation, you might want to remove these failed tokens from the users.
              }
            } catch (err) {
              console.error(`[Cron] Error sending multicast message for notification ${doc.id}:`, err);
            }
          }

          batch.update(doc.ref, { status: 'SENT', sentAt: Date.now() });
        }

        await batch.commit();
        console.log(`[Cron] Notifications processing complete.`);
      }
    }
  } catch (e) {
    console.error(`[Cron] Error processing notifications:`, e);
  }

  console.log(`[Cron] Frequent sync cycle complete.`);
});

export const nightlySync = onSchedule({ schedule: "0 9 * * *", timeoutSeconds: 300 }, async (event) => {
  console.log(`[Cron] Starting nightly full scheduled sync cycle (2 AM Arizona time)...`);
  for (const league of LEAGUES_TO_SYNC) {
    try {
      await syncLeagueSchedules(league, false);
    } catch (e) {
      console.error(`[Cron] Error on nightly sync for ${league}:`, e);
    }
  }

  console.log(`[Cron] Starting purge of abandoned matchups...`);
  try {
    const { adminDb } = await import("./src/lib/firebase-admin.js");
    if (adminDb) {
      let purgedCount = 0;
      while (true) {
        const abandonedSnap = await adminDb.collection('matchups')
          .where('abandoned', '==', true)
          .limit(500)
          .get();

        if (abandonedSnap.empty) {
          // If no explicitly abandoned matchups left, search for old final/postponed/canceled ones
          const twoDaysAgo = Date.now() - 48 * 60 * 60 * 1000;
          const oldMatchupsSnap = await adminDb.collection('matchups')
            .where('status', 'in', ['STATUS_FINAL', 'STATUS_POSTPONED', 'STATUS_CANCELED'])
            .where('startTime', '<', twoDaysAgo)
            .limit(100)
            .get();

          if (oldMatchupsSnap.empty) {
            break;
          }

          const batch = adminDb.batch();
          for (const doc of oldMatchupsSnap.docs) {
            const picksSnap = await adminDb.collection('picks').where('matchupId', '==', doc.id).limit(1).get();
            if (picksSnap.empty) {
               batch.delete(doc.ref);
            } else {
               // Set abandoned = true so we don't query it again with startTime
               batch.update(doc.ref, { abandoned: true });
            }
          }
          await batch.commit();
          purgedCount += oldMatchupsSnap.size;
          continue;
        }

        if (abandonedSnap.empty) {
          break;
        }

        const batch = adminDb.batch();
        abandonedSnap.docs.forEach((doc: any) => {
          batch.delete(doc.ref);
        });
        await batch.commit();
        purgedCount += abandonedSnap.size;
      }
      console.log(`[Cron] Purged ${purgedCount} abandoned matchups.`);
    }
  } catch (e) {
    console.error(`[Cron] Error purging abandoned matchups:`, e);
  }

  console.log(`[Cron] Nightly scheduled sync cycle complete.`);
});

export const dailyPickReminder = onSchedule({ schedule: "0 9 * * *", timeZone: "America/Chicago", timeoutSeconds: 60 }, async (event) => {
  console.log(`[Cron] Starting daily pick reminder...`);
  try {
    const { adminDb } = await import("./src/lib/firebase-admin.js");
    if (adminDb) {
      await adminDb.collection('notifications').add({
        title: "New Day, New Chain",
        body: "Time to make a pick",
        audience: "GLOBAL",
        status: "PENDING",
        scheduledTime: Date.now(),
        createdAt: Date.now(),
      });
      console.log(`[Cron] Successfully queued daily pick reminder notification.`);
    }
  } catch (e) {
    console.error(`[Cron] Error queuing daily pick reminder:`, e);
  }
});

export const monthlyShopRefresh = onSchedule({ schedule: "0 0 1 * *", timeoutSeconds: 300 }, async (event) => {
  console.log(`[Cron] Starting monthly shop refresh cycle...`);
  try {
    const { adminDb } = await import("./src/lib/firebase-admin.js");
    if (adminDb) {
      const shopItemsSnap = await adminDb.collection('shopItems').where('forSale', '==', true).get();
      const itemsByType = {
        'PROFILE_BANNER': [] as any[],
        'AVATAR_RING': [] as any[],
        'TITLE': [] as any[]
      };

      shopItemsSnap.docs.forEach((doc: any) => {
        const data = doc.data();
        if (data.type && itemsByType[data.type as keyof typeof itemsByType]) {
          itemsByType[data.type as keyof typeof itemsByType].push({ id: doc.id, ...data });
        }
      });

      const selectedIds = new Set<string>();

      for (const type of Object.keys(itemsByType)) {
        const items = itemsByType[type as keyof typeof itemsByType];
        // Shuffle the items
        for (let i = items.length - 1; i > 0; i--) {
          const j = Math.floor(Math.random() * (i + 1));
          [items[i], items[j]] = [items[j], items[i]];
        }
        // Take up to 3
        const selected = items.slice(0, 3);
        selected.forEach(item => selectedIds.add(item.id));
      }

      let batch = adminDb.batch();
      let opCount = 0;
      let totalUpdated = 0;

      for (const doc of shopItemsSnap.docs) {
        const data = doc.data();
        if (data.type === 'PROFILE_BANNER' || data.type === 'AVATAR_RING' || data.type === 'TITLE') {
          const shouldBeActive = selectedIds.has(doc.id);
          if (data.active !== shouldBeActive) {
            batch.update(doc.ref, { active: shouldBeActive, updatedAt: Date.now() });
            opCount++;
            totalUpdated++;

            if (opCount >= 500) {
              await batch.commit();
              batch = adminDb.batch();
              opCount = 0;
            }
          }
        }
      }

      if (opCount > 0) {
        await batch.commit();
      }

      console.log(`[Cron] Monthly shop refresh complete. Updated ${totalUpdated} items.`);
    }
  } catch (e) {
    console.error(`[Cron] Error in monthly shop refresh:`, e);
  }
});

const app = express();
app.use(cors({ origin: true }));

// We need the raw body for the webhook endpoint to verify the Stripe signature
app.use('/api/stripe/webhook', express.raw({ type: 'application/json' }));
app.use('/stripe/webhook', express.raw({ type: 'application/json' })); // Also handle stripped prefix

app.use(express.json());

// Mount the API router to both /api and / to handle Firebase Hosting rewrite stripping behavior
app.use('/api', apiRouter);
app.use(apiRouter);

// Catch-all 404 handler for unmatched API routes
app.use((req, res) => {
  res.status(404).json({ success: false, error: 'Not Found' });
});

export const api = onRequest({ invoker: "public" }, app as any);
