import React, { useState, useEffect } from 'react';
import { ShoppingCart, Coins, Crown, Zap } from 'lucide-react';
import { db } from '../../lib/firebase';
import { collection, getDocs, query, where } from 'firebase/firestore';
import { useAuth } from '../../lib/auth-context';
import { Button } from '../../components/ui/button';
import { loadStripe } from '@stripe/stripe-js';

import { Hexagons } from '../../components/ui/avatar-backgrounds/hexagons';
import { Modal } from '../../components/ui/modal';
import { Input } from '../../components/ui/input';


import { Hip } from '../../components/ui/avatar-backgrounds/hip';
import { Inferno } from '../../components/ui/avatar-backgrounds/inferno';
import { Mandala } from '../../components/ui/avatar-backgrounds/mandala';
import { Ocean } from '../../components/ui/avatar-backgrounds/ocean';
import { PhantomStar } from '../../components/ui/avatar-backgrounds/phantomstar';
import { InfernoBanner } from '../../components/ui/profile-banners/inferno';
import { OceanBanner } from '../../components/ui/profile-banners/ocean';
import { PhantomStarBanner } from '../../components/ui/profile-banners/phantom-star';
import { GenesisSyndicate } from '../../components/ui/profile-banners/genesis-syndicate';
import { PrimeCircuitRing } from '../../components/ui/avatar-backgrounds/prime-circuit-ring';

const AvatarBackgroundMap: Record<string, React.FC<any>> = {
  'Hexagons': Hexagons,
  'Hip': Hip,
  'Inferno': Inferno,
  'Mandala': Mandala,
  'Ocean': Ocean,
  'PhantomStar': PhantomStar,
  'PrimeCircuitRing': PrimeCircuitRing
};

const ProfileBannerMap: Record<string, React.FC<any>> = {
  'InfernoBanner': InfernoBanner,
  'OceanBanner': OceanBanner,
  'PhantomStarBanner': PhantomStarBanner,
  'GenesisSyndicate': GenesisSyndicate
};

const stripePromise = loadStripe(import.meta.env.VITE_STRIPE_PUBLIC_KEY || '');

