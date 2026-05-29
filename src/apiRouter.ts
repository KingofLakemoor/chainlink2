import express from 'express';
import { adminAuth, adminDb } from './lib/firebase-admin.js';
import { scrapeLeagueSchedules } from './services/scheduleProcessor.js';
import { gradeMatchups } from './services/grader.js';
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
      let title = '';
      if (amount === 150) {
        priceInCents = 525;
        title = '150 Links';
      } else if (amount === 350) {
        priceInCents = 1049;
        title = '350 Links';
      } else if (amount === 1050) {
        priceInCents = 2999;
        title = '1,050 Links';
      } else if (amount === 1800) {
        priceInCents = 4999;
        title = '1,800 Links';
      } else {
        return res.status(400).json({ success: false, error: 'Invalid links amount' });
      }

      priceData = {
        currency: 'usd',
        product_data: {
          name: title,
          description: `Purchase ${title} for use in the app`,
        },
        unit_amount: priceInCents,
      };
      metadata.amount = amount.toString();
    } else if (itemType === 'premium') {
      priceData = {
        currency: 'usd',
        product_data: {
          name: 'ChainLink Pro',
          description: 'Unlock Premium features',
        },
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

    res.json({ success: true, id: session.id });
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

    const uid = session.metadata?.uid || session.subscription_data?.metadata?.uid;
    const itemType = session.metadata?.itemType || session.subscription_data?.metadata?.itemType;

    if (uid && adminDb) {
      try {
        const userRef = adminDb.collection('users').doc(uid);

        await adminDb.runTransaction(async (transaction: any) => {
          const userDoc = await transaction.get(userRef);
          if (!userDoc.exists) return;

          const profile = userDoc.data()!;
          const updateData: any = { updatedAt: Date.now() };

          if (itemType === 'links') {
            const amountStr = session.metadata?.amount || session.subscription_data?.metadata?.amount;
            if (amountStr) {
               const amount = parseInt(amountStr, 10);
               updateData.coins = (profile.coins ?? profile.links ?? 0) + amount;
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
      const refundAmount = pickData.links ?? pickData.coins ?? 0;

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
    res.json({ success: true });
  } catch (e: any) {
    console.error("Grade matchup error:", e.message, e);
    res.status(500).json({ success: false, error: e.message });
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
    }

    res.json({ success: true, message: "Matchup synced successfully", matchup: matchupData });
  } catch (e: any) {
    console.error("External matchup sync error:", e);
    res.status(500).json({ error: e.message });
  }
});
