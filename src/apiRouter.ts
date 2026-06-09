import express from 'express';
import { adminAuth, adminDb } from './lib/firebase-admin.js';
import { scrapeLeagueSchedules } from './services/scheduleProcessor.js';
import { gradeMatchups } from './services/grader.js';
import { gradeLink4Matchups } from './services/link4Grader.js';
import Stripe from 'stripe';

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY || 'sk_test_mock', {
  apiVersion: '2025-02-24.acacia' as any, // Cast to any to bypass TS error for newer stripe versions
});

export const apiRouter = express.Router();

const validateAdmin = async (req: express.Request, res: express.Response, next: express.NextFunction) => {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({ success: false, error: 'Unauthorized' });
    }

    const idToken = authHeader.split('Bearer ')[1];
    if (!adminAuth || !adminDb) return res.status(500).json({ success: false, error: "admin tools not initialized" });

    const decodedToken = await adminAuth.verifyIdToken(idToken);
    const uid = decodedToken.uid;

    const userDoc = await adminDb.collection('users').doc(uid).get();
    if (!userDoc.exists || userDoc.data()?.role !== 'ADMIN') {
      return res.status(403).json({ success: false, error: 'Forbidden: Admin access required' });
    }

    (req as any).uid = uid;
    next();
  } catch (e: any) {
    console.error("Admin validation error:", e.message);
    res.status(401).json({ success: false, error: 'Unauthorized' });
  }
};

apiRouter.post('/stripe/create-checkout-session', async (req, res) => {
  try {
    const { itemType, amount } = req.body;
    const authHeader = req.headers.authorization;

    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({ success: false, error: 'Unauthorized' });
    }

    const idToken = authHeader.split('Bearer ')[1];
    if (!adminAuth || !adminDb) return res.status(500).json({ success: false, error: "admin tools not initialized" });

    const decodedToken = await adminAuth.verifyIdToken(idToken);
    const uid = decodedToken.uid;

    let priceData: any | undefined;
    let metadata: Record<string, string> = { uid, itemType };

    let mode: 'payment' | 'subscription' = 'payment';

    if (itemType === 'links') {
      let priceInCents = 0;
      let productId = '';
      if (amount === 150) {
        priceInCents = 525;
        productId = 'prod_UbeZGEJ7qNYzqh';
      } else if (amount === 350) {
        priceInCents = 1049;
        productId = 'prod_UbeanXV0kHAOmx';
      } else if (amount === 1050) {
        priceInCents = 2999;
        productId = 'prod_UbeaOKAeLRoMYA';
      } else if (amount === 1800) {
        priceInCents = 4999;
        productId = 'prod_UbeaHkQfsij3Je';
      } else {
        return res.status(400).json({ success: false, error: 'Invalid links amount' });
      }

      priceData = {
        currency: 'usd',
        product: productId,
        unit_amount: priceInCents,
      };
      metadata.amount = amount.toString();
    } else if (itemType === 'premium') {
      priceData = {
        currency: 'usd',
        product: 'prod_Ubebt3HfTCfFfc',
        unit_amount: 1049,
        recurring: {
          interval: 'month',
        },
      };
      mode = 'subscription';
    } else {
      return res.status(400).json({ success: false, error: 'Invalid item type' });
    }

    const sessionData: Stripe.Checkout.SessionCreateParams = {
      payment_method_types: ['card'],
      line_items: [
        {
          price_data: priceData,
          quantity: 1,
        },
      ],
      mode,
      success_url: `${req.headers.origin}/shop?success=true`,
      cancel_url: `${req.headers.origin}/shop?canceled=true`,
    };

    if (mode === 'subscription') {
      sessionData.subscription_data = { metadata };
      sessionData.metadata = metadata;
    } else {
      sessionData.metadata = metadata;
    }

    const session = await stripe.checkout.sessions.create(sessionData);

    res.json({ success: true, id: session.id, url: session.url });
  } catch (e: any) {
    console.error("Create checkout session error:", e.message, e);
    res.status(500).json({ success: false, error: e.message });
  }
});

