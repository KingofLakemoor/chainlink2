import React, { useState, useEffect } from 'react';
import { useAuth } from '../../lib/auth-context';
import { db } from '../../lib/firebase';
import { collection, getDocs, query, where } from 'firebase/firestore';
import { Button } from '../../components/ui/button';
import { cn } from '../../lib/utils';
import { Trophy, Download, Medal, Flame, CheckCircle2, Percent, Users } from 'lucide-react';
import { format } from 'date-fns';

import { Hexagons } from '../../components/ui/avatar-rings/hexagons';
import { Hip } from '../../components/ui/avatar-rings/hip';
import { Inferno } from '../../components/ui/avatar-rings/inferno';
import { Mandala } from '../../components/ui/avatar-rings/mandala';
import { Ocean } from '../../components/ui/avatar-rings/ocean';
import { PhantomStar } from '../../components/ui/avatar-rings/phantomstar';
import { PrimeCircuitRing } from '../../components/ui/avatar-rings/prime-circuit-ring';
import { OpulentoAvatarRing } from '../../components/ui/avatar-rings/opulento';
import { ZeroZeroAvatarRing } from '../../components/ui/avatar-rings/zero-zero';
import { TitleMap } from '../../components/ui/titles';
import { InfernoBanner } from '../../components/ui/profile-banners/inferno';
import { OceanBanner } from '../../components/ui/profile-banners/ocean';
import { PhantomStarBanner } from '../../components/ui/profile-banners/phantom-star';
import { GenesisSyndicate } from '../../components/ui/profile-banners/genesis-syndicate';
import { GlobalStageBanner } from '../../components/ui/profile-banners/global-stage';
import { OpulentoVaultBanner } from '../../components/ui/profile-banners/opulento';
import { ZeroZeroShaderBanner } from "../../components/ui/profile-banners/zero-zero/ZeroZeroShaderBanner";
import { DaisyChainBanner } from '../../components/ui/profile-banners/daisy-chain/DaisyChainBanner';

const ProfileBannerMap: Record<string, React.FC<any>> = {
  'InfernoBanner': InfernoBanner,
  'OceanBanner': OceanBanner,
  'PhantomStarBanner': PhantomStarBanner,
  'GenesisSyndicate': GenesisSyndicate,
  'GlobalStageBanner': GlobalStageBanner,
  'OpulentoVaultBanner': OpulentoVaultBanner,
  'ZeroZeroShaderBanner': ZeroZeroShaderBanner,
  'DaisyChainBanner': DaisyChainBanner
};

const AvatarRingMap: Record<string, React.FC<any>> = {
  'Hexagons': Hexagons,
  'Hip': Hip,
  'Inferno': Inferno,
  'Mandala': Mandala,
  'Ocean': Ocean,
  'PhantomStar': PhantomStar,
  'PrimeCircuitRing': PrimeCircuitRing,
  'OpulentoAvatarRing': OpulentoAvatarRing,
  'ZeroZeroAvatarRing': ZeroZeroAvatarRing
};

