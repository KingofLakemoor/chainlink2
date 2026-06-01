import React, { useState, useEffect } from 'react';
import { useAuth } from '../../lib/auth-context';
import { db } from '../../lib/firebase';
import { collection, query, where, onSnapshot, getDocs, doc, setDoc, deleteDoc } from 'firebase/firestore';
import { Button } from '../../components/ui/button';
import { cn } from '../../lib/utils';
import { CheckCircle2 } from 'lucide-react';
import { MdOutlineSportsSoccer, MdOutlineSportsBasketball, MdOutlineSportsHockey, MdOutlineSportsBaseball, MdOutlineSportsTennis } from 'react-icons/md';
import { MatchupCard } from '../../components/ui/MatchupCard';
import { FirebaseImage } from '../../components/ui/FirebaseImage';

export default function PlayDashboard() {
  const { user, profile, chain } = useAuth();
  const [userPicks, setUserPicks] = useState<Record<string, any>>({});
  const [selectedSport, setSelectedSport] = useState<string | null>(null);
  const [filterType, setFilterType] = useState<'all' | 'available' | 'chain'>('all');
  const [sharingMatchupId, setSharingMatchupId] = useState<string | null>(null);

  const [allFetchedMatchups, setAllFetchedMatchups] = useState<any[]>([]);
  const [globalUpcomingPicks, setGlobalUpcomingPicks] = useState<any[]>([]);
  const [sponsors, setSponsors] = useState<any[]>([]);

  useEffect(() => {
    let unsubMatchups = () => {};

    const setupMatchups = () => {
      unsubMatchups = onSnapshot(collection(db, 'matchups'), (snap) => {
        if (snap.empty) {
          setAllFetchedMatchups([]);
        } else {
          const allMatchups = snap.docs.map(d => ({id: d.id, ...d.data()}));
          setAllFetchedMatchups(allMatchups);
        }
      });
    };


    let unsubPicks = () => {};
    let unsubGlobalPicks = () => {};
    let unsubSponsors = () => {};

    const setupPicksListeners = () => {
      if (user) {
        const q = query(collection(db, 'picks'), where('userId', '==', user.uid));
        unsubPicks = onSnapshot(q, (pickSnap) => {
          const picksInfo: Record<string, any> = {};
          pickSnap.docs.forEach(d => {
            const data = d.data();
            picksInfo[data.matchupId] = data;
          });
          setUserPicks(picksInfo);
        });
      } else {
        setUserPicks({});
      }

      // Fetch all pending picks for global hot rating
      const globalQ = query(collection(db, 'picks'), where('status', '==', 'PENDING'));
      unsubGlobalPicks = onSnapshot(globalQ, (globalPickSnap) => {
        const allUpcomingPicks = globalPickSnap.docs.map(d => d.data());
        setGlobalUpcomingPicks(allUpcomingPicks);
      });

      // Fetch active sponsors
      const sponsorsQ = query(collection(db, 'sponsors'), where('active', '==', true));
      unsubSponsors = onSnapshot(sponsorsQ, (snap) => {
        if (!snap.empty) {
          const activeSponsors = snap.docs.map(d => ({ id: d.id, ...d.data() }));
          setSponsors(activeSponsors);
        } else {
          setSponsors([]);
        }
      });
    };

    setupMatchups();
    setupPicksListeners();

    return () => {
      unsubMatchups();
      unsubPicks();
      unsubGlobalPicks();
      unsubSponsors();
    };
  }, [user]);


  const { totalUpcomingPicks, matchupPickCounts } = React.useMemo(() => {
    let total = 0;
    const counts: Record<string, { total: number, away: number, home: number }> = {};

    globalUpcomingPicks.forEach(p => {
      if (!counts[p.matchupId]) {
        counts[p.matchupId] = { total: 0, away: 0, home: 0 };
      }
      counts[p.matchupId].total += 1;

      const matchup = allFetchedMatchups.find(m => m.gameId === p.matchupId);
      if (matchup && matchup.status === 'STATUS_SCHEDULED') {
         total += 1;
      }

      if (matchup) {
        if (matchup.type === 'OVER_UNDER') {
          if (p.pick?.id === 'OVER') counts[p.matchupId].away += 1;
          else if (p.pick?.id === 'UNDER') counts[p.matchupId].home += 1;
        } else {
          if (p.pick?.id === matchup.awayTeam?.id) counts[p.matchupId].away += 1;
          else if (p.pick?.id === matchup.homeTeam?.id) counts[p.matchupId].home += 1;
        }
      }
    });

    return { totalUpcomingPicks: total, matchupPickCounts: counts };
  }, [globalUpcomingPicks, allFetchedMatchups]);

  const matchups = React.useMemo(() => {
    const now = Date.now();
    const next24Hours = now + 24 * 60 * 60 * 1000;

    const filtered = allFetchedMatchups.filter((m: any) => {
      if (m.abandoned) return false;
      if (m.active === false) return false;

      const isFinal = m.status === 'STATUS_FINAL' || m.statusDesc?.toLowerCase().includes('final');
      const isLive = m.status !== 'STATUS_SCHEDULED' && !isFinal && m.status !== 'STATUS_POSTPONED' && m.status !== 'STATUS_CANCELED';
      const isUpcomingWithin24Hours = m.status === 'STATUS_SCHEDULED' && m.startTime <= next24Hours && m.startTime > (now - 24 * 60 * 60 * 1000);

      if (!((isLive || isUpcomingWithin24Hours) && !isFinal)) return false;

      if (filterType === 'available' && m.status !== 'STATUS_SCHEDULED') return false;
      if (filterType === 'chain' && !m.featured) return false;

      if (selectedSport === 'SOCCER' && !['MLS', 'EPL', 'NWSL', 'FIFA', 'FRA', 'TUR', 'RPL', 'CHN'].includes(m.league)) return false;
      if (selectedSport === 'BASKETBALL' && !['NBA', 'MBB', 'WBB', 'WNBA'].includes(m.league)) return false;
      if (selectedSport === 'HOCKEY' && !['NHL'].includes(m.league)) return false;
      if (selectedSport === 'BASEBALL' && !['MLB', 'CBASE'].includes(m.league)) return false;
      if (selectedSport === 'TENNIS' && !['ATP', 'WTA'].includes(m.league)) return false;

      return true;
    });

    filtered.sort((a: any, b: any) => a.startTime - b.startTime);
    return filtered;
  }, [allFetchedMatchups, selectedSport, filterType]);

  const handleCancelPick = async (matchup: any) => {
    if (!user || !profile) return;

    if (matchup.status !== 'STATUS_SCHEDULED') {
      alert("This game has already started and cannot be cancelled.");
      return;
    }

    try {
      if (import.meta.env.DEV && (!db?.app?.options?.apiKey || db?.app?.options?.apiKey === 'MY_FIREBASE_API_KEY')) {
        setUserPicks(prev => {
          const newPicks = { ...prev };
          delete newPicks[matchup.gameId];
          return newPicks;
        });
        return;
      }

      const pickId = user.uid + "_" + matchup.gameId;
      await deleteDoc(doc(db, 'picks', pickId));
    } catch (error) {
      console.error("Failed to cancel pick", error);
      alert("Failed to cancel pick.");
    }
  };

  const handleMakePick = async (matchup: any, team: any) => {
    if (!user) {
        window.location.href = '/login';
        return;
    }
    if (!profile || !chain) return;

    if (matchup.status !== 'STATUS_SCHEDULED') {
        alert("This game has already started.");
        return;
    }

    const hasActivePickAnywhere = Object.values(userPicks).some((p: any) => p.status === 'PENDING');

    if (hasActivePickAnywhere && (!userPicks[matchup.gameId] || userPicks[matchup.gameId].status !== 'PENDING')) {
       alert("You already have an active pending pick.");
       return;
    }

    if (userPicks[matchup.gameId]) {
      return; // Already picked
    }

    try {
      const pickId = user.uid + "_" + matchup.gameId;
      const pickDoc = {
        userId: user.uid,
        matchupId: matchup.gameId,
        pick: {
          id: team.id,
          name: team.name,
          image: team.image
        },
        status: 'PENDING',
        links: matchup.cost ?? 0,
        active: true,
        createdAt: Date.now(),
        updatedAt: Date.now()
      };

      if (import.meta.env.DEV && (!db?.app?.options?.apiKey || db?.app?.options?.apiKey === 'MY_FIREBASE_API_KEY')) {
         setUserPicks(prev => ({ ...prev, [matchup.gameId]: pickDoc }));
         return;
      }

      await setDoc(doc(db, 'picks', pickId), pickDoc);
    } catch (error) {
      console.error("Failed to save pick", error);
      alert("Failed to save pick.");
    }
  };

  const handleShareMatchup = (matchupId: string) => {
    setSharingMatchupId(matchupId);
    setTimeout(async () => {
      const el = document.getElementById(`matchup-card-${matchupId}`);
      if (el) {
        try {
          const html2canvas = (await import('html2canvas')).default;
          const canvas = await html2canvas(el, {
              backgroundColor: '#0a0a0a',
              scale: 2,
              useCORS: true
          });
          const dataUrl = canvas.toDataURL('image/png');
          const link = document.createElement('a');
          link.download = `chainlink-matchup-${matchupId}.png`;
          link.href = dataUrl;
          link.click();
        } catch (error) {
          console.error("Failed to share matchup", error);
        }
      }
      setSharingMatchupId(null);
    }, 100);
  };

  const activePick = Object.values(userPicks).find((p: any) => p.status === 'PENDING');
  const activeMatchup = activePick ? allFetchedMatchups.find(m => m.gameId === activePick.matchupId) : null;
  const filteredMatchups = matchups.filter(m => !activePick || m.gameId !== activePick.matchupId);

  return (
    <div className="max-w-5xl mx-auto px-6 py-8">

      {activeMatchup && (
        <div className="mb-10 w-full relative group">
          <div className="text-center mb-6">
            <h2 className="text-xl font-bold text-zinc-100">My Pick</h2>
          </div>
          <div className="relative">
            <MatchupCard
              m={activeMatchup}
              user={user}
              pickData={userPicks[activeMatchup.gameId]}
              hasActivePickAnywhere={Object.values(userPicks).some((p: any) => p.status === 'PENDING')}
              mCounts={matchupPickCounts[activeMatchup.gameId]}
              sponsors={sponsors}
              onMakePick={handleMakePick}
              onCancelPick={handleCancelPick}
              onShareMatchup={handleShareMatchup}
              sharingMatchupId={sharingMatchupId}
              isMyPick={true}
            />
          </div>
        </div>
      )}

      <div className="flex items-center gap-4 mb-6 border-b border-zinc-800/80 pb-3 flex-wrap">
        <div className="flex items-center gap-1 bg-zinc-900/80 rounded-xl p-1 border border-zinc-800">
          <Button variant={filterType === 'all' ? "secondary" : "ghost"} onClick={() => setFilterType('all')} className={cn("rounded-lg px-6 h-9", filterType === 'all' ? "bg-zinc-800 hover:bg-zinc-700 text-zinc-100 border-none" : "text-zinc-400 hover:text-zinc-200")}>All</Button>
          <Button variant={filterType === 'available' ? "secondary" : "ghost"} onClick={() => setFilterType('available')} className={cn("rounded-lg px-6 h-9", filterType === 'available' ? "bg-zinc-800 hover:bg-zinc-700 text-zinc-100 border-none" : "text-zinc-400 hover:text-zinc-200")}>Available</Button>
          <Button variant={filterType === 'chain' ? "secondary" : "ghost"} onClick={() => setFilterType('chain')} className={cn("rounded-lg px-6 h-9", filterType === 'chain' ? "bg-zinc-800 hover:bg-zinc-700 text-zinc-100 border-none" : "text-zinc-400 hover:text-zinc-200")}>Chain Builder</Button>
        </div>

        <div className="flex items-center gap-1 bg-zinc-900/80 rounded-xl p-1 border border-zinc-800">
          <Button variant="ghost" onClick={() => setSelectedSport(null)} className={cn("rounded-lg px-4 h-9 font-medium", selectedSport === null ? "bg-zinc-950 text-zinc-100" : "text-zinc-400 hover:text-zinc-200")}>All</Button>
          <Button variant="ghost" onClick={() => setSelectedSport('SOCCER')} className={cn("rounded-lg px-3 h-9", selectedSport === 'SOCCER' ? "bg-zinc-950 text-zinc-100" : "text-zinc-400 hover:text-zinc-200")}><MdOutlineSportsSoccer className="w-5 h-5" /></Button>
          <Button variant="ghost" onClick={() => setSelectedSport('BASKETBALL')} className={cn("rounded-lg px-3 h-9", selectedSport === 'BASKETBALL' ? "bg-zinc-950 text-zinc-100" : "text-zinc-400 hover:text-zinc-200")}><MdOutlineSportsBasketball className="w-5 h-5" /></Button>
          <Button variant="ghost" onClick={() => setSelectedSport('HOCKEY')} className={cn("rounded-lg px-3 h-9", selectedSport === 'HOCKEY' ? "bg-zinc-950 text-zinc-100" : "text-zinc-400 hover:text-zinc-200")}><MdOutlineSportsHockey className="w-5 h-5" /></Button>
          <Button variant="ghost" onClick={() => setSelectedSport('BASEBALL')} className={cn("rounded-lg px-3 h-9", selectedSport === 'BASEBALL' ? "bg-zinc-950 text-zinc-100" : "text-zinc-400 hover:text-zinc-200")}><MdOutlineSportsBaseball className="w-5 h-5" /></Button>
          <Button variant="ghost" onClick={() => setSelectedSport('TENNIS')} className={cn("rounded-lg px-3 h-9", selectedSport === 'TENNIS' ? "bg-zinc-950 text-zinc-100" : "text-zinc-400 hover:text-zinc-200")}><MdOutlineSportsTennis className="w-5 h-5" /></Button>
        </div>
      </div>

      {matchups.length === 0 ? (
        <div className="text-center py-20 text-zinc-500">
          <CheckCircle2 className="w-12 h-12 mx-auto mb-4 opacity-50" />
          <p>No matchups available right now.</p>
          {profile?.role === "ADMIN" && (
            <p className="text-sm mt-2">Click "Admin: Sync ESPN Games" to fetch active schedules.</p>
          )}
        </div>
      ) : (
        <div className="grid lg:grid-cols-2 gap-5">
          {filteredMatchups.map((m, index) => (
            <React.Fragment key={m.gameId || index}>
              <MatchupCard
                m={m}
                user={user}
                pickData={userPicks[m.gameId]}
                hasActivePickAnywhere={Object.values(userPicks).some((p: any) => p.status === 'PENDING')}
                mCounts={matchupPickCounts[m.gameId]}
                sponsors={sponsors}
                onMakePick={handleMakePick}
                onCancelPick={handleCancelPick}
                onShareMatchup={handleShareMatchup}
                sharingMatchupId={sharingMatchupId}
                isMyPick={false}
              />
            </React.Fragment>
          ))}
        </div>
      )}

      {/* Sponsor Badges */}
      {sponsors.length > 0 && (
        <div className="pt-12 mt-12 mb-4 border-t border-zinc-800/50">
            <p className="text-center text-xs text-zinc-500 uppercase font-bold tracking-wider mb-6">Sponsored By</p>
            <div className="flex flex-wrap items-center justify-center gap-8 transition-all duration-300">
               {sponsors.sort((a, b) => (a.order || 0) - (b.order || 0)).map(sponsor => (
                 <a
                   key={sponsor.id}
                   href={sponsor.url ? (sponsor.url.startsWith('http') ? sponsor.url : `https://${sponsor.url}`) : '#'}
                   target="_blank"
                   rel="noopener noreferrer"
                   className="opacity-50 hover:opacity-100 transition-opacity flex items-center justify-center grayscale hover:grayscale-0"
                   title={sponsor.name}
                 >
                   {sponsor.image ? (
                     <FirebaseImage src={sponsor.image} fallback="/logo.png" alt={sponsor.name} className="h-16 md:h-24 object-contain" />
                   ) : (
                     <div className="text-zinc-400 font-bold text-lg font-display tracking-tight">{sponsor.name}</div>
                   )}
                 </a>
               ))}
            </div>
        </div>
      )}

      <div className="mt-8 mb-8 px-4 text-center text-[10px] text-zinc-600/40 max-w-4xl mx-auto leading-relaxed">
        <p>&copy; {new Date().getFullYear()} Club 602. All rights reserved.</p>
        <p className="mt-1">
          DISCLAIMER: This site is not affiliated, associated, authorized, endorsed by, or in any way officially connected with any network, team, league or its subsidiaries or its affiliates. All logos, brands, and other trademarks or images featured or referred to within this website are the property of their respective trademark holders.
        </p>
      </div>
    </div>
  );
}