apiRouter.post('/stripe/webhook', express.raw({type: 'application/json'}), async (req, res) => {
  const sig = req.headers['stripe-signature'];
  const endpointSecret = process.env.STRIPE_WEBHOOK_SECRET;

  let event;

  try {
    if (!sig || !endpointSecret) {
      throw new Error('Missing stripe signature or endpoint secret');
    }

    // Express must use express.raw to get raw body
    event = stripe.webhooks.constructEvent(req.body, sig, endpointSecret);
  } catch (err: any) {
    console.error('Webhook signature verification failed:', err.message);
    return res.status(400).send(`Webhook Error: ${err.message}`);
  }

  if (event.type === 'checkout.session.completed') {
    const session = event.data.object as Stripe.Checkout.Session;

    let uid = session.metadata?.uid;
    let itemType = session.metadata?.itemType;
    let amountStr = session.metadata?.amount;

    if (!uid && session.subscription) {
       try {
         const subscription = await stripe.subscriptions.retrieve(session.subscription as string);
         uid = subscription.metadata?.uid;
         itemType = subscription.metadata?.itemType;
         amountStr = subscription.metadata?.amount;
       } catch (e) {
         console.error("Failed to retrieve subscription metadata:", e);
       }
    }

    if (uid && adminDb) {
      try {
        const userRef = adminDb.collection('users').doc(uid);

        await adminDb.runTransaction(async (transaction: any) => {
          const userDoc = await transaction.get(userRef);
          if (!userDoc.exists) return;

          const profile = userDoc.data()!;
          const updateData: any = { updatedAt: Date.now() };

          if (itemType === 'links') {
            if (amountStr) {
               const amount = parseInt(amountStr, 10);
               updateData.links = (profile.links || 0) + amount;
            }
          } else if (itemType === 'premium') {
             updateData.premium = true;
          }

          transaction.update(userRef, updateData);
        });
        console.log(`Successfully processed payment for user ${uid}`);
      } catch (e: any) {
         console.error(`Error updating user ${uid} after payment:`, e.message);
      }
    }
  }

  res.send();
});


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

      const pickRef = adminDb.collection('link4Picks').doc(`${segmentId}_${uid}`);
      const pickDoc = await transaction.get(pickRef);
      if (pickDoc.exists) {
        throw new Error("You have already submitted picks for this segment.");
      }

      transaction.update(userRef, { links: currentLinks - 10 });

      transaction.set(pickRef, {
        segmentId,
        userId: uid,
        username: username || 'Anonymous',
        avatarUrl: avatarUrl || `https://api.dicebear.com/7.x/avataaars/svg?seed=${uid}`,
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

apiRouter.post("/picks/cancel-pick", async (req, res) => {
  try {
    const { matchupId } = req.body;
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

      const matchupRef = adminDb.collection('matchups').doc(matchupId);
      const matchupDoc = await transaction.get(matchupRef);
      if (!matchupDoc.exists) throw new Error("Matchup not found");

      const matchup = matchupDoc.data()!;
      const isCancelablePGA = matchup.league === 'PGA' && matchup.status === 'STATUS_IN_PROGRESS' && (matchup.statusDesc === 'In Progress' || matchup.statusDesc === 'Delayed');

      if (!matchup.active && !isCancelablePGA) throw new Error("Matchup is locked");
      if (matchup.status !== 'STATUS_SCHEDULED' && matchup.status !== 'STATUS_POSTPONED' && !isCancelablePGA) {
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
      const refundAmount = pickData.links ?? 0;

      transaction.delete(pickRef);

      const updateData: any = { updatedAt: Date.now() };
      if (refundAmount > 0) {
        updateData.links = profile.links + refundAmount;
      }
      transaction.update(userRef, updateData);
    });

    res.json({ success: true });
  } catch (e: any) {
    console.error("Cancel pick error:", e.message, e);
    res.status(500).json({ success: false, error: e.message });
  }
});

apiRouter.post("/picks/make-pick", async (req, res) => {
  try {
    const { matchupId, team } = req.body;
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

      const matchupRef = adminDb.collection('matchups').doc(matchupId);
      const matchupDoc = await transaction.get(matchupRef);
      if (!matchupDoc.exists) throw new Error("Matchup not found");

      const matchup = matchupDoc.data()!;
      if (!matchup.active) throw new Error("Matchup is locked");
      if (matchup.status !== 'STATUS_SCHEDULED' && matchup.status !== 'STATUS_POSTPONED') {
        throw new Error("Matchup has already started");
      }

      const profile = userDoc.data()!;
      const matchCost = matchup.cost ?? 0;
      if (matchCost > 0 && profile.links < matchCost) {
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
        links: matchCost,
        active: true,
        createdAt: Date.now(),
        updatedAt: Date.now()
      });

      const updateData: any = { updatedAt: Date.now() };
      if (matchCost > 0) {
        updateData.links = profile.links - matchCost;
      }
      transaction.update(userRef, updateData);
    });

    res.json({ success: true });
  } catch (e: any) {
    console.error("Make pick error:", e.message, e);
    res.status(500).json({ success: false, error: e.message });
  }
});


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
              body: `You won the Link4 Segment! ${payoutAmount} links have been added to your account.`,
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

