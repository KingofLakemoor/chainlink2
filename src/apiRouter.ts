import express from 'express';
import { adminAuth, adminDb } from './lib/firebase-admin.js';
import { scrapeLeagueSchedules } from './services/scheduleProcessor.js';
import { gradeMatchups } from './services/grader.js';
import Stripe from 'stripe';

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY || 'sk_test_mock', {
  apiVersion: '2025-02-24.acacia' as any, // Cast to any to bypass TS error for newer stripe versions
});

export const apiRouter = express.Router();

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

    if (itemType === 'links') {
      let priceInCents = 0;
      let title = '';
      if (amount === 1000) {
        priceInCents = 499;
        title = '1000 Links';
      } else if (amount === 5000) {
        priceInCents = 1999;
        title = '5000 Links';
      } else {
        return res.status(400).json({ success: false, error: 'Invalid links amount' });
      }

      priceData = {
        currency: 'usd',
        product_data: {
          name: title,
          description: `Purchase ${amount} Links for use in the app`,
        },
        unit_amount: priceInCents,
      };
      metadata.amount = amount.toString();
    } else if (itemType === 'premium') {
      priceData = {
        currency: 'usd',
        product_data: {
          name: 'Premium Subscription',
          description: 'Unlock Premium features',
        },
        unit_amount: 999, // Example price for premium
      };
    } else {
      return res.status(400).json({ success: false, error: 'Invalid item type' });
    }

    const session = await stripe.checkout.sessions.create({
      payment_method_types: ['card'],
      line_items: [
        {
          price_data: priceData,
          quantity: 1,
        },
      ],
      mode: 'payment',
      metadata,
      success_url: `${req.headers.origin}/shop?success=true`,
      cancel_url: `${req.headers.origin}/shop?canceled=true`,
    });

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

    const uid = session.metadata?.uid;
    const itemType = session.metadata?.itemType;

    if (uid && adminDb) {
      try {
        const userRef = adminDb.collection('users').doc(uid);

        await adminDb.runTransaction(async (transaction: any) => {
          const userDoc = await transaction.get(userRef);
          if (!userDoc.exists) return;

          const profile = userDoc.data()!;
          const updateData: any = { updatedAt: Date.now() };

          if (itemType === 'links') {
            const amountStr = session.metadata?.amount;
            if (amountStr) {
               const amount = parseInt(amountStr, 10);
               updateData.coins = (profile.coins || 0) + amount;
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
      if (matchCost > 0 && profile.coins < matchCost) {
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
        coins: matchCost,
        active: true,
        createdAt: Date.now(),
        updatedAt: Date.now()
      });

      const updateData: any = { updatedAt: Date.now() };
      if (matchCost > 0) {
        updateData.coins = profile.coins - matchCost;
      }
      transaction.update(userRef, updateData);
    });

    res.json({ success: true });
  } catch (e: any) {
    console.error("Make pick error:", e.message, e);
    res.status(500).json({ success: false, error: e.message });
  }
});

apiRouter.post("/admin/sync-schedules", async (req, res) => {
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

      if (profile.coins < cost) {
        throw new Error("Not enough links!");
      }

      const inventory = profile.inventory || [];
      if (inventory.includes(itemId)) {
        throw new Error("You already own this item!");
      }

      const updateData: any = {
        updatedAt: Date.now(),
        coins: profile.coins - cost,
        inventory: [...inventory, itemId]
      };

      transaction.update(userRef, updateData);
    });

    res.json({ success: true });
  } catch (e: any) {
    console.error("Buy item error:", e.message, e);
    res.status(500).json({ success: false, error: e.message });
  }
});

apiRouter.post("/user/equip", async (req, res) => {
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

apiRouter.post("/admin/grade-matchup", async (req, res) => {
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
