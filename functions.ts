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
          const tokenToUserId = new Map<string, string>();

          if (notifData.audience === 'GLOBAL') {
            // Fetch all users and filter in memory since array inequality filters are not fully supported
            const usersSnap = await adminDb.collection('users').get();
            usersSnap.docs.forEach((uDoc: any) => {
              const uData = uDoc.data();
              if (uData.notificationsEnabled !== false && uData.fcmTokens && Array.isArray(uData.fcmTokens) && uData.fcmTokens.length > 0) {
                tokens.push(...uData.fcmTokens);
                uData.fcmTokens.forEach((t: string) => tokenToUserId.set(t, uDoc.id));
              }
            });
          } else if (notifData.audience === 'USER' && notifData.targetUserId) {
            const userSnap = await adminDb.collection('users').doc(notifData.targetUserId).get();
            if (userSnap.exists) {
              const uData = userSnap.data()!;
              if (uData.notificationsEnabled !== false && uData.fcmTokens && Array.isArray(uData.fcmTokens)) {
                tokens = uData.fcmTokens;
                uData.fcmTokens.forEach((t: string) => tokenToUserId.set(t, userSnap.id));
              }
            }
          }

          if (tokens.length > 0) {
            // Chunk tokens into batches of 500 to avoid Firebase limit
            const chunkSize = 500;
            for (let i = 0; i < tokens.length; i += chunkSize) {
              const tokenChunk = tokens.slice(i, i + chunkSize);
              const message = {
                notification: {
                  title: notifData.title,
                  body: notifData.body,
                },
                webpush: {
                  fcmOptions: {
                    link: '/'
                  }
                },
                tokens: tokenChunk
              };

              try {
                const response = await getMessaging().sendEachForMulticast(message);
                console.log(`[Cron] Successfully sent message chunk to ${response.successCount} devices. Failed: ${response.failureCount}`);

                if (response.failureCount > 0) {
                  const tokensToRemoveByUserId = new Map<string, string[]>();
                  response.responses.forEach((resp: any, idx: number) => {
                    if (!resp.success) {
                      const errCode = resp.error?.code;
                      if (errCode === 'messaging/invalid-registration-token' ||
                          errCode === 'messaging/registration-token-not-registered' ||
                          errCode === 'messaging/invalid-argument') {
                        const token = tokenChunk[idx];
                        const userId = tokenToUserId.get(token);
                        if (userId) {
                          if (!tokensToRemoveByUserId.has(userId)) {
                            tokensToRemoveByUserId.set(userId, []);
                          }
                          tokensToRemoveByUserId.get(userId)!.push(token);
                        }
                      }
                    }
                  });

                  if (tokensToRemoveByUserId.size > 0) {
                    const { FieldValue } = await import("firebase-admin/firestore");
                    const cleanupBatch = adminDb.batch();
                    for (const [userId, staleTokens] of tokensToRemoveByUserId.entries()) {
                      const userRef = adminDb.collection('users').doc(userId);
                      cleanupBatch.update(userRef, {
                        fcmTokens: FieldValue.arrayRemove(...staleTokens)
                      });
                    }
                    await cleanupBatch.commit();
                    console.log(`[Cron] Cleaned up stale tokens for ${tokensToRemoveByUserId.size} users.`);
                  }
                }
              } catch (err) {
                console.error(`[Cron] Error sending multicast message chunk for notification ${doc.id}:`, err);
              }
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

  console.log(`[Cron] Starting purge of old notifications...`);
  try {
    const { adminDb } = await import("./src/lib/firebase-admin.js");
    if (adminDb) {
      const threeDaysAgo = Date.now() - (3 * 24 * 60 * 60 * 1000);
      let purgedCount = 0;
      while (true) {
        const oldNotifsSnap = await adminDb.collection('notifications')
          .where('createdAt', '<', threeDaysAgo)
          .limit(500)
          .get();

        if (oldNotifsSnap.empty) {
          break;
        }

        const batch = adminDb.batch();
        oldNotifsSnap.docs.forEach((doc: any) => {
          batch.delete(doc.ref);
        });
        await batch.commit();
        purgedCount += oldNotifsSnap.size;
      }
      console.log(`[Cron] Purged ${purgedCount} old notifications.`);
    }
  } catch (e) {
    console.error(`[Cron] Error purging old notifications:`, e);
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

export const monthlyRollover = onSchedule({ schedule: "0 9 1 * *", timeoutSeconds: 540 }, async (event) => {
  console.log(`[Cron] Starting monthly rollover...`);
  try {
    const { adminDb } = await import("./src/lib/firebase-admin.js");
    if (adminDb) {
      // Logic from API endpoint adapted for Cron
      const usersSnap = await adminDb.collection('users').get();
      const chainsSnap = await adminDb.collection('chains').get();

      const chainsMap = new Map();
      chainsSnap.docs.forEach((doc: any) => {
        chainsMap.set(doc.data().userId, { id: doc.id, ...doc.data() });
      });

      const currentMonthStats = usersSnap.docs.map((doc: any) => {
        const data = doc.data();
        const chainData = chainsMap.get(doc.id) || { chain: 0, best: 0 };
        const wins = data.stats?.wins || 0;
        const losses = data.stats?.losses || 0;
        const pushes = data.stats?.pushes || 0;
        const total = wins + losses;
        const winRate = total > 0 ? (wins / total) * 100 : 0;
        return {
          id: doc.id,
          username: data.username || data.name || 'A user',
          wins,
          losses,
          pushes,
          winRate,
          totalDecisions: total,
          currentChain: chainData.chain || 0,
          bestChain: chainData.best || 0,
          chainDocId: chainData.id,
          userData: data,
        };
      });

      // 1. Calculate winners
      const topCurrentChain = [...currentMonthStats].sort((a, b) => b.currentChain - a.currentChain)[0];
      const topWins = [...currentMonthStats].sort((a, b) => b.wins - a.wins)[0];
      const topBestChain = [...currentMonthStats].sort((a, b) => b.bestChain - a.bestChain)[0];
      const eligibleForWinRate = currentMonthStats.filter(p => p.totalDecisions >= 10);
      const topWinRate = eligibleForWinRate.length > 0 ? [...eligibleForWinRate].sort((a, b) => {
        if (b.winRate !== a.winRate) return b.winRate - a.winRate;
        return b.wins - a.wins;
      })[0] : null;

      const lines = [];
      if (topCurrentChain) lines.push(`🔥 Longest Active Chain: ${topCurrentChain.username} (${topCurrentChain.currentChain < 0 ? 'L' + Math.abs(topCurrentChain.currentChain) : 'W' + topCurrentChain.currentChain})`);
      if (topBestChain) lines.push(`🏆 Best Monthly Chain: ${topBestChain.username} (W${topBestChain.bestChain})`);
      if (topWins) lines.push(`🥇 Most Wins: ${topWins.username} (${topWins.wins} Wins)`);
      if (topWinRate) lines.push(`🎯 Best Win %: ${topWinRate.username} (${topWinRate.winRate.toFixed(1)}%)`);

      const notifBody = lines.length > 0 ? lines.join('\n') : 'No stats for this month.';

      const globalNotifRef = adminDb.collection('notifications').doc();
      await globalNotifRef.set({
        title: 'Monthly Winners! 🏅',
        body: `The month has concluded! Here are the winners:\n\n${notifBody}`,
        audience: 'GLOBAL',
        status: 'PENDING',
        scheduledTime: Date.now(),
        createdAt: Date.now()
      });

      // 2. Archiving and Resetting
      const date = new Date();
      date.setMonth(date.getMonth() - 1);
      const monthKey = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
      const monthLabel = date.toLocaleString('default', { month: 'long', year: 'numeric' });

      let batch = adminDb.batch();
      let count = 0;

      for (const user of currentMonthStats) {
        const userRef = adminDb.collection('users').doc(user.id);

        let allTimeStats = user.userData.allTimeStats;
        if (!allTimeStats) {
          allTimeStats = { wins: user.wins, losses: user.losses, pushes: user.pushes };
        }

        let historicalStats = user.userData.historicalStats || {};
        historicalStats[monthKey] = {
          monthKey,
          monthLabel,
          wins: user.wins,
          losses: user.losses,
          pushes: user.pushes,
          longestWinChain: user.bestChain,
          longestLossChain: 0,
        };

        batch.update(userRef, {
          allTimeStats,
          historicalStats,
          stats: { wins: 0, losses: 0, pushes: 0 }
        });
        count++;

        if (user.chainDocId) {
          const chainRef = adminDb.collection('chains').doc(user.chainDocId);
          let allTimeBest = user.userData.allTimeBest || user.bestChain || 0;

          batch.update(chainRef, {
            chain: 0,
            best: 0,
            wins: 0,
            losses: 0,
            allTimeBest
          });
          count++;
        }

        if (count >= 400) {
          await batch.commit();
          batch = adminDb.batch();
          count = 0;
        }
      }

      if (count > 0) {
        await batch.commit();
      }

      console.log(`[Cron] Monthly rollover complete.`);
    }
  } catch (error: any) {
    console.error(`[Cron] Monthly rollover error:`, error);
  }
});