apiRouter.post("/admin/sync-schedules", validateAdmin, async (req, res) => {
  try {
    const { league } = req.body;
    const result = await scrapeLeagueSchedules(league);
    res.json({ success: true, result });
  } catch (e: any) {
    console.error(e);
    res.status(500).json({ success: false, error: e.message });
  }
});

apiRouter.post("/shop/buy", async (req, res) => {
  try {
    const { itemId } = req.body;
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

      const itemRef = adminDb.collection('shopItems').doc(itemId);
      const itemDoc = await transaction.get(itemRef);
      if (!itemDoc.exists) throw new Error("Item not found");

      const item = itemDoc.data()!;
      if (!item.active) throw new Error("Item is no longer available");

      const profile = userDoc.data()!;
      const cost = item.cost ?? 0;

      if (item.premiumOnly && !profile.premium) {
        throw new Error("This item requires ChainLink Pro.");
      }

      if (profile.links < cost) {
        throw new Error("Not enough links!");
      }

      const inventory = profile.inventory || [];
      if (inventory.includes(itemId)) {
        throw new Error("You already own this item!");
      }

      const updateData: any = {
        updatedAt: Date.now(),
        links: profile.links - cost,
        inventory: [...inventory, itemId],
        purchasedItems: [...(profile.purchasedItems || []), itemId]
      };

      transaction.update(userRef, updateData);
    });

    res.json({ success: true });
  } catch (e: any) {
    console.error("Buy item error:", e.message, e);
    res.status(500).json({ success: false, error: e.message });
  }
});

apiRouter.post("/shop/buy-merch", async (req, res) => {
  try {
    const { itemId, shippingInfo } = req.body;
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

      const itemRef = adminDb.collection('shopItems').doc(itemId);
      const itemDoc = await transaction.get(itemRef);
      if (!itemDoc.exists) throw new Error("Item not found");

      const item = itemDoc.data()!;
      if (!item.active) throw new Error("Item is no longer available");
      if (item.type !== 'MERCH') throw new Error("Item is not a merch item");

      const profile = userDoc.data()!;
      const cost = item.cost ?? 0;

      if (item.premiumOnly && !profile.premium) {
        throw new Error("This item requires ChainLink Pro.");
      }

      if (profile.links < cost) {
        throw new Error("Not enough links!");
      }

      // We don't add merch to inventory like cosmetics, we create an order
      const updateData: any = {
        updatedAt: Date.now(),
        links: profile.links - cost,
      };

      transaction.update(userRef, updateData);

      const ordersRef = adminDb.collection('orders').doc();
      transaction.set(ordersRef, {
        userId: uid,
        userEmail: profile.email || decodedToken.email || '',
        itemId: itemId,
        itemName: item.name,
        shippingInfo: shippingInfo,
        status: 'PENDING',
        createdAt: Date.now(),
        updatedAt: Date.now()
      });

      const notificationsRef = adminDb.collection('notifications').doc();
      transaction.set(notificationsRef, {
        title: 'New Merch Order',
        body: `User ${profile.username || uid} ordered ${item.name}.`,
        audience: 'ADMIN',
        status: 'PENDING',
        scheduledTime: Date.now(),
        createdAt: Date.now()
      });
    });

    res.json({ success: true });
  } catch (e: any) {
    console.error("Buy merch error:", e.message, e);
    res.status(500).json({ success: false, error: e.message });
  }
});