export default function ShopPage() {
  const { user, profile } = useAuth();
  const [items, setItems] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  const [buyLoading, setBuyLoading] = useState<string | null>(null);
  const [message, setMessage] = useState<{ text: string, type: 'success' | 'error' } | null>(null);
  const [isMerchModalOpen, setIsMerchModalOpen] = useState(false);
  const [selectedMerchItem, setSelectedMerchItem] = useState<any>(null);
  const [shippingInfo, setShippingInfo] = useState({
    fullName: '',
    streetAddress: '',
    city: '',
    state: '',
    zip: '',
    country: ''
  });


  useEffect(() => {
    const fetchItems = async () => {
      try {
        if (import.meta.env.DEV && (!db?.app?.options?.apiKey || db?.app?.options?.apiKey === 'MY_FIREBASE_API_KEY')) {
          setItems([
            { id: 'ring_gold', name: 'Gold Ring', description: 'A fancy gold ring for your avatar.', cost: 500, type: 'AVATAR_RING', active: true, image: 'Hexagons' },
            { id: 'banner_neon', name: 'Neon Banner', description: 'Brighten up your profile header.', cost: 1000, type: 'PROFILE_BANNER', active: true, image: 'InfernoBanner' },
            { id: 'title_highroller', name: 'High Roller', description: 'Show off your wealth.', cost: 2500, type: 'TITLE', active: true, image: '' },
            { id: 'merch_shirt', name: 'Cool Shirt', description: 'A shirt', cost: 100, type: 'MERCH', active: true, image: '' },
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


  const handleBuyMerch = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user || !selectedMerchItem) return;

    if ((profile?.coins || 0) < selectedMerchItem.cost) {
      setMessage({ text: "Not enough links!", type: 'error' });
      setIsMerchModalOpen(false);
      return;
    }

    setBuyLoading(selectedMerchItem.id);
    setMessage(null);

    try {
      const token = await user.getIdToken();
      const res = await fetch('/api/shop/buy-merch', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ itemId: selectedMerchItem.id, shippingInfo })
      });

      const data = await res.json();
      if (res.ok && data.success) {
        setMessage({ text: "Order placed successfully! We will email you with updates.", type: 'success' });
        setIsMerchModalOpen(false);
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
  const merchItems = items.filter(item => item.type === 'MERCH');


  return (
    <div className="max-w-7xl mx-auto px-4 md:px-6 py-8">
      <div className="mb-8 flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-zinc-100 font-display flex items-center gap-2">
            <ShoppingCart className="w-8 h-8 text-[#22c55e]" />
            Link Shop
          </h1>
          <p className="text-zinc-400 mt-1">Spend your links on cosmetics and merch.</p>
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
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
            {/* Starter */}
            <div className="bg-[#121212] border border-zinc-800 rounded-xl p-6 flex flex-col items-center text-center">
              <div className="w-16 h-16 rounded-full bg-cyan-500/20 text-cyan-400 flex items-center justify-center mb-4">
                <Coins className="w-8 h-8" />
              </div>
              <h3 className="text-xl font-bold text-zinc-100 mb-2">150 Links</h3>
              <p className="text-zinc-400 text-sm mb-6 flex-1">A quick refill to keep your streak alive.</p>
              <div className="w-full">
                <Button
                  onClick={() => handleStripeCheckout('links', 150)}
                  disabled={buyLoading === 'links-150' || !user}
                  className="w-full bg-cyan-600 hover:bg-cyan-500 text-white"
                >
                  {buyLoading === 'links-150' ? 'Loading...' : '$5.25'}
                </Button>
              </div>
            </div>

            {/* Monthly */}
            <div className="bg-[#121212] border border-zinc-800 rounded-xl p-6 flex flex-col items-center text-center">
              <div className="w-16 h-16 rounded-full bg-cyan-500/20 text-cyan-400 flex items-center justify-center mb-4">
                <Coins className="w-8 h-8" />
              </div>
              <h3 className="text-xl font-bold text-zinc-100 mb-2">350 Links</h3>
              <p className="text-zinc-400 text-sm mb-6 flex-1">Standard boost for your bankroll.</p>
              <div className="w-full">
                <Button
                  onClick={() => handleStripeCheckout('links', 350)}
                  disabled={buyLoading === 'links-350' || !user}
                  className="w-full bg-cyan-600 hover:bg-cyan-500 text-white"
                >
                  {buyLoading === 'links-350' ? 'Loading...' : '$10.49'}
                </Button>
              </div>
            </div>

            {/* Merch Tier */}
            <div className="bg-[#121212] border border-zinc-800 rounded-xl p-6 flex flex-col items-center text-center relative overflow-hidden">
              <div className="absolute top-0 right-0 bg-yellow-500 text-black text-[10px] font-bold px-2 py-0.5 rounded-bl-lg">
                POPULAR
              </div>
              <div className="w-16 h-16 rounded-full bg-cyan-500/20 text-cyan-400 flex items-center justify-center mb-4 mt-2">
                <Coins className="w-8 h-8" />
              </div>
              <h3 className="text-xl font-bold text-zinc-100 mb-2">1,050 Links</h3>
              <p className="text-zinc-400 text-sm mb-6 flex-1">Enough for a merch redemption.</p>
              <div className="w-full">
                <Button
                  onClick={() => handleStripeCheckout('links', 1050)}
                  disabled={buyLoading === 'links-1050' || !user}
                  className="w-full bg-cyan-600 hover:bg-cyan-500 text-white"
                >
                  {buyLoading === 'links-1050' ? 'Loading...' : '$29.99'}
                </Button>
              </div>
            </div>

            {/* Bulk Tier */}
            <div className="bg-[#121212] border border-zinc-800 rounded-xl p-6 flex flex-col items-center text-center relative overflow-hidden">
              <div className="absolute top-0 right-0 bg-yellow-500 text-black text-[10px] font-bold px-2 py-0.5 rounded-bl-lg">
                BEST VALUE
              </div>
              <div className="w-16 h-16 rounded-full bg-cyan-500/20 text-cyan-400 flex items-center justify-center mb-4 mt-2">
                <Coins className="w-8 h-8" />
              </div>
              <h3 className="text-xl font-bold text-zinc-100 mb-2">1,800 Links</h3>
              <p className="text-zinc-400 text-sm mb-6 flex-1">Massive boost for serious players.</p>
              <div className="w-full">
                <Button
                  onClick={() => handleStripeCheckout('links', 1800)}
                  disabled={buyLoading === 'links-1800' || !user}
                  className="w-full bg-cyan-600 hover:bg-cyan-500 text-white"
                >
                  {buyLoading === 'links-1800' ? 'Loading...' : '$49.99'}
                </Button>
              </div>
            </div>

            {/* Premium Subscription */}
            <div className="bg-gradient-to-b from-purple-900/40 to-[#121212] border border-purple-500/30 rounded-xl p-6 flex flex-col items-center text-center sm:col-span-2 lg:col-span-4 max-w-2xl mx-auto w-full">
              <div className="w-16 h-16 rounded-full bg-purple-500/20 text-purple-400 flex items-center justify-center mb-4">
                <Crown className="w-8 h-8" />
              </div>
              <h3 className="text-xl font-bold text-white mb-2">ChainLink Pro</h3>
              <p className="text-purple-200/70 text-sm mb-6 flex-1">Get 10 Links daily, unlock exclusive stats, and access pro features.</p>
              <div className="w-full">
                <Button
                  onClick={() => handleStripeCheckout('premium')}
                  disabled={buyLoading === 'premium-undefined' || !user || profile?.premium}
                  className="w-full bg-purple-600 hover:bg-purple-500 text-white"
                >
                  {profile?.premium ? 'Active' : buyLoading === 'premium-undefined' ? 'Loading...' : '$10.49 / mo'}
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
                          ProfileBannerMap[item.image] ? (
                            <div className="absolute inset-0">
                              {React.createElement(ProfileBannerMap[item.image], { isStatic: false })}
                            </div>
                          ) : (
                            <div className={`absolute inset-0 ${item.image || 'bg-zinc-800'}`}></div>
                          )
                        )}
                        {item.type === 'AVATAR_RING' && (
                          <div className="relative w-16 h-16 flex items-center justify-center z-10">
                            {AvatarBackgroundMap[item.image] ? (
                               <>
                                 <div className="absolute inset-0 rounded-full overflow-hidden">
                                   {React.createElement(AvatarBackgroundMap[item.image], { isStatic: false })}
                                 </div>
                                 <div className="relative w-full h-full p-1.5">
                                   <div className="w-full h-full rounded-full bg-zinc-800 flex items-center justify-center text-[10px] text-zinc-500 shadow-inner">Avatar</div>
                                 </div>
                               </>
                            ) : (
                              <div className={`w-16 h-16 rounded-full border-4 ${item.image || 'border-zinc-500'} bg-zinc-800 flex items-center justify-center text-xs text-zinc-500`}>Avatar</div>
                            )}
                          </div>
                        )}
                        {item.type === 'TITLE' && (
                          <div className={`z-10 text-xl font-bold text-zinc-300 font-display px-4 py-2 bg-black/50 rounded-lg border border-zinc-700 ${item.image || ''}`}>{item.name}</div>
                        )}
                     </div>
                     <div className="p-5 flex flex-col flex-1 relative">
                        <div className="flex justify-between items-start mb-2">
                           <div className="flex flex-col">
                              <h3 className="text-lg font-bold text-zinc-200">{item.name}</h3>
                              {item.premiumOnly && (
                                <span className="text-[10px] uppercase font-bold tracking-wider text-purple-400 mt-1">ChainLink Pro Exclusive</span>
                              )}
                           </div>
                           <span className="text-xs px-2 py-1 bg-zinc-800 text-zinc-400 rounded uppercase font-bold tracking-wider">{item.category || item.type.replace('_', ' ')}</span>
                        </div>
                        <p className="text-sm text-zinc-400 flex-1 mb-4">{item.description}</p>

                        <div className="flex items-center justify-between mt-auto">
                           <div className="font-mono font-bold text-cyan-400 flex items-center gap-1">
                             <Coins className="w-4 h-4" /> {item.cost.toLocaleString()}
                           </div>
                           {item.premiumOnly && !profile?.premium && !ownsItem ? (
                             <Button
                               disabled
                               className="bg-purple-500/20 text-purple-300 border border-purple-500/30 cursor-not-allowed opacity-80"
                             >
                               Requires Pro
                             </Button>
                           ) : (
                             <Button
                               onClick={() => handleBuy(item.id, item.cost)}
                               disabled={ownsItem || buyLoading === item.id || !user || (profile?.coins || 0) < item.cost}
                               variant={ownsItem ? "secondary" : "default"}
                               className={ownsItem ? "" : "bg-[#22c55e] hover:bg-[#16a34a] text-white"}
                             >
                               {buyLoading === item.id ? 'Processing...' : ownsItem ? 'Owned' : 'Buy Now'}
                             </Button>
                           )}
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
          {merchItems.length === 0 ? (
            <div className="bg-[#121212] border border-zinc-800 rounded-xl p-8 text-center text-zinc-500">
              No merch available right now.
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
              {merchItems.map(item => (
                <div key={item.id} className="bg-[#121212] border border-zinc-800 rounded-xl overflow-hidden flex flex-col">
                  <div className="h-40 bg-zinc-900 flex items-center justify-center relative overflow-hidden border-b border-zinc-800">
                     <div className={`absolute inset-0 ${item.image || 'bg-zinc-800'}`}></div>
                     {item.image ? null : <div className="text-6xl z-10">👕</div>}
                  </div>
                  <div className="p-5 flex flex-col flex-1">
                    <h3 className="text-xl font-bold text-zinc-200 mb-2">{item.name}</h3>
                    <p className="text-sm text-zinc-400 flex-1 mb-6">{item.description}</p>
                    <div className="flex items-center justify-between">
                      <div className="font-mono font-bold text-cyan-400 flex items-center gap-1">
                        <Coins className="w-4 h-4" /> {item.cost.toLocaleString()}
                      </div>
                      <Button
                         variant="default"
                         className="bg-[#22c55e] hover:bg-[#16a34a] text-white"
                         disabled={buyLoading === item.id || !user || (profile?.coins || 0) < item.cost}
                         onClick={() => {
                           setSelectedMerchItem(item);
                           setIsMerchModalOpen(true);
                         }}
                      >
                         {buyLoading === item.id ? 'Processing...' : 'Buy Now'}
                      </Button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </section>

      <Modal isOpen={isMerchModalOpen} onClose={() => setIsMerchModalOpen(false)}>
        <div className="p-6">
          <h2 className="text-xl font-bold text-zinc-100 mb-2">Order {selectedMerchItem?.name}</h2>
          <p className="text-zinc-400 text-sm mb-6">
            Please enter your shipping information below. This is required for physical merchandise.
          </p>
          <form onSubmit={handleBuyMerch}>
            <div className="space-y-4">
              <div>
                <label htmlFor="fullName" className="block text-sm font-medium text-zinc-400 mb-1">Full Name</label>
                <Input
                  id="fullName"
                  required
                  value={shippingInfo.fullName}
                  onChange={(e) => setShippingInfo({...shippingInfo, fullName: e.target.value})}
                  className="bg-zinc-900 border-zinc-800"
                />
              </div>
              <div>
                <label htmlFor="streetAddress" className="block text-sm font-medium text-zinc-400 mb-1">Street Address</label>
                <Input
                  id="streetAddress"
                  required
                  value={shippingInfo.streetAddress}
                  onChange={(e) => setShippingInfo({...shippingInfo, streetAddress: e.target.value})}
                  className="bg-zinc-900 border-zinc-800"
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label htmlFor="city" className="block text-sm font-medium text-zinc-400 mb-1">City</label>
                  <Input
                    id="city"
                    required
                    value={shippingInfo.city}
                    onChange={(e) => setShippingInfo({...shippingInfo, city: e.target.value})}
                    className="bg-zinc-900 border-zinc-800"
                  />
                </div>
                <div>
                  <label htmlFor="state" className="block text-sm font-medium text-zinc-400 mb-1">State</label>
                  <Input
                    id="state"
                    required
                    value={shippingInfo.state}
                    onChange={(e) => setShippingInfo({...shippingInfo, state: e.target.value})}
                    className="bg-zinc-900 border-zinc-800"
                  />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label htmlFor="zip" className="block text-sm font-medium text-zinc-400 mb-1">ZIP Code</label>
                  <Input
                    id="zip"
                    required
                    value={shippingInfo.zip}
                    onChange={(e) => setShippingInfo({...shippingInfo, zip: e.target.value})}
                    className="bg-zinc-900 border-zinc-800"
                  />
                </div>
                <div>
                  <label htmlFor="country" className="block text-sm font-medium text-zinc-400 mb-1">Country</label>
                  <Input
                    id="country"
                    required
                    value={shippingInfo.country}
                    onChange={(e) => setShippingInfo({...shippingInfo, country: e.target.value})}
                    className="bg-zinc-900 border-zinc-800"
                  />
                </div>
              </div>
            </div>
            <div className="mt-6 flex justify-end">
              <Button type="submit" disabled={buyLoading === selectedMerchItem?.id} className="bg-[#22c55e] hover:bg-[#16a34a] text-white">
                 {buyLoading === selectedMerchItem?.id ? 'Processing...' : 'Place Order'}
              </Button>
            </div>
          </form>
        </div>
      </Modal>

      </div>
    </div>
  );
}