export default function LeaderboardsPage() {
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [selectedMonth, setSelectedMonth] = useState('current'); // current by default
  const [leaderboardData, setLeaderboardData] = useState<any[]>([]);
  const [inventoryItems, setInventoryItems] = useState<any[]>([]);

  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      try {
        if (import.meta.env.DEV && (!db?.app?.options?.apiKey || db?.app?.options?.apiKey === 'MY_FIREBASE_API_KEY')) {
           // Mock Data
           const mockData = [
             { id: '1', name: 'John Doe', username: 'johndoe', image: '', stats: { wins: 45, losses: 10, pushes: 2 }, currentChain: 5, bestChain: 12 },
             { id: 'user-123', name: 'Mock User', username: 'MockUser123', image: 'https://api.dicebear.com/7.x/avataaars/svg?seed=mock-user-123', stats: { wins: 30, losses: 5, pushes: 0 }, currentChain: 15, bestChain: 15 },
             { id: '2', name: 'Jane Smith', username: 'janesmith', image: '', stats: { wins: 12, losses: 2, pushes: 0 }, currentChain: 3, bestChain: 8 },
             { id: '3', name: 'Bob Johnson', username: 'bobj', image: '', stats: { wins: 5, losses: 8, pushes: 1 }, currentChain: 0, bestChain: 2 },
           ];

           // Calculate win rates
           const processedMock = mockData.map(player => {
               const wins = player.stats?.wins || 0;
               const losses = player.stats?.losses || 0;
               const total = wins + losses;
               const winRate = total > 0 ? (wins / total) * 100 : 0;
               return { ...player, winRate, totalDecisions: total };
           }).sort((a, b) => {
               const aCurrentChain = a.currentChain || 0;
               const bCurrentChain = b.currentChain || 0;
               if (bCurrentChain !== aCurrentChain) return bCurrentChain - aCurrentChain;
               const aBestChain = a.bestChain || 0;
               const bBestChain = b.bestChain || 0;
               if (bBestChain !== aBestChain) return bBestChain - aBestChain;
               const aWins = a.stats?.wins || 0;
               const bWins = b.stats?.wins || 0;
               if (bWins !== aWins) return bWins - aWins;
               return (b.winRate || 0) - (a.winRate || 0);
           });

           setLeaderboardData(processedMock);
           setLoading(false);
           return;
        }

        const usersSnap = await getDocs(collection(db, 'users'));
        const chainsSnap = await getDocs(collection(db, 'chains'));

        // Fetch pending picks and all matchups to determine next pick
        const pendingPicksSnap = await getDocs(query(collection(db, 'picks'), where('status', '==', 'PENDING')));
        const matchupsSnap = await getDocs(collection(db, 'matchups'));

        const matchupsMap = new Map();
        matchupsSnap.docs.forEach(doc => {
            matchupsMap.set(doc.id, doc.data());
        });

        const activePicksMap = new Map();
        pendingPicksSnap.docs.forEach(doc => {
            const pick = doc.data();
            activePicksMap.set(pick.userId, pick);
        });

        const chainsMap = new Map();
        chainsSnap.docs.forEach(doc => {
            const data = doc.data();
            chainsMap.set(data.userId, data);
        });

        const shopItemsSnap = await getDocs(collection(db, 'shopItems'));
        const items = shopItemsSnap.docs.map(doc => ({ id: doc.id, ...doc.data() }));
        setInventoryItems(items);

        const mergedData = usersSnap.docs.map(doc => {
            const userData = doc.data();
            const chainData = chainsMap.get(doc.id) || { chain: 0, best: 0 };

            const wins = userData.stats?.wins || 0;
            const losses = userData.stats?.losses || 0;
            const total = wins + losses;
            const winRate = total > 0 ? (wins / total) * 100 : 0;

            let nextPickText = 'NO PICK';
            const userPick = activePicksMap.get(doc.id);
            if (userPick) {
                const matchup = matchupsMap.get(userPick.matchupId);
                if (matchup) {
                    if (matchup.status === 'STATUS_SCHEDULED') {
                        nextPickText = 'PICK IN';
                    } else {
                        nextPickText = userPick.pick?.name || userPick.pick?.id || 'NO PICK';
                    }
                }
            }

            return {
                id: doc.id,
                ...userData,
                stats: userData.stats || { wins: 0, losses: 0, pushes: 0 },
                currentChain: chainData.chain || 0,
                bestChain: chainData.best || 0,
                winRate,
                totalDecisions: total,
                nextPickText
            };
        });

        // Default sort by Current Chain, Longest Chain, Most Wins, Win Percentage
        mergedData.sort((a, b) => {
            const aCurrentChain = a.currentChain || 0;
            const bCurrentChain = b.currentChain || 0;
            if (bCurrentChain !== aCurrentChain) return bCurrentChain - aCurrentChain;
            const aBestChain = a.bestChain || 0;
            const bBestChain = b.bestChain || 0;
            if (bBestChain !== aBestChain) return bBestChain - aBestChain;
            const aWins = a.stats?.wins || 0;
            const bWins = b.stats?.wins || 0;
            if (bWins !== aWins) return bWins - aWins;
            return (b.winRate || 0) - (a.winRate || 0);
        });

        setLeaderboardData(mergedData);
      } catch (err) {
        console.error("Error fetching leaderboard data", err);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [selectedMonth]);

  // Calculate top performers
  const topCurrentChain = leaderboardData.length > 0 ? [...leaderboardData].sort((a, b) => b.currentChain - a.currentChain)[0] : null;
  const topWins = leaderboardData.length > 0 ? [...leaderboardData].sort((a, b) => (b.stats?.wins || 0) - (a.stats?.wins || 0))[0] : null;
  const topBestChain = leaderboardData.length > 0 ? [...leaderboardData].sort((a, b) => b.bestChain - a.bestChain)[0] : null;

  // Win rate requires min 10 decisions
  const eligibleForWinRate = leaderboardData.filter(p => p.totalDecisions >= 10);
  const topWinRate = eligibleForWinRate.length > 0 ? [...eligibleForWinRate].sort((a, b) => {
    if (b.winRate !== a.winRate) return b.winRate - a.winRate;
    return (b.stats?.wins || 0) - (a.stats?.wins || 0);
  })[0] : null;

  const handleExportCSV = () => {
    if (leaderboardData.length === 0) return;

    const headers = ['Rank', 'Player', 'Next Pick', 'Wins', 'Losses', 'Win %', 'Current Chain', 'Best Chain'];

    const csvRows = leaderboardData.map((player, index) => {
      const wins = player.stats?.wins || 0;
      const losses = player.stats?.losses || 0;
      const winRate = player.winRate?.toFixed(1) || 0;
      const name = player.username || player.name || 'Unknown';

      // wrap name in quotes to handle potential commas
      return [
        index + 1,
        `"${name.replace(/"/g, '""')}"`,
        `"${(player.nextPickText || 'NO PICK').replace(/"/g, '""')}"`,
        wins,
        losses,
        `${winRate}%`,
        player.currentChain || 0,
        player.bestChain || 0
      ].join(',');
    });

    const csvContent = [headers.join(','), ...csvRows].join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);

    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute('download', `leaderboard-${format(new Date(), 'yyyy-MM-dd')}.csv`);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const renderTopPerformerCard = (
    title: string,
    player: any,
    valueLabel: string,
    valueColorClass: string,
    Icon: any,
    iconColorClass: string
  ) => {
    if (!player) {
      return (
        <div className="bg-[#121212] border border-zinc-800 rounded-xl p-5 flex items-center gap-4 relative overflow-hidden group min-h-[160px] opacity-50">
          <div className="w-12 h-12 rounded-full bg-zinc-800 flex items-center justify-center flex-shrink-0">
             <Icon className="w-6 h-6 text-zinc-600" />
          </div>
          <div>
            <p className="text-xs text-zinc-500 uppercase tracking-wider font-bold mb-1">{title}</p>
            <p className="text-zinc-400 font-bold">N/A</p>
          </div>
        </div>
      );
    }

    const bannerItem = inventoryItems.find(i => i.id === player.equippedCosmetics?.PROFILE_BANNER);
    const bannerImage = bannerItem?.image;
    const BannerComponent = ProfileBannerMap[bannerImage || ''];

    const ringItem = inventoryItems.find(i => i.id === player.equippedCosmetics?.AVATAR_RING);
    const ringImage = ringItem?.image;
    const RingComponent = AvatarRingMap[ringImage || ''];

    const titleItem = inventoryItems.find(i => i.id === player.equippedCosmetics?.TITLE);
    const titleImage = titleItem?.image;
    const TitleComponent = titleImage ? TitleMap[titleImage || ''] : null;

    return (
      <div className="bg-[#121212] border border-zinc-800 rounded-xl relative overflow-hidden group min-h-[220px] flex flex-col">
         {BannerComponent ? (
            <div className="absolute inset-0 z-0">
               <BannerComponent isStatic={false} />
            </div>
         ) : (
            <div className="absolute inset-0 bg-[radial-gradient(#22c55e_1px,transparent_1px)] [background-size:24px_24px] [mask-image:radial-gradient(ellipse_50%_50%_at_50%_50%,#000_10%,transparent_80%)] opacity-5 pointer-events-none"></div>
         )}

         <div className="absolute inset-0 bg-black/20 z-0"></div>

         <div className="relative z-10 flex-1 flex flex-col items-center p-5 pt-6 text-center">

            <div className="relative mb-3">
              {RingComponent && (
                 <div className="absolute inset-0 z-0 transform scale-125 pointer-events-none rounded-full overflow-hidden">
                    <RingComponent isStatic={false} />
                 </div>
              )}
               <img loading="lazy"
                 src={player.image || `https://api.dicebear.com/7.x/avataaars/svg?seed=${player.id}`}
                 alt={player.displayName || player.username || player.name}
                 className="w-16 h-16 rounded-full relative z-10 border-2 border-[#121212]"
              />
            </div>

            <div className="mt-1">
              {TitleComponent ? (
                 <div className="mb-1 flex justify-center">
                    <TitleComponent isStatic={false} />
                 </div>
              ) : titleItem ? (
                 <div className="mb-1 flex justify-center">
                    <span className={`text-[10px] md:text-xs font-bold text-[#22c55e] px-2 py-0.5 rounded bg-black/40 border border-[#22c55e]/30 shadow-sm backdrop-blur-sm ${titleItem?.image || ''}`}>
                       {titleItem?.name || 'Title'}
                    </span>
                 </div>
              ) : null}
              <h3 className="text-white font-bold text-sm truncate max-w-[150px]">{player.displayName || player.username || player.name}</h3>
            </div>
         </div>

         <div className="relative z-10 bg-[#111111]/90 border-t border-zinc-800 p-3 px-4 flex items-center justify-between">
            <div className="flex items-center gap-2">
               <Icon className={`w-4 h-4 ${iconColorClass.replace('bg-', 'text-').replace('/10', '')}`} />
               <p className="text-[10px] text-zinc-400 uppercase tracking-wider font-bold">{title}</p>
            </div>
            <p className={`text-lg font-black ${valueColorClass}`}>
               {valueLabel}
            </p>
         </div>
      </div>
    );
  };

  return (
    <div className="max-w-7xl mx-auto px-4 md:px-6 py-8">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-8 gap-4">
        <div>
          <h1 className="text-3xl font-bold text-zinc-100 font-display flex items-center gap-2">
            <Trophy className="w-8 h-8 text-yellow-500" />
            Leaderboards
          </h1>
          <p className="text-zinc-400 mt-1">See how you stack up against the rest of the pack.</p>
        </div>

        <div className="flex items-center gap-3">
          <select
            className="bg-zinc-900 border border-zinc-800 text-zinc-200 text-sm rounded-lg focus:ring-green-500 focus:border-green-500 block p-2.5 outline-none"
            value={selectedMonth}
            onChange={(e) => setSelectedMonth(e.target.value)}
          >
            <option value="all-time">All-Time Leaders</option>
            <option value="current">Current Month</option>
            <option value="previous">Previous Month</option>
          </select>

          <Button onClick={handleExportCSV} variant="secondary" className="gap-2 bg-zinc-800 hover:bg-zinc-700 text-zinc-100" disabled={leaderboardData.length === 0}>
            <Download className="w-4 h-4" />
            Export CSV
          </Button>
        </div>
      </div>

      {/* Top Performers Header section */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        {renderTopPerformerCard(
          "Current Chain",
          topCurrentChain,
          (topCurrentChain?.currentChain || 0) < 0 ? `L${Math.abs(topCurrentChain?.currentChain || 0)}` : `W${topCurrentChain?.currentChain || 0}`,
          (topCurrentChain?.currentChain || 0) < 0 ? "text-red-500" : "text-orange-500",
          Flame,
          "bg-orange-500/10 text-orange-500"
        )}

        {renderTopPerformerCard(
          "Most Wins",
          topWins,
          (topWins?.stats?.wins || 0).toString(),
          "text-green-500",
          CheckCircle2,
          "bg-green-500/10 text-green-500"
        )}

        {renderTopPerformerCard(
          "Longest Chain",
          topBestChain,
          `W${topBestChain?.bestChain || 0}`,
          "text-yellow-500",
          Medal,
          "bg-yellow-500/10 text-yellow-500"
        )}

        {renderTopPerformerCard(
          "Best Win %",
          topWinRate,
          `${topWinRate?.winRate?.toFixed(1) || 0}%`,
          "text-cyan-500",
          Percent,
          "bg-cyan-500/10 text-cyan-500"
        )}
      </div>

      {/* Main Table */}
      <div className="bg-[#121212] border border-zinc-800 rounded-2xl overflow-hidden">
        <div className="p-5 border-b border-zinc-800 flex items-center justify-between">
          <h2 className="text-lg font-bold text-zinc-200 flex items-center gap-2">
            <Users className="w-5 h-5 text-zinc-400" />
            Global Standings
          </h2>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm text-zinc-400">
            <thead className="bg-zinc-900/50 text-xs uppercase text-zinc-500 border-b border-zinc-800">
              <tr>
                <th scope="col" className="px-6 py-4 font-bold">Rank</th>
                <th scope="col" className="px-6 py-4 font-bold">Player</th>
                <th scope="col" className="px-6 py-4 font-bold text-center">Next Pick</th>
                <th scope="col" className="px-6 py-4 font-bold text-center">Wins</th>
                <th scope="col" className="px-6 py-4 font-bold text-center">Losses</th>
                <th scope="col" className="px-6 py-4 font-bold text-center">Win %</th>
                <th scope="col" className="px-6 py-4 font-bold text-center">Cur. Chain</th>
                <th scope="col" className="px-6 py-4 font-bold text-center">Best Chain</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-800/50">
              {loading ? (
                <tr>
                  <td colSpan={8} className="px-6 py-12 text-center text-zinc-500">
                    <div className="flex justify-center mb-2">
                      <div className="w-6 h-6 border-2 border-[#22c55e] border-t-transparent rounded-full animate-spin"></div>
                    </div>
                    Loading leaderboards...
                  </td>
                </tr>
              ) : leaderboardData.length === 0 ? (
                <tr>
                  <td colSpan={8} className="px-6 py-12 text-center text-zinc-500">
                    No leaderboard data available yet.
                  </td>
                </tr>
              ) : (
                leaderboardData.map((player, index) => (
                  <tr key={player.id} className="hover:bg-zinc-800/30 transition-colors group">
                    <td className="px-6 py-4 whitespace-nowrap font-mono">
                      <div className={`w-8 h-8 rounded flex items-center justify-center font-bold text-sm ${
                        index === 0 ? 'bg-yellow-500/20 text-yellow-500 border border-yellow-500/30' :
                        index === 1 ? 'bg-zinc-300/20 text-zinc-300 border border-zinc-300/30' :
                        index === 2 ? 'bg-amber-700/20 text-amber-600 border border-amber-700/30' :
                        'text-zinc-500'
                      }`}>
                        {index + 1}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center gap-3">
                        <div className="relative">
                          {player.equippedCosmetics?.AVATAR_RING && (() => {
                            const ringImage = inventoryItems.find(i => i.id === player.equippedCosmetics.AVATAR_RING)?.image;
                            const RingComponent = AvatarRingMap[ringImage || ''];
                            if (!RingComponent) return null;
                            return (
                              <div className="absolute inset-0 z-0 transform scale-125 pointer-events-none rounded-full overflow-hidden">
                                <RingComponent isStatic={true} />
                              </div>
                            )
                          })()}
                          <div className={`w-8 h-8 rounded-full bg-zinc-800 flex items-center justify-center overflow-hidden border flex-shrink-0 relative z-10 ${player.equippedCosmetics?.AVATAR_RING ? 'border-transparent' : 'border-zinc-700'}`}>
                            {player.image ? (
                               <img loading="lazy"  src={player.image} alt={player.name} className="w-full h-full object-cover" />
                            ) : (
                              <span className="text-xs font-bold text-zinc-500">{(player.username || player.name || '?').charAt(0).toUpperCase()}</span>
                            )}
                          </div>
                        </div>
                        <div className="flex flex-col justify-center min-h-[32px]">
                           <div className="flex items-center gap-2 leading-none">
                             <span className="font-medium text-zinc-200">{player.username || player.name}</span>
                             {user?.uid === player.id && <span className="text-[10px] bg-green-500/20 text-green-400 px-1.5 py-0.5 rounded font-bold uppercase">You</span>}
                           </div>
                           {player.equippedCosmetics?.TITLE && (() => {
                             const titleItem = inventoryItems.find(i => i.id === player.equippedCosmetics.TITLE);
                             const titleImage = titleItem?.image;
                             const TitleComponent = TitleMap[titleImage || ''];
                             if (TitleComponent) {
                               return (
                                 <div className="mt-1 transform scale-75 origin-left">
                                    <TitleComponent isStatic={true} />
                                 </div>
                               )
                             }
                             if (titleItem) {
                               return (
                                 <div className="mt-1">
                                    <span className={`text-[10px] font-bold text-[#22c55e] px-1.5 py-0.5 rounded bg-black/40 border border-[#22c55e]/30 shadow-sm backdrop-blur-sm ${titleItem?.image || ''}`}>
                                       {titleItem?.name || 'Title'}
                                    </span>
                                 </div>
                               )
                             }
                             return null;
                           })()}
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-center">
                      <span className={cn(
                        "font-bold text-xs px-2 py-1 rounded bg-zinc-900/50 border border-zinc-800",
                        player.nextPickText === 'NO PICK' ? "text-zinc-500" :
                        player.nextPickText === 'PICK IN' ? "text-green-500 border-green-500/20 bg-green-500/10" :
                        "text-orange-400 border-orange-500/20 bg-orange-500/10"
                      )}>
                        {player.nextPickText || 'NO PICK'}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-center text-green-400 font-mono font-bold">{player.stats?.wins || 0}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-center text-red-400 font-mono font-bold">{player.stats?.losses || 0}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-center text-zinc-300 font-mono">{player.winRate?.toFixed(1) || 0}%</td>
                    <td className="px-6 py-4 whitespace-nowrap text-center">
                      <div className={cn("inline-flex items-center justify-center w-8 h-8 rounded-full font-mono font-bold border", (player.currentChain || 0) < 0 ? "bg-red-500/10 text-red-500 border-red-500/20" : "bg-orange-500/10 text-orange-400 border-orange-500/20")}>
                        {(player.currentChain || 0) < 0 ? `L${Math.abs(player.currentChain || 0)}` : `W${player.currentChain || 0}`}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-center text-yellow-400 font-mono font-bold">W{player.bestChain || 0}</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}