apiRouter.post("/user/equip" , async (req, res) => {
  try {
    const { itemId, type } = req.body; // type is e.g. 'PROFILE_BANNER', 'AVATAR_RING', 'TITLE'
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
      const inventory = profile.inventory || [];

      // If itemId is null, it means unequip
      if (itemId !== null && !inventory.includes(itemId)) {
        throw new Error("You do not own this item!");
      }

      const equippedCosmetics = profile.equippedCosmetics || {};

      const updateData: any = {
        updatedAt: Date.now(),
        equippedCosmetics: { ...equippedCosmetics, [type]: itemId }
      };

      transaction.update(userRef, updateData);
    });

    res.json({ success: true });
  } catch (e: any) {
    console.error("Equip item error:", e.message, e);
    res.status(500).json({ success: false, error: e.message });
  }
});

apiRouter.post("/admin/grade-matchup", validateAdmin, async (req, res) => {
  try {
    const { gameId } = req.body;
    if (!adminDb) return res.status(500).json({ success: false, error: "adminDb not initialized" });

    const snap = await adminDb.collection('matchups').where('gameId', '==', gameId).get();
    if (snap.empty) {
       return res.status(404).json({ success: false, error: "Matchup not found" });
    }

    const matchup = snap.docs[0].data();
    await gradeMatchups([{ ...matchup, status: 'STATUS_FINAL' }]); // Force grade
    await gradeLink4Matchups([{ ...matchup, status: 'STATUS_FINAL' }]);
    res.json({ success: true });
  } catch (e: any) {
    console.error("Grade matchup error:", e.message, e);
    res.status(500).json({ success: false, error: e.message });
  }
});

apiRouter.get("/external/check-premium", async (req, res) => {
  if (!adminDb) return res.status(500).json({ success: false, error: "adminDb not configured" });
  try {
    const providedApiKey = req.headers['x-api-key'];
    if (!providedApiKey || providedApiKey !== process.env.SCRIPTLESS_API_KEY) {
      return res.status(401).json({ success: false, error: "Unauthorized: Invalid or missing API key" });
    }

    const { email } = req.query;
    if (!email || typeof email !== 'string') {
      return res.status(400).json({ success: false, error: "Missing or invalid email parameter" });
    }

    const snap = await adminDb.collection('users').where('email', '==', email).limit(1).get();

    if (snap.empty) {
      return res.json({ success: true, isPremium: false });
    }

    const userDoc = snap.docs[0].data();
    return res.json({ success: true, isPremium: !!userDoc.premium });
  } catch (e: any) {
    console.error("External check-premium error:", e);
    return res.status(500).json({ success: false, error: e.message });
  }
});

