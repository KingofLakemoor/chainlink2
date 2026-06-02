import React, { useState, useEffect } from 'react';
import { useAuth } from '../../lib/auth-context';
import { db } from '../../lib/firebase';
import { collection, query, where, getDocs, onSnapshot, limit, startAfter, orderBy, DocumentData, QueryDocumentSnapshot } from 'firebase/firestore';
import { Link2 } from 'lucide-react';
import { cn } from '../../lib/utils';
import LifetimeStats from './LifetimeStats';

export default function MyPicksPage() {
  const { user, profile } = useAuth();
  const [picks, setPicks] = useState<any[]>([]);
  const [matchups, setMatchups] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'CURRENT_MONTH' | 'ALL_TIME'>('CURRENT_MONTH');

  // Pagination state for all-time picks
  const [lastVisiblePick, setLastVisiblePick] = useState<QueryDocumentSnapshot<DocumentData, DocumentData> | null>(null);
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const [hasMorePicks, setHasMorePicks] = useState(true);

  // Fetch picks based on current tab
  useEffect(() => {
    if (!user) return;

    const fetchPicks = async () => {
      setIsLoading(true);
      try {
        if (import.meta.env.DEV && (!db?.app?.options?.apiKey || db?.app?.options?.apiKey === 'MY_FIREBASE_API_KEY')) {
           setPicks([
             { id: '1', status: 'WIN', updatedAt: Date.now() - 22 * 60 * 60 * 1000, matchupId: 'mock-1', pick: { id: 'teamA', name: 'Phillies', image: 'https://via.placeholder.com/150' }, links: 10 },
             { id: '2', status: 'LOSS', updatedAt: Date.now() - 17 * 60 * 60 * 1000, matchupId: 'mock-3', pick: { id: 'teamF', name: 'Cubs', image: 'https://via.placeholder.com/150' }, links: 0 },
             { id: '3', status: 'PENDING', updatedAt: Date.now() - 2 * 60 * 60 * 1000, matchupId: 'mock-2', pick: { id: 'teamC', name: 'Spartak Moscow', image: 'https://via.placeholder.com/150' } },
           ]);
        } else {
          let q;
          if (activeTab === 'CURRENT_MONTH') {
             // For current month, fetch all to allow memory filtering
             q = query(collection(db, 'picks'), where('userId', '==', user.uid));
          } else {
             // For all time, fetch first 30 paginated
             q = query(
               collection(db, 'picks'),
               where('userId', '==', user.uid),
               orderBy('updatedAt', 'desc'),
               limit(30)
             );
          }
          const snap = await getDocs(q);
          const fetchedPicks = snap.docs.map(doc => ({ id: doc.id, ...(doc.data() as object) }));
          setPicks(fetchedPicks);

          if (activeTab === 'ALL_TIME') {
             if (snap.docs.length > 0) {
                setLastVisiblePick(snap.docs[snap.docs.length - 1]);
             }
             if (snap.docs.length < 30) {
                setHasMorePicks(false);
             }
          }
        }
      } catch (e) {
        console.error("Error fetching picks", e);
      } finally {
        setIsLoading(false);
      }
    };
    fetchPicks();
  }, [user, activeTab]);

  // Fetch matchups globally
  useEffect(() => {
    if (!user) return;

    let unsubMatchups = () => {};
    if (import.meta.env.DEV && (!db?.app?.options?.apiKey || db?.app?.options?.apiKey === 'MY_FIREBASE_API_KEY')) {
         setMatchups([
            {
                id: 'mock-1', gameId: 'mock-1', title: 'Phillies @ Team B', startTime: Date.now() - 22 * 60 * 60 * 1000,
                homeTeam: { id: 'teamB', name: 'Team B', image: 'https://via.placeholder.com/150' },
                awayTeam: { id: 'teamA', name: 'Phillies', image: 'https://via.placeholder.com/150' }
            },
            {
                id: 'mock-2', gameId: 'mock-2', title: 'Spartak Moscow @ Team D', startTime: Date.now() + 2 * 60 * 60 * 1000,
                homeTeam: { id: 'teamD', name: 'Team D', image: 'https://via.placeholder.com/150' },
                awayTeam: { id: 'teamC', name: 'Spartak Moscow', image: 'https://via.placeholder.com/150' }
            },
            {
                id: 'mock-3', gameId: 'mock-3', title: 'Cubs @ Team E', startTime: Date.now() - 17 * 60 * 60 * 1000,
                homeTeam: { id: 'teamE', name: 'Team E', image: 'https://via.placeholder.com/150' },
                awayTeam: { id: 'teamF', name: 'Cubs', image: 'https://via.placeholder.com/150' }
            }
         ]);
    } else {
        unsubMatchups = onSnapshot(collection(db, 'matchups'), (snap) => {
          if (!snap.empty) {
             const allMatchups = snap.docs.map(d => ({id: d.id, ...d.data()}));
             setMatchups(allMatchups);
          }
        });
    }

    return () => {
      unsubMatchups();
    };
  }, [user]);

  const currentMonthPicks = React.useMemo(() => {
    const now = new Date();
    const currentMonthKey = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;

    return picks.filter(pick => {
       const matchup = matchups.find(m => m.gameId === pick.matchupId);
       const dateToUse = matchup?.startTime ? new Date(matchup.startTime) : new Date(pick.updatedAt || Date.now());
       const monthKey = `${dateToUse.getFullYear()}-${String(dateToUse.getMonth() + 1).padStart(2, '0')}`;
       return monthKey === currentMonthKey;
    }).sort((a, b) => {
       const matchupA = matchups.find(m => m.gameId === a.matchupId);
       const matchupB = matchups.find(m => m.gameId === b.matchupId);
       const dateA = matchupA?.startTime || a.updatedAt || 0;
       const dateB = matchupB?.startTime || b.updatedAt || 0;
       return dateB - dateA;
    });
  }, [picks, matchups]);


  const loadMorePicks = async () => {
    if (!user || !lastVisiblePick || isLoadingMore) return;
    setIsLoadingMore(true);
    try {
      const q = query(
        collection(db, 'picks'),
        where('userId', '==', user.uid),
        orderBy('updatedAt', 'desc'),
        startAfter(lastVisiblePick),
        limit(30)
      );
      const snap = await getDocs(q);
      const fetchedPicks = snap.docs.map(doc => ({ id: doc.id, ...(doc.data() as object) }));
      setPicks(prev => [...prev, ...fetchedPicks]);
      if (snap.docs.length > 0) {
        setLastVisiblePick(snap.docs[snap.docs.length - 1]);
      }
      if (snap.docs.length < 30) {
        setHasMorePicks(false);
      }
    } catch (e) {
      console.error("Error loading more picks", e);
    } finally {
      setIsLoadingMore(false);
    }
  };

  const displayedPicks = activeTab === 'CURRENT_MONTH' ? currentMonthPicks : picks;

  if (isLoading) {
    return <div className="p-8 text-center text-zinc-400">Loading My Picks...</div>;
  }

  return (
    <div className="max-w-5xl mx-auto px-6 py-8">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between mb-6 gap-4">
        <h1 className="text-2xl font-bold text-zinc-100 font-display">My Picks</h1>
        <div className="flex bg-zinc-900 rounded-lg p-1">
          <button
            onClick={() => setActiveTab('CURRENT_MONTH')}
            className={cn("px-4 py-1.5 text-sm font-medium rounded-md transition-colors", activeTab === 'CURRENT_MONTH' ? "bg-zinc-800 text-white" : "text-zinc-400 hover:text-zinc-200")}
          >
            Current Month
          </button>
          <button
            onClick={() => setActiveTab('ALL_TIME')}
            className={cn("px-4 py-1.5 text-sm font-medium rounded-md transition-colors", activeTab === 'ALL_TIME' ? "bg-zinc-800 text-white" : "text-zinc-400 hover:text-zinc-200")}
          >
            All Time (Lifetime)
          </button>
        </div>
      </div>

      {activeTab === 'ALL_TIME' && <LifetimeStats userStats={profile?.statsByLeague || {}} />}

      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 mt-8">
        {displayedPicks.length === 0 ? (
           <div className="col-span-full text-center py-20 text-zinc-500">
             <p>{activeTab === 'CURRENT_MONTH' ? "No picks found for this month." : "No picks found."}</p>
           </div>
        ) : (
          displayedPicks.map(pick => {
            const matchup = matchups.find(m => m.gameId === pick.matchupId);

            let statusColorClass = 'bg-[#121212] border-zinc-800';
            let statusTextColor = 'text-zinc-400';
            let statusText = pick.status;

            let displayTeamName = pick.pick?.name;
            let displayTeamImage = pick.pick?.image;

            if (!displayTeamName || !displayTeamImage) {
               if (matchup && matchup.awayTeam?.id === pick.pick?.id) {
                  displayTeamName = matchup.awayTeam.name;
                  displayTeamImage = matchup.awayTeam.image;
               } else if (matchup && matchup.homeTeam?.id === pick.pick?.id) {
                  displayTeamName = matchup.homeTeam.name;
                  displayTeamImage = matchup.homeTeam.image;
               } else {
                  displayTeamName = 'Unknown';
                  displayTeamImage = 'https://via.placeholder.com/150';
               }
            }

            if (pick.status === 'WIN') {
              statusColorClass = 'bg-green-950/20 border-green-900/50';
              statusTextColor = 'text-green-500';
            } else if (pick.status === 'LOSS') {
              statusColorClass = 'bg-red-950/20 border-red-900/50';
              statusTextColor = 'text-red-500';
            } else if (pick.status === 'PUSH') {
              statusColorClass = 'bg-zinc-900 border-zinc-700';
              statusTextColor = 'text-zinc-500';
            } else if (pick.status === 'PENDING') {
              statusColorClass = 'bg-blue-950/20 border-blue-900/50';
              statusTextColor = 'text-blue-400';
              statusText = 'In Progress';
            }

            return (
              <div key={pick.id} className={cn("rounded-xl border p-6 flex flex-col items-center justify-center gap-4 transition-colors", statusColorClass)}>
                <div className="text-base font-medium text-zinc-200 text-center">{displayTeamName}</div>
                <div className={cn("text-xs font-bold uppercase tracking-wider", statusTextColor)}>
                  {statusText}
                </div>

                <div className="w-20 h-20 flex items-center justify-center">
                  <img src={displayTeamImage} alt={displayTeamName} className="w-full h-full object-contain drop-shadow-md" loading="lazy" />
                </div>

                <div className="text-xs text-zinc-400 mt-2">
                  {matchup?.startTime
                    ? new Date(matchup.startTime).toLocaleDateString()
                    : (pick.updatedAt ? new Date(pick.updatedAt).toLocaleDateString() : 'Unknown date')}
                </div>

                {(pick.status === 'WIN' || pick.status === 'LOSS') && pick.links > 0 && (
                  <div className="flex items-center gap-1 bg-black/40 px-3 py-1 rounded-full mt-2">
                    <Link2 className={cn("w-3.5 h-3.5", pick.status === 'WIN' ? "text-green-500" : "text-zinc-600")} />
                    <span className={cn("text-xs font-bold", pick.status === 'WIN' ? "text-green-500" : "text-zinc-500")}>
                      {pick.status === 'WIN' ? `+${pick.links}` : '0'}
                    </span>
                  </div>
                )}
              </div>
            );
          })
        )}
      </div>

      {activeTab === 'ALL_TIME' && hasMorePicks && displayedPicks.length > 0 && (
        <div className="mt-8 flex justify-center">
          <button
            onClick={loadMorePicks}
            disabled={isLoadingMore}
            className="px-6 py-2 bg-zinc-800 hover:bg-zinc-700 text-white rounded-lg text-sm font-medium transition-colors disabled:opacity-50"
          >
            {isLoadingMore ? 'Loading...' : 'Load More Picks'}
          </button>
        </div>
      )}
    </div>
  );
}
