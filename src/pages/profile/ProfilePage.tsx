import React, { useState, useEffect } from 'react';
import { useAuth } from '../../lib/auth-context';
import { Button } from '../../components/ui/button';
import { Trophy, Coins, Calendar, Mail, CheckCircle2, XCircle, MinusCircle, Medal } from 'lucide-react';
import { format } from 'date-fns';
import { db } from '../../lib/firebase';
import { collection, getDocs, orderBy, query, where, documentId } from 'firebase/firestore';
import { Link } from 'react-router-dom';

export default function ProfilePage() {
  const { user, profile, loading } = useAuth();
  const [achievements, setAchievements] = useState<any[]>([]);
  const [achievementsLoading, setAchievementsLoading] = useState(true);

  const [inventoryItems, setInventoryItems] = useState<any[]>([]);
  const [inventoryLoading, setInventoryLoading] = useState(true);
  const [equipLoading, setEquipLoading] = useState<string | null>(null);

  useEffect(() => {
    const fetchAchievements = async () => {
      try {
        if (import.meta.env.DEV && (!db?.app?.options?.apiKey || db?.app?.options?.apiKey === 'MY_FIREBASE_API_KEY')) {
            // Mock achievements for local UI testing
            setAchievements([
                { id: '1', name: 'First Win', description: 'Won your first game', weight: 1, image: '/icons/icon-256x256.png' },
                { id: '2', name: 'Hot Streak', description: 'Won 5 games in a row', weight: 2, image: '/icons/icon-256x256.png' },
                { id: '3', name: 'Unstoppable', description: 'Won 10 games in a row', weight: 3, image: '/icons/icon-256x256.png' }
            ]);
            setAchievementsLoading(false);
            return;
        }

        const snap = await getDocs(query(collection(db, 'achievements'), orderBy('weight', 'desc')));
        const achs = snap.docs.map(doc => ({ id: doc.id, ...doc.data() }));
        setAchievements(achs);
      } catch (e) {
        console.error("Error fetching achievements", e);
      } finally {
        setAchievementsLoading(false);
      }
    };
    fetchAchievements();
  }, []);

  useEffect(() => {
    const fetchInventory = async () => {
      if (!profile?.inventory || profile.inventory.length === 0) {
        setInventoryItems([]);
        setInventoryLoading(false);
        return;
      }

      try {
        if (import.meta.env.DEV && (!db?.app?.options?.apiKey || db?.app?.options?.apiKey === 'MY_FIREBASE_API_KEY')) {
          const mockItems = [
            { id: 'ring_gold', name: 'Gold Ring', description: 'A fancy gold ring.', cost: 500, type: 'AVATAR_RING', active: true, image: 'border-yellow-500' },
            { id: 'banner_neon', name: 'Neon Banner', description: 'Bright profile header.', cost: 1000, type: 'PROFILE_BANNER', active: true, image: 'bg-gradient-to-r from-fuchsia-500 to-cyan-500' },
            { id: 'title_highroller', name: 'High Roller', description: 'Show off your wealth.', cost: 2500, type: 'TITLE', active: true, image: '' },
          ];
          setInventoryItems(mockItems.filter(i => profile.inventory.includes(i.id)));
          setInventoryLoading(false);
          return;
        }

        // chunk array in case there are more than 10 inventory items
        const chunkSize = 10;
        const chunks = [];
        for (let i = 0; i < profile.inventory.length; i += chunkSize) {
            chunks.push(profile.inventory.slice(i, i + chunkSize));
        }

        const fetchPromises = chunks.map(chunk =>
            getDocs(query(collection(db, 'shopItems'), where(documentId(), 'in', chunk)))
        );

        const snapshots = await Promise.all(fetchPromises);
        const fetchedItems = snapshots.flatMap(snap => snap.docs.map(doc => ({ id: doc.id, ...doc.data() })));
        setInventoryItems(fetchedItems);
      } catch (e) {
        console.error("Error fetching inventory", e);
      } finally {
        setInventoryLoading(false);
      }
    };
    fetchInventory();
  }, [profile?.inventory]);

  const handleEquip = async (itemId: string | null, type: string) => {
    if (!user) return;
    setEquipLoading(type);

    try {
      const token = await user.getIdToken();
      const res = await fetch('/api/user/equip', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ itemId, type })
      });

      if (!res.ok) {
        const text = await res.text();
        console.error("Equip failed", res.status, text);
      }
    } catch (e) {
      console.error("Equip error", e);
    } finally {
      setEquipLoading(null);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full text-zinc-500 font-medium">
        Loading profile...
      </div>
    );
  }

  if (!user || !profile) {
    return (
      <div className="flex flex-col items-center justify-center h-full text-zinc-500 font-medium">
        <p>You must be logged in to view your profile.</p>
      </div>
    );
  }

  // Calculate Win Rate
  const stats = profile.stats || { wins: 0, losses: 0, pushes: 0 };
  const totalDecisions = stats.wins + stats.losses;
  const winRate = totalDecisions > 0 ? (stats.wins / totalDecisions) * 100 : 0;

  // Formatting date
  let joinDate = 'Unknown';
  if (user.metadata?.creationTime) {
      try {
          joinDate = format(new Date(user.metadata.creationTime), "MMMM d, yyyy");
      } catch (e) {
          console.error("Error formatting date", e);
      }
  }

  // Calculate achievement counts
  const userAchievements = profile.achievements || [];

  // Group achievements by weight (rarity)
  const achievementsByWeight: Record<number, any[]> = {};
  achievements.forEach(ach => {
      const weight = ach.weight || 0;
      if (!achievementsByWeight[weight]) {
          achievementsByWeight[weight] = [];
      }
      achievementsByWeight[weight].push(ach);
  });

  // Sort weights descending (rarer first)
  const sortedWeights = Object.keys(achievementsByWeight)
      .map(Number)
      .sort((a, b) => b - a);

  return (
    <div className="max-w-4xl mx-auto p-4 md:p-8 space-y-6">

      {/* Profile Header */}
      <div className={`bg-[#121212] border border-zinc-800 rounded-2xl p-6 md:p-10 flex flex-col md:flex-row items-center gap-6 relative overflow-hidden ${
        profile?.equippedCosmetics?.PROFILE_BANNER ?
          inventoryItems.find(i => i.id === profile.equippedCosmetics.PROFILE_BANNER)?.image || ''
          : ''
      }`}>
         {/* Only show default background if no banner is equipped */}
         {!profile?.equippedCosmetics?.PROFILE_BANNER && (
            <div className="absolute inset-0 bg-[radial-gradient(#22c55e_1px,transparent_1px)] [background-size:24px_24px] [mask-image:radial-gradient(ellipse_50%_50%_at_50%_50%,#000_10%,transparent_80%)] opacity-5 pointer-events-none"></div>
         )}

         <div className="relative">
            <div className={`w-24 h-24 md:w-32 md:h-32 rounded-full overflow-hidden border-4 shadow-xl z-10 relative ${
              profile?.equippedCosmetics?.AVATAR_RING ?
                inventoryItems.find(i => i.id === profile.equippedCosmetics.AVATAR_RING)?.image || 'border-[#27272a]'
                : 'border-[#27272a]'
            }`}>
               {profile.image ? (
                 <img src={profile.image} alt={profile.username || profile.name} className="w-full h-full object-cover" />
               ) : (
                 <div className="w-full h-full bg-zinc-800 flex items-center justify-center text-4xl font-bold text-zinc-400">
                   {(profile.username || profile.name)?.charAt(0) || user.email?.charAt(0) || '?'}
                 </div>
               )}
            </div>
            {profile.role === 'ADMIN' && (
              <div className="absolute -bottom-2 left-1/2 -translate-x-1/2 bg-green-500 text-green-950 text-[10px] font-bold px-2 py-0.5 rounded-full z-20 shadow border border-green-400">
                ADMIN
              </div>
            )}
         </div>

         <div className="flex-1 text-center md:text-left z-10">
            <h1 className="text-3xl md:text-4xl font-bold text-zinc-100 mb-1 font-display drop-shadow-md">{profile.username || profile.name}</h1>

            {profile?.equippedCosmetics?.TITLE && (
               <div className="mb-3 inline-block">
                  <span className="text-sm font-bold text-[#22c55e] px-2 py-0.5 rounded bg-black/40 border border-[#22c55e]/30 shadow-sm backdrop-blur-sm">
                     {inventoryItems.find(i => i.id === profile.equippedCosmetics.TITLE)?.name || 'Title'}
                  </span>
               </div>
            )}

            <div className="flex flex-col md:flex-row gap-2 md:gap-4 text-sm text-zinc-300 justify-center md:justify-start drop-shadow-md font-medium">
               <div className="flex items-center gap-1.5 justify-center md:justify-start">
                 <Mail className="w-4 h-4 opacity-70" />
                 {user.email}
               </div>
               <div className="flex items-center gap-1.5 justify-center md:justify-start">
                 <Calendar className="w-4 h-4 opacity-70" />
                 Joined {joinDate}
               </div>
            </div>
         </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">

        {/* Wallet & Status */}
        <div className="bg-[#121212] border border-zinc-800 rounded-2xl p-6 md:col-span-1 h-fit">
           <h2 className="text-lg font-bold text-zinc-200 mb-4 flex items-center gap-2">
              <Coins className="w-5 h-5 text-cyan-400" /> Wallet
           </h2>
           <div className="flex flex-col gap-4">
              <div className="bg-[#18181A] rounded-xl p-4 border border-zinc-800/50 flex flex-col items-center justify-center">
                 <span className="text-sm text-zinc-400 font-medium mb-1 uppercase tracking-wider">Balance</span>
                 <div className="text-4xl font-mono font-bold text-cyan-400 flex items-center gap-2">
                   {profile.coins?.toLocaleString() || 0}
                 </div>
              </div>
              <Button className="w-full bg-cyan-500 hover:bg-cyan-600 text-white" variant="default">
                 Link Shop (Coming Soon)
              </Button>
           </div>
        </div>

        {/* Stats Overview */}
        <div className="bg-[#121212] border border-zinc-800 rounded-2xl p-6 md:col-span-2 h-fit">
           <div className="flex justify-between items-center mb-6">
              <h2 className="text-lg font-bold text-zinc-200 flex items-center gap-2">
                <Trophy className="w-5 h-5 text-yellow-500" /> Career Stats
              </h2>
              <div className="text-right">
                <span className="text-2xl font-bold text-zinc-100">{winRate.toFixed(1)}%</span>
                <span className="text-xs text-zinc-500 block uppercase tracking-wider font-bold">Win Rate</span>
              </div>
           </div>

           <div className="grid grid-cols-3 gap-4">
              <div className="bg-green-500/10 border border-green-500/20 rounded-xl p-4 flex flex-col items-center justify-center relative overflow-hidden group hover:bg-green-500/20 transition-colors">
                 <CheckCircle2 className="w-6 h-6 text-green-500 mb-2 opacity-80" />
                 <span className="text-2xl font-bold text-green-400">{stats.wins}</span>
                 <span className="text-[10px] uppercase font-bold text-green-500/80 tracking-wider">Wins</span>
              </div>

              <div className="bg-red-500/10 border border-red-500/20 rounded-xl p-4 flex flex-col items-center justify-center relative overflow-hidden group hover:bg-red-500/20 transition-colors">
                 <XCircle className="w-6 h-6 text-red-500 mb-2 opacity-80" />
                 <span className="text-2xl font-bold text-red-400">{stats.losses}</span>
                 <span className="text-[10px] uppercase font-bold text-red-500/80 tracking-wider">Losses</span>
              </div>

              <div className="bg-zinc-500/10 border border-zinc-500/20 rounded-xl p-4 flex flex-col items-center justify-center relative overflow-hidden group hover:bg-zinc-500/20 transition-colors">
                 <MinusCircle className="w-6 h-6 text-zinc-500 mb-2 opacity-80" />
                 <span className="text-2xl font-bold text-zinc-400">{stats.pushes}</span>
                 <span className="text-[10px] uppercase font-bold text-zinc-500/80 tracking-wider">Pushes</span>
              </div>
           </div>

           {/* Progress Bar */}
           <div className="mt-6">
              <div className="flex justify-between text-xs text-zinc-500 font-medium mb-2">
                 <span>Total Decisions: {totalDecisions}</span>
              </div>
              <div className="h-2 w-full bg-red-500/20 rounded-full overflow-hidden flex">
                 <div className="h-full bg-green-500" style={{ width: `${winRate}%` }}></div>
              </div>
           </div>

        </div>

      </div>

      {/* Medal Table */}
      <div className="bg-[#121212] border border-zinc-800 rounded-2xl p-6">
         <h2 className="text-lg font-bold text-zinc-200 mb-6 flex items-center gap-2">
            <Medal className="w-5 h-5 text-yellow-400" /> Medal Table
         </h2>

         {achievementsLoading ? (
            <div className="text-center text-zinc-500 py-8">Loading achievements...</div>
         ) : achievements.length === 0 ? (
            <div className="text-center text-zinc-500 py-8">No achievements found.</div>
         ) : (
            <div className="flex flex-col gap-[2px] bg-zinc-800 border border-zinc-800 rounded overflow-hidden">
               {sortedWeights.map((weight) => (
                  <div key={weight} className="bg-[#1e1e1e] flex flex-wrap min-h-[76px] relative">
                     {/* Background gradient hint based on rarity/weight */}
                     {weight >= 3 && <div className="absolute inset-0 bg-gradient-to-r from-yellow-500/5 to-transparent pointer-events-none"></div>}
                     {weight === 2 && <div className="absolute inset-0 bg-gradient-to-r from-blue-500/5 to-transparent pointer-events-none"></div>}

                     {achievementsByWeight[weight].map((ach) => {
                        // Count how many times the user earned this achievement
                        // Assuming userAchievements is an array of achievement IDs or objects
                        let count = 0;
                        if (userAchievements && Array.isArray(userAchievements)) {
                            count = userAchievements.filter(id => {
                                if (typeof id === 'string') return id === ach.id;
                                if (id && typeof id === 'object' && id.id) return id.id === ach.id;
                                return false;
                            }).length;
                        }

                        const hasEarned = count > 0;

                        return (
                           <div key={ach.id} className="w-[60px] md:w-[76px] flex flex-col group relative" title={`${ach.name}\n${ach.description}`}>
                              {/* Icon Container */}
                              <div className={`h-[60px] flex items-center justify-center border-r border-zinc-800/50 ${hasEarned ? 'opacity-100' : 'opacity-20 grayscale'}`}>
                                 <img src={ach.image || '/logo.svg'} alt={ach.name} className="w-10 h-10 object-contain drop-shadow-md" />
                              </div>
                              {/* Count Banner */}
                              <div className={`h-4 text-[9px] md:text-[10px] font-mono font-bold flex items-center justify-center border-t border-r border-zinc-800/50 ${hasEarned ? 'text-zinc-300' : 'text-zinc-600'}`}>
                                 {count}
                              </div>

                              {/* Tooltip on hover */}
                              <div className="absolute opacity-0 group-hover:opacity-100 bottom-full left-1/2 -translate-x-1/2 mb-2 w-48 bg-black/90 backdrop-blur text-white text-xs rounded-lg p-3 pointer-events-none z-50 shadow-xl border border-zinc-700 transition-opacity">
                                 <div className="font-bold mb-1 text-[#22c55e]">{ach.name}</div>
                                 <div className="text-zinc-300">{ach.description}</div>
                                 {hasEarned && (
                                     <div className="mt-2 text-[10px] text-zinc-400 border-t border-zinc-700/50 pt-2">
                                         Earned <span className="text-white font-bold">{count}</span> time{count !== 1 ? 's' : ''}
                                     </div>
                                 )}
                              </div>
                           </div>
                        );
                     })}
                  </div>
               ))}
            </div>
         )}
      </div>

      {/* Inventory & Cosmetics */}
      <div className="bg-[#121212] border border-zinc-800 rounded-2xl p-6 mt-6">
         <h2 className="text-lg font-bold text-zinc-200 mb-6 flex items-center justify-between">
            <div className="flex items-center gap-2">
               <Coins className="w-5 h-5 text-cyan-400" /> Inventory & Cosmetics
            </div>
            <Link to="/shop" className="text-sm font-medium text-cyan-400 hover:text-cyan-300">
               Visit Shop
            </Link>
         </h2>

         {inventoryLoading ? (
            <div className="text-center text-zinc-500 py-8">Loading inventory...</div>
         ) : inventoryItems.length === 0 ? (
            <div className="text-center text-zinc-500 py-8 flex flex-col items-center justify-center">
               <div className="mb-2">You don't own any cosmetics yet.</div>
               <Link to="/shop">
                  <Button variant="outline" className="mt-2 border-zinc-700 text-zinc-300 hover:text-white hover:bg-zinc-800">
                     Browse Shop
                  </Button>
               </Link>
            </div>
         ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
               {inventoryItems.map(item => {
                  const isEquipped = profile?.equippedCosmetics?.[item.type] === item.id;

                  return (
                     <div key={item.id} className={`bg-[#18181a] border rounded-xl p-4 flex flex-col ${isEquipped ? 'border-cyan-500/50 shadow-[0_0_15px_rgba(6,182,212,0.1)]' : 'border-zinc-800'}`}>
                        <div className="flex justify-between items-start mb-2">
                           <h3 className="text-md font-bold text-zinc-200">{item.name}</h3>
                           <span className="text-[10px] px-2 py-1 bg-zinc-800 text-zinc-400 rounded uppercase font-bold tracking-wider">{item.type.replace('_', ' ')}</span>
                        </div>
                        <p className="text-xs text-zinc-500 mb-4 flex-1">{item.description}</p>

                        <Button
                           onClick={() => handleEquip(isEquipped ? null : item.id, item.type)}
                           disabled={equipLoading === item.type}
                           variant={isEquipped ? "destructive" : "default"}
                           className={`w-full ${isEquipped ? 'bg-red-500/10 text-red-500 hover:bg-red-500/20 border-0' : 'bg-zinc-800 hover:bg-zinc-700 text-zinc-300'}`}
                           size="sm"
                        >
                           {equipLoading === item.type ? 'Processing...' : isEquipped ? 'Unequip' : 'Equip'}
                        </Button>
                     </div>
                  );
               })}
            </div>
         )}
      </div>

    </div>
  );
}