apiRouter.post("/admin/matchups/external", async (req, res) => {
  if (!adminDb) return res.status(500).json({ error: "adminDb not configured" });
  try {
    const { gameId, title, league, startTime, homeTeam, awayTeam, status, active } = req.body;

    if (!gameId || !league || !homeTeam || !awayTeam) {
       return res.status(400).json({ error: "Missing required fields" });
    }

    const matchupRef = adminDb.collection('matchups').doc(gameId);
    const existingDoc = await matchupRef.get();
    const existingData = existingDoc.exists ? existingDoc.data() : null;

    let finalStartTime = startTime || Date.now();
    if (league === 'PUTTING' && !existingDoc.exists) {
      finalStartTime = Date.now() + 15 * 60 * 1000;
    } else if (league === 'PUTTING' && existingDoc.exists) {
      finalStartTime = existingData?.startTime || finalStartTime;
    }

    const isLocked = Date.now() >= finalStartTime;

    const matchupData: any = {
      gameId,
      title: title || `${awayTeam.name} @ ${homeTeam.name}`,
      league,
      startTime: finalStartTime,
      homeTeam: {
        id: homeTeam.id,
        name: homeTeam.name,
        image: homeTeam.image || "/icons/icon-256x256.png",
        score: homeTeam.score || 0
      },
      awayTeam: {
        id: awayTeam.id,
        name: awayTeam.name,
        image: awayTeam.image || "/icons/icon-256x256.png",
        score: awayTeam.score || 0
      },
      status: status || 'STATUS_SCHEDULED',
      active: (league === 'DARTS' || league === 'PUTTING') ? !isLocked : (active !== undefined ? active : true),
      type: "SCORE",
      updatedAt: Date.now()
    };

    if (!existingDoc.exists) {
      matchupData.createdAt = Date.now();
    }

    await matchupRef.set(matchupData, { merge: true });

    if (matchupData.status === 'STATUS_FINAL' || matchupData.status === 'STATUS_POSTPONED') {
      await gradeMatchups([matchupData]);
      await gradeLink4Matchups([matchupData]);
    }

    res.json({ success: true, message: "Matchup synced successfully", matchup: matchupData });
  } catch (e: any) {
    console.error("External matchup sync error:", e);
    res.status(500).json({ error: e.message });
  }
});
apiRouter.post("/admin/monthly-rollover", validateAdmin, async (req, res) => {
  try {
    const usersSnap = await adminDb!.collection('users').get();
    const chainsSnap = await adminDb!.collection('chains').get();

    const chainsMap = new Map();
    chainsSnap.docs.forEach(doc => {
      chainsMap.set(doc.data().userId, { id: doc.id, ...doc.data() });
    });

    const currentMonthStats = usersSnap.docs.map(doc => {
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
        chainData: chainData,
      };
    });

    // 1. Calculate winners
    // Current longest Chain
    const topCurrentChain = [...currentMonthStats].sort((a, b) => b.currentChain - a.currentChain)[0];
    // Most Wins
    const topWins = [...currentMonthStats].sort((a, b) => b.wins - a.wins)[0];
    // Longest Chain for the month
    const topBestChain = [...currentMonthStats].sort((a, b) => b.bestChain - a.bestChain)[0];
    // Best win % (minimum 10 picks)
    const eligibleForWinRate = currentMonthStats.filter(p => p.totalDecisions >= 10);
    const topWinRate = eligibleForWinRate.length > 0 ? [...eligibleForWinRate].sort((a, b) => {
      if (b.winRate !== a.winRate) return b.winRate - a.winRate;
      return b.wins - a.wins;
    })[0] : null;

    // Build the global notification body
    const lines = [];
    if (topCurrentChain) lines.push(`🔥 Longest Active Chain: ${topCurrentChain.username} (${topCurrentChain.currentChain < 0 ? 'L' + Math.abs(topCurrentChain.currentChain) : 'W' + topCurrentChain.currentChain})`);
    if (topBestChain) lines.push(`🏆 Best Monthly Chain: ${topBestChain.username} (W${topBestChain.bestChain})`);
    if (topWins) lines.push(`🥇 Most Wins: ${topWins.username} (${topWins.wins} Wins)`);
    if (topWinRate) lines.push(`🎯 Best Win %: ${topWinRate.username} (${topWinRate.winRate.toFixed(1)}%)`);

    const notifBody = lines.length > 0 ? lines.join('\n') : 'No stats for this month.';

    const globalNotifRef = adminDb!.collection('notifications').doc();
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
    // Use last month's key for the archive
    date.setMonth(date.getMonth() - 1);
    const monthKey = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
    const monthLabel = date.toLocaleString('default', { month: 'long', year: 'numeric' });

    let batch = adminDb!.batch();
    let count = 0;

    for (const user of currentMonthStats) {
      const userRef = adminDb!.collection('users').doc(user.id);

      // Initialize allTimeStats if missing so we don't lose anything
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
        longestLossChain: 0, // We aren't fully tracking best monthly loss chain in chain collection yet
      };

      batch.update(userRef, {
        allTimeStats,
        historicalStats,
        stats: { wins: 0, losses: 0, pushes: 0 }
      });
      count++;

      if (user.chainDocId) {
        const chainRef = adminDb!.collection('chains').doc(user.chainDocId);
        // Note: We carry over the current chain? Wait! The user requested:
        // "When a month ends, a user current chain resets to 0"

        let allTimeBest = Math.max(user.chainData.allTimeBest || 0, user.userData.allTimeBest || 0, user.bestChain || 0); // The new grader tracks it in chain collection, but let's be safe

        batch.update(chainRef, {
          chain: 0,
          best: 0,
          wins: 0,
          losses: 0,
          allTimeBest
        });
        count++;
      }

      // Firestore batches have a limit of 500 writes
      if (count >= 400) {
        await batch.commit();
        batch = adminDb!.batch();
        count = 0;
      }
    }

    if (count > 0) {
      await batch.commit();
    }

    res.json({ success: true, message: 'Monthly rollover completed successfully.' });
  } catch (error: any) {
    console.error("Monthly rollover error:", error);
    res.status(500).json({ success: false, error: error.message });
  }
});
