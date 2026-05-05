import React, { useState, useEffect } from 'react';
import { ShoppingCart, Coins, Crown, Zap } from 'lucide-react';
import { db } from '../../lib/firebase';
import { collection, getDocs, query, where } from 'firebase/firestore';
import { useAuth } from '../../lib/auth-context';
import { Button } from '../../components/ui/button';
import { loadStripe } from '@stripe/stripe-js';

const stripePromise = loadStripe(import.meta.env.VITE_STRIPE_PUBLIC_KEY || '');

export default function ShopPage() {
  const { user, profile } = useAuth();
  const [items, setItems] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [buyLoading, setBuyLoading] = useState<string | null>(null);
  const [message, setMessage] = useState<{ text: string, type: 'success' | 'error' } | null>(null);

  useEffect(() => {
    const fetchItems = async () => {
      try {
        if (import.meta.env.DEV && (!db?.app?.options?.apiKey || db?.app?.options?.apiKey === 'MY_FIREBASE_API_KEY')) {
          setItems([
            { id: 'ring_gold', name: 'Gold Ring', description: 'A fancy gold ring for your avatar.', cost: 500, type: 'AVATAR_RING', active: true, image: 'border-yellow-500' },
            { id: 'banner_neon', name: 'Neon Banner', description: 'Brighten up your profile header.', cost: 1000, type: 'PROFILE_BANNER', active: true, image: 'bg-gradient-to-r from-fuchsia-500 to-cyan-500' },
            { id: 'title_highroller', name: 'High Roller', description: 'Show off your wealth.', cost: 2500, type: 'TITLE', active: true, image: '' },
          ]);
          setLoading(false);
          return;
        }

        const q = query(collection(db, 'shopItems'), where('active', '==', true));
        const snap = await getDocs(q);
        const fetchedItems = snap.docs.map(doc => ({ id: doc.id, ...doc.data() }));
        setItems(fetchedItems);
      } catch (e) {
        console.error("Error fetching shop items", e);
      } finally {
        setLoading(false);
      }
    };
    fetchItems();

    // Check for Stripe success/cancel params
    const searchParams = new URLSearchParams(window.location.search);
    if (searchParams.get('success')) {
      setMessage({ text: 'Payment successful! Your account has been updated.', type: 'success' });
      // Remove query params from URL
      window.history.replaceState(null, '', window.location.pathname);
    }
    if (searchParams.get('canceled')) {
      setMessage({ text: 'Payment was canceled.', type: 'error' });
      // Remove query params from URL
      window.history.replaceState(null, '', window.location.pathname);
    }
  }, []);

  const handleStripeCheckout = async (itemType: string, amount?: number) => {
    if (!user) {
      setMessage({ text: "You must be logged in to make purchases.", type: 'error' });
      return;
    }

    setBuyLoading(`${itemType}-${amount}`);
    setMessage(null);

    try {
      const token = await user.getIdToken();
      const res = await fetch('/api/stripe/create-checkout-session', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ itemType, amount })
      });

      const data = await res.json();
      if (res.ok && data.success && data.id) {
        const stripe = await stripePromise;
        if (!stripe) throw new Error("Stripe failed to initialize");

        const { error } = await (stripe as any).redirectToCheckout({
          sessionId: data.id
        });

        if (error) throw error;
      } else {
        setMessage({ text: data.error || "Failed to initiate checkout.", type: 'error' });
      }
    } catch (e: any) {
      console.error("Stripe checkout error:", e);
      setMessage({ text: "An error occurred during checkout.", type: 'error' });
    } finally {
      setBuyLoading(null);
    }
  };

  const handleBuy = async (itemId: string, cost: number) => {
    if (!user) {
      setMessage({ text: "You must be logged in to buy items.", type: 'error' });
      return;
    }
    if ((profile?.coins || 0) < cost) {
      setMessage({ text: "Not enough links!", type: 'error' });
      return;
    }

    setBuyLoading(itemId);
    setMessage(null);

    try {
      const token = await user.getIdToken();
      const res = await fetch('/api/shop/buy', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ itemId })
      });

      const data = await res.json();
      if (res.ok && data.success) {
        setMessage({ text: "Purchase successful! Equip it in your Profile.", type: 'success' });
      } else {
        setMessage({ text: data.error || "Purchase failed.", type: 'error' });
      }
    } catch (e: any) {
      setMessage({ text: "An error occurred.", type: 'error' });
    } finally {
      setBuyLoading(null);
    }
  };

  const cosmetics = items.filter(item => item.type === 'AVATAR_RING' || item.type === 'PROFILE_BANNER' || item.type === 'TITLE');

  return (
    <div className="max-w-7xl mx-auto px-4 md:px-6 py-8">
      <div className="mb-8 flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-zinc-100 font-display flex items-center gap-2">
            <ShoppingCart className="w-8 h-8 text-[#22c55e]" />
            Link Shop
          </h1>
          <p className="text-zinc-400 mt-1">Spend your links on cosmetics, merch, and gift cards.</p>
        </div>
        {profile && (
          <div className="bg-[#121212] border border-zinc-800 rounded-xl p-4 flex items-center gap-3">
             <span className="text-zinc-400 font-medium">Your Balance:</span>
             <div className="text-xl font-mono font-bold text-cyan-400 flex items-center gap-1">
               <Coins className="w-5 h-5" />
               {profile.coins?.toLocaleString() || 0}
             </div>
          </div>
        )}
      </div>

      {message && (
        <div className={`p-4 rounded-xl mb-8 border font-medium ${message.type === 'success' ? 'bg-green-500/10 border-green-500/20 text-green-400' : 'bg-red-500/10 border-red-500/20 text-red-400'}`}>
          {message.text}
        </div>
      )}

      <div className="space-y-12">

        <section>
          <h2 className="text-2xl font-bold text-zinc-200 mb-4 border-b border-zinc-800 pb-2 flex items-center gap-2">
            <Zap className="w-6 h-6 text-yellow-500" />
            Buy Links & Premium
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {/* 1000 Links */}
            <div className="bg-[#121212] border border-zinc-800 rounded-xl p-6 flex flex-col items-center text-center">
              <div className="w-16 h-16 rounded-full bg-cyan-500/20 text-cyan-400 flex items-center justify-center mb-4">
                <Coins className="w-8 h-8" />
              </div>
              <h3 className="text-xl font-bold text-zinc-100 mb-2">1,000 Links</h3>
              <p className="text-zinc-400 text-sm mb-6 flex-1">Boost your balance and make more picks!</p>
              <div className="w-full">
                <Button
                  onClick={() => handleStripeCheckout('links', 1000)}
                  disabled={buyLoading === 'links-1000' || !user}
                  className="w-full bg-cyan-600 hover:bg-cyan-500 text-white"
                >
                  {buyLoading === 'links-1000' ? 'Loading...' : '$4.99'}
                </Button>
              </div>
            </div>

            {/* 5000 Links */}
            <div className="bg-[#121212] border border-zinc-800 rounded-xl p-6 flex flex-col items-center text-center relative overflow-hidden">
              <div className="absolute top-0 right-0 bg-yellow-500 text-black text-xs font-bold px-3 py-1 rounded-bl-lg">
                BEST VALUE
              </div>
              <div className="w-16 h-16 rounded-full bg-cyan-500/20 text-cyan-400 flex items-center justify-center mb-4 mt-2">
                <Coins className="w-8 h-8" />
              </div>
              <h3 className="text-xl font-bold text-zinc-100 mb-2">5,000 Links</h3>
              <p className="text-zinc-400 text-sm mb-6 flex-1">A massive boost for serious players.</p>
              <div className="w-full">
                <Button
                  onClick={() => handleStripeCheckout('links', 5000)}
                  disabled={buyLoading === 'links-5000' || !user}
                  className="w-full bg-cyan-600 hover:bg-cyan-500 text-white"
                >
                  {buyLoading === 'links-5000' ? 'Loading...' : '$19.99'}
                </Button>
              </div>
            </div>

            {/* Premium Subscription */}
            <div className="bg-gradient-to-b from-purple-900/40 to-[#121212] border border-purple-500/30 rounded-xl p-6 flex flex-col items-center text-center">
              <div className="w-16 h-16 rounded-full bg-purple-500/20 text-purple-400 flex items-center justify-center mb-4">
                <Crown className="w-8 h-8" />
              </div>
              <h3 className="text-xl font-bold text-white mb-2">Premium</h3>
              <p className="text-purple-200/70 text-sm mb-6 flex-1">Unlock exclusive stats, custom avatars, and ad-free experience.</p>
              <div className="w-full">
                <Button
                  onClick={() => handleStripeCheckout('premium')}
                  disabled={buyLoading === 'premium-undefined' || !user || profile?.premium}
                  className="w-full bg-purple-600 hover:bg-purple-500 text-white"
                >
                  {profile?.premium ? 'Active' : buyLoading === 'premium-undefined' ? 'Loading...' : '$9.99 / mo'}
                </Button>
              </div>
            </div>
          </div>
        </section>

        <section>
          <h2 className="text-2xl font-bold text-zinc-200 mb-4 border-b border-zinc-800 pb-2">Cosmetics</h2>

          {loading ? (
            <div className="text-zinc-500">Loading shop...</div>
          ) : cosmetics.length === 0 ? (
            <div className="bg-[#121212] border border-zinc-800 rounded-xl p-8 text-center text-zinc-500">
              No cosmetics available right now.
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
              {cosmetics.map(item => {
                const ownsItem = profile?.inventory?.includes(item.id);

                return (
                  <div key={item.id} className="bg-[#121212] border border-zinc-800 rounded-xl overflow-hidden flex flex-col">
                     {/* Preview area */}
                     <div className="h-32 bg-zinc-900 flex items-center justify-center relative overflow-hidden border-b border-zinc-800">
                        {item.type === 'PROFILE_BANNER' && (
                          <div className={`absolute inset-0 ${item.image || 'bg-zinc-800'}`}></div>
                        )}
                        {item.type === 'AVATAR_RING' && (
                          <div className={`w-16 h-16 rounded-full border-4 ${item.image || 'border-zinc-500'} bg-zinc-800 z-10 flex items-center justify-center text-xs text-zinc-500`}>Avatar</div>
                        )}
                        {item.type === 'TITLE' && (
                          <div className="z-10 text-xl font-bold text-zinc-300 font-display px-4 py-2 bg-black/50 rounded-lg border border-zinc-700">{item.name}</div>
                        )}
                     </div>
                     <div className="p-5 flex flex-col flex-1">
                        <div className="flex justify-between items-start mb-2">
                           <h3 className="text-lg font-bold text-zinc-200">{item.name}</h3>
                           <span className="text-xs px-2 py-1 bg-zinc-800 text-zinc-400 rounded uppercase font-bold tracking-wider">{item.type.replace('_', ' ')}</span>
                        </div>
                        <p className="text-sm text-zinc-400 flex-1 mb-4">{item.description}</p>

                        <div className="flex items-center justify-between mt-auto">
                           <div className="font-mono font-bold text-cyan-400 flex items-center gap-1">
                             <Coins className="w-4 h-4" /> {item.cost.toLocaleString()}
                           </div>
                           <Button
                             onClick={() => handleBuy(item.id, item.cost)}
                             disabled={ownsItem || buyLoading === item.id || !user || (profile?.coins || 0) < item.cost}
                             variant={ownsItem ? "secondary" : "default"}
                             className={ownsItem ? "" : "bg-[#22c55e] hover:bg-[#16a34a] text-white"}
                           >
                             {buyLoading === item.id ? 'Processing...' : ownsItem ? 'Owned' : 'Buy Now'}
                           </Button>
                        </div>
                     </div>
                  </div>
                );
              })}
            </div>
          )}
        </section>

        <section>
          <h2 className="text-2xl font-bold text-zinc-200 mb-4 border-b border-zinc-800 pb-2">Merch</h2>
          <div className="bg-[#121212] border border-zinc-800 rounded-xl p-8 text-center text-zinc-500">
            Merch items coming soon...
          </div>
        </section>

        <section>
          <h2 className="text-2xl font-bold text-zinc-200 mb-4 border-b border-zinc-800 pb-2">Gift Cards</h2>
          <div className="bg-[#121212] border border-zinc-800 rounded-xl p-8 text-center text-zinc-500">
            Gift Cards coming soon...
          </div>
        </section>
      </div>
    </div>
  );
}
