import React, { useState, useEffect } from 'react';
import { Grid, Clock, Trophy, Lock, X } from 'lucide-react';
import { collection, query, where, getDocs, orderBy, limit, doc, setDoc } from 'firebase/firestore';
import { db } from '../../lib/firebase';
import { MatchupCard } from '../../components/ui/MatchupCard';
import { onSnapshot } from 'firebase/firestore';
import { useAuth } from '../../lib/auth-context';

interface Link4SegmentTheme {
  primaryColor?: string;
  logoUrl?: string;
  sponsorName?: string;
  sponsorUrl?: string;
}

interface Link4LeaderboardPick {
  id: string;
  name?: string;
  sport?: string;
  status: 'PENDING' | 'WIN' | 'LOSS' | 'PUSH' | 'EMPTY' | 'CANCELLED';
}

interface Link4LeaderboardEntry {
  userId: string;
  username: string;
  avatarUrl: string;
  picks: Link4LeaderboardPick[];
  score: number;
  potentialScore: number;
  hasLoss: boolean;
}


interface Link4Pick {
  id: string;
  name: string;
  sport: string;
  startTime?: string;
}

export default function Link4Page() {
  const { user } = useAuth();
  const [activeSegmentId, setActiveSegmentId] = useState<string | null>(null);
  const [isLoadingSegment, setIsLoadingSegment] = useState(true);
  const [endTime, setEndTime] = useState<string>('');
  const [allowedSports, setAllowedSports] = useState<string[]>([]);
  const [theme, setTheme] = useState<Link4SegmentTheme>({});
  const [picks, setPicks] = useState<(Link4Pick | null)[]>([null, null, null, null]);
  const [timeLeft, setTimeLeft] = useState<{ days: number; hours: number; minutes: number; seconds: number } | null>(null);
  const [segmentCost, setSegmentCost] = useState(10);
  const [savedPicksCount, setSavedPicksCount] = useState(0);
  const [hasLoss, setHasLoss] = useState(false);

  const [leaderboardData, setLeaderboardData] = useState<Link4LeaderboardEntry[]>([]);
  const [hasSubmitted, setHasSubmitted] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const [isSelectingPick, setIsSelectingPick] = useState(false);
  const [allMatchups, setAllMatchups] = useState<any[]>([]);
  const [sponsors, setSponsors] = useState<any[]>([]);

  useEffect(() => {
    const unsubMatchups = onSnapshot(collection(db, 'matchups'), (snap) => {
      const matchups = snap.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      setAllMatchups(matchups);
    });

    const unsubSponsors = onSnapshot(collection(db, 'sponsors'), (snap) => {
        setSponsors(snap.docs.map(doc => ({id: doc.id, ...doc.data()})));
    });

    return () => {
      unsubMatchups();
      unsubSponsors();
    };
  }, []);

  useEffect(() => {
    const fetchActiveSegment = async () => {
      try {
        const now = new Date().toISOString();
        const segmentsRef = collection(db, 'link4Segments');

        const q = query(
          segmentsRef,
          where('endTime', '>', now),
          orderBy('endTime', 'asc'),
          limit(1)
        );

        const querySnapshot = await getDocs(q);

        if (!querySnapshot.empty) {
          // We found an upcoming or active segment based on end time
          const activeDoc = querySnapshot.docs[0];
          const activeSegment = activeDoc.data();

          // Only show it if it has actually started
          // If we want it to be visible before it starts, we could handle 'PENDING' vs 'ACTIVE' state
          // For now, we will just use it if the start time has passed.
          // Otherwise, we could show a "Starts In" countdown, but we'll stick to the current logic for simplicity.
          if (activeSegment.startTime && activeSegment.startTime > now) {
            // It hasn't started yet, we might want to hide picks or show a different countdown
            // We'll leave it as is to keep the countdown to end time, but it's noted.
          }

          setActiveSegmentId(activeDoc.id);
          if (activeSegment.endTime) setEndTime(activeSegment.endTime);
          if (activeSegment.allowedSports) setAllowedSports(activeSegment.allowedSports);
          if (activeSegment.theme) setTheme(activeSegment.theme);
          if (activeSegment.cost !== undefined) setSegmentCost(activeSegment.cost);
        }
      } catch (error) {
        console.error('Error fetching active Link4 segment:', error);
      } finally {
        setIsLoadingSegment(false);
      }
    };
    fetchActiveSegment();
  }, []);

  useEffect(() => {
    if (!user || !activeSegmentId) return;

    // Fetch user's picks if they exist
    const fetchUserPicks = async () => {
      try {
        const q = query(collection(db, 'link4Picks'), where('segmentId', '==', activeSegmentId), where('userId', '==', user.uid));
        const snap = await getDocs(q);
        if (!snap.empty) {
          const data = snap.docs[0].data();
          if (data.picks) {
             const userPicks = Array.isArray(data.picks) ? data.picks : Object.values(data.picks);

             // Check if user has loss
             if (data.hasLoss) {
               setHasLoss(true);
             }

             // Pad picks up to 4
             const paddedPicks = [...userPicks];
             while (paddedPicks.length < 4) paddedPicks.push(null);

             setPicks(paddedPicks as (Link4Pick | null)[]);
             setSavedPicksCount(userPicks.length);
             if (userPicks.length >= 4) {
                setHasSubmitted(true);
             }
          }
        }
      } catch (error) {
        console.error("Error fetching user Link4 picks:", error);
      }
    };
    fetchUserPicks();
  }, [user, activeSegmentId]);

  useEffect(() => {
    if (!activeSegmentId) return;

    // Listen to all picks for this segment to calculate the leaderboard
    const unsubPicks = onSnapshot(query(collection(db, 'link4Picks'), where('segmentId', '==', activeSegmentId)), async (snap) => {
        const allUserPicks = snap.docs.map(d => d.data());

        // Wait for allMatchups to be ready
        if (allMatchups.length === 0) return;

        const leaderboardEntries: Link4LeaderboardEntry[] = [];


        for (const userPickData of allUserPicks) {
           let score = 0;
           let potentialScore = 0;
           let hasLoss = userPickData.hasLoss === true;

           const rawPicks = Array.isArray(userPickData.picks) ? userPickData.picks : (userPickData.picks ? Object.values(userPickData.picks) : []);
           const processedPicks = rawPicks.map((pick: any) => {
              const pickMatchup = allMatchups.find(m => m.gameId === pick.id.replace('pick-', ''));
              let status = pick.status || 'PENDING';

              // If backend hasn't graded it yet, do a local calculation for display
              if (!pick.status || pick.status === 'PENDING') {
                if (!pickMatchup || pickMatchup.status === 'STATUS_SCHEDULED' || pickMatchup.status === 'STATUS_IN_PROGRESS') {
                   status = 'PENDING';
                } else if (pickMatchup.status === 'STATUS_FINAL') {
                   // Determine win/loss locally to update display instantly before grader runs
                   const homeScore = pickMatchup.homeTeam.score;
                   const awayScore = pickMatchup.awayTeam.score;
                   let won = false;
                   let isPush = false;

                   if (homeScore === awayScore) {
                      isPush = true;
                      status = 'PUSH';
                   } else {
                      const pickedHome = pick.name === pickMatchup.homeTeam.name;
                      if (pickedHome && homeScore > awayScore) won = true;
                      if (!pickedHome && awayScore > homeScore) won = true;
                      status = won ? 'WIN' : 'LOSS';
                   }

                   if (status === 'LOSS') {
                      hasLoss = true;
                   }
                }
              }

              if (status === 'WIN' && pickMatchup) {
                 // Add Moneyline logic for calculating score
                 const pickedHome = pick.name === pickMatchup.homeTeam.name;
                 const ml = pickedHome ? pickMatchup.metadata?.mlHome : pickMatchup.metadata?.mlAway;
                 if (ml !== undefined && ml !== null) {
                    score += ml;
                 }
              }

              return {
                 id: pick.id,
                 name: pick.name,
                 sport: pick.sport,
                 status
              };
           });

           // Pad to 4 for UI
           while (processedPicks.length < 4) processedPicks.push({ status: 'EMPTY' } as any);

           // Calculate potential score by assuming PENDING games are WINs
           processedPicks.forEach((pick: any) => {
              if (pick.status === 'PENDING') {
                 const pickMatchup = allMatchups.find(m => m.gameId === pick.id.replace('pick-', ''));
                 if (pickMatchup) {
                    const pickedHome = pick.name === pickMatchup.homeTeam.name;
                    const ml = pickedHome ? pickMatchup.metadata?.mlHome : pickMatchup.metadata?.mlAway;
                    if (ml !== undefined && ml !== null && ml > 0) {
                       potentialScore += ml;
                    } else if (ml !== undefined && ml !== null && ml < 0) {
                       potentialScore += ml;
                    }
                 }
              }
           });

           // If there is any loss, cancel the remaining pending picks locally for display
           if (hasLoss) {
              processedPicks.forEach((p: any) => {
                 if (p.status === 'PENDING') p.status = 'CANCELLED';
              });
              score = -99999;
           }

           leaderboardEntries.push({
              userId: userPickData.userId,
              username: userPickData.username,
              avatarUrl: userPickData.avatarUrl,
              picks: processedPicks,
              score,
              potentialScore: hasLoss ? -99999 : score + potentialScore,
              hasLoss
           });
        }

        // Sort Leaderboard: score descending, but keep losses at the bottom
        leaderboardEntries.sort((a, b) => {
           if (a.hasLoss && !b.hasLoss) return 1;
           if (!a.hasLoss && b.hasLoss) return -1;
           return b.score - a.score;
        });
        setLeaderboardData(leaderboardEntries);

    });

    return () => unsubPicks();
  }, [activeSegmentId, allMatchups]);

  useEffect(() => {
    if (!endTime) return;

    const calculateTimeLeft = () => {
      const difference = new Date(endTime).getTime() - new Date().getTime();
      if (difference > 0) {
        setTimeLeft({
          days: Math.floor(difference / (1000 * 60 * 60 * 24)),
          hours: Math.floor((difference / (1000 * 60 * 60)) % 24),
          minutes: Math.floor((difference / 1000 / 60) % 60),
          seconds: Math.floor((difference / 1000) % 60),
        });
      } else {
        setTimeLeft(null);
      }
    };

    calculateTimeLeft();
    const timer = setInterval(calculateTimeLeft, 1000);
    return () => clearInterval(timer);
  }, [endTime]);

  const clearPicks = () => {
    if (hasSubmitted || hasLoss) return;
    // Only clear the unsaved draft pick, keep saved ones
    const newPicks = [...picks];
    for(let i = savedPicksCount; i < 4; i++) {
        newPicks[i] = null;
    }
    setPicks(newPicks);
  };

  const nextPickIndex = picks.findIndex(p => p === null);
  // Unsaved pick count
  const unsavedPicksCount = picks.filter(p => p !== null).length - savedPicksCount;

  const handleSlotClick = (index: number) => {
    if (hasLoss) return;
    if (index === nextPickIndex) {
      setIsSelectingPick(true);
    }
  };

  const handleMakePick = (matchup: any, team: any) => {
    if (nextPickIndex === -1 || hasSubmitted || hasLoss) return;

    const newPicks = [...picks];
    newPicks[nextPickIndex] = {
      id: `pick-${matchup.gameId}`,
      name: team.name,
      sport: matchup.league,
      startTime: matchup.startTime,
    };
    setPicks(newPicks);
    setIsSelectingPick(false);
  };

  const handleSubmitPicks = async () => {
    if (!user || !activeSegmentId) return;
    if (unsavedPicksCount === 0) return;

    setIsSubmitting(true);
    try {
      const idToken = await user.getIdToken();
      const response = await fetch('/api/link4/submit', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${idToken}`
        },
        body: JSON.stringify({
          segmentId: activeSegmentId,
          picks: picks,
          username: (user as any).username || 'Anonymous',
          avatarUrl: (user as any).avatarUrl || `https://api.dicebear.com/7.x/avataaars/svg?seed=${user.uid}`
        })
      });

      const data = await response.json();
      if (!response.ok || !data.success) {
        throw new Error(data.error || 'Failed to submit picks');
      }

      setSavedPicksCount(picks.filter(p => p !== null).length);
      if (picks.filter(p => p !== null).length >= 4) {
         setHasSubmitted(true);
      }
    } catch (error: any) {
      console.error('Error submitting Link4 picks:', error);
      alert(error.message || 'Failed to submit picks. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const availableMatchups = allMatchups.filter(m => {
    if (m.metadata?.mlHome === undefined || m.metadata?.mlHome === null || m.metadata?.mlAway === undefined || m.metadata?.mlAway === null) return false;
    if (allowedSports.length > 0 && !allowedSports.includes(m.league)) return false;
    if (m.status !== 'STATUS_SCHEDULED') return false;

    if (nextPickIndex > 0 && picks[nextPickIndex - 1]) {
      const prevPick = picks[nextPickIndex - 1];
      if (prevPick?.startTime && m.startTime) {
        if (new Date(m.startTime).getTime() <= new Date(prevPick.startTime).getTime()) {
          return false;
        }
      }
    }

    return true;
  });

  if (isLoadingSegment) {
    return (
      <div className="flex-1 p-6 md:p-8 w-full pt-20 md:pt-8 flex items-center justify-center">
        <div className="text-zinc-500 font-bold text-xl animate-pulse">Loading Link4...</div>
      </div>
    );
  }

  if (!activeSegmentId) {
    return (
      <div className="flex-1 p-6 md:p-8 w-full pt-20 md:pt-8 flex items-center justify-center">
        <div className="bg-[#1a1a1a] border border-[#27272a] rounded-xl p-8 max-w-md w-full text-center">
          <Grid className="w-12 h-12 mx-auto mb-4 text-zinc-600" />
          <h2 className="text-2xl font-bold text-white mb-2 uppercase tracking-tight">Link4</h2>
          <p className="text-zinc-400 font-medium">Next segment coming soon</p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex-1 p-6 md:p-8 w-full pt-20 md:pt-8 overflow-hidden">
      <div className="mb-8 max-w-5xl mx-auto flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl md:text-4xl font-display font-black text-white mb-2 uppercase tracking-tight flex items-center gap-3">
            {theme.logoUrl ? (
              <img src={theme.logoUrl} alt="Link4 Logo" className="w-10 h-10 object-contain" loading="lazy" />
            ) : (
              <Grid className="w-8 h-8" style={{ color: theme.primaryColor || '#22c55e' }} />
            )}
            Link4
          </h1>
          <p className="text-zinc-400 text-lg">
            Connect four to win! Play Link4 and earn links. Entry: {segmentCost} links.
            {theme.sponsorName && (
              <span className="block mt-1 text-sm">
                Presented by{' '}
                {theme.sponsorUrl ? (
                  <a href={theme.sponsorUrl} target="_blank" rel="noopener noreferrer" className="font-bold underline hover:opacity-80" style={{ color: theme.primaryColor || '#22c55e' }}>
                    {theme.sponsorName}
                  </a>
                ) : (
                  <span className="font-bold" style={{ color: theme.primaryColor || '#22c55e' }}>{theme.sponsorName}</span>
                )}
              </span>
            )}
          </p>
        </div>

        {/* Countdown Timer */}
        {endTime && (
          <div className="bg-[#1a1a1a] border border-[#27272a] rounded-xl p-4 flex items-center gap-4">
            <div className="flex items-center gap-2 text-green-500">
              <Clock className="w-5 h-5 animate-pulse" />
              <span className="font-bold uppercase text-sm">Ends In:</span>
            </div>
            {timeLeft ? (
              <div className="flex gap-3 text-center">
                <div className="flex flex-col">
                  <span className="text-xl font-black text-white">{timeLeft.days}</span>
                  <span className="text-[10px] text-zinc-500 font-bold uppercase">Days</span>
                </div>
                <span className="text-zinc-600 font-bold text-xl">:</span>
                <div className="flex flex-col">
                  <span className="text-xl font-black text-white">{timeLeft.hours.toString().padStart(2, '0')}</span>
                  <span className="text-[10px] text-zinc-500 font-bold uppercase">Hrs</span>
                </div>
                <span className="text-zinc-600 font-bold text-xl">:</span>
                <div className="flex flex-col">
                  <span className="text-xl font-black text-white">{timeLeft.minutes.toString().padStart(2, '0')}</span>
                  <span className="text-[10px] text-zinc-500 font-bold uppercase">Min</span>
                </div>
                <span className="text-zinc-600 font-bold text-xl">:</span>
                <div className="flex flex-col">
                  <span className="text-xl font-black text-white">{timeLeft.seconds.toString().padStart(2, '0')}</span>
                  <span className="text-[10px] text-zinc-500 font-bold uppercase">Sec</span>
                </div>
              </div>
            ) : (
              <span className="text-red-500 font-bold">EXPIRED</span>
            )}
          </div>
        )}
      </div>

      <div className="max-w-5xl mx-auto space-y-6">
        {/* Allowed Sports Banner */}
        {allowedSports.length > 0 && (
          <div className="bg-[#1a1a1a] border border-[#27272a] rounded-xl p-4">
            <h3 className="text-sm font-bold text-zinc-400 uppercase tracking-wider mb-3">Allowed Sports for this Link4</h3>
            <div className="flex flex-wrap gap-2">
              {allowedSports.map(sport => (
                <span key={sport} className="px-3 py-1 bg-green-500/10 border border-green-500/30 text-green-400 rounded-lg text-sm font-bold">
                  {sport}
                </span>
              ))}
            </div>
          </div>
        )}

        {/* Link4 Boxes */}
        <div className="bg-[#1a1a1a] border border-[#27272a] rounded-xl p-6 md:p-8">
          <div className="flex justify-between items-center mb-6">
            <h2 className="text-xl font-bold text-white flex items-center gap-2">
              <Trophy className="w-5 h-5 text-yellow-500" />
              Your 4 Picks
            </h2>
            <div className="flex gap-2">
              <button
                onClick={clearPicks}
                className="px-3 py-1.5 bg-red-500/10 hover:bg-red-500/20 text-red-500 text-sm font-medium rounded-lg transition-colors"
              >
                Clear
              </button>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            {picks.map((pick, index) => {
              const isActive = index === nextPickIndex;
              const isLocked = index > nextPickIndex && nextPickIndex !== -1;
              const isFilled = pick !== null;

              return (
                <div
                  key={index}
                  onClick={() => handleSlotClick(index)}
                  className={`
                    relative aspect-square md:aspect-auto md:h-48 rounded-xl border-2 flex flex-col items-center justify-center p-4 transition-all
                    ${isActive ? 'border-green-500 bg-green-500/5 shadow-[0_0_15px_rgba(34,197,94,0.1)] scale-[1.02] cursor-pointer' : ''}
                    ${isLocked ? 'border-zinc-800 bg-[#121212] opacity-50' : ''}
                    ${isFilled ? 'border-[#27272a] bg-[#121212]' : ''}
                    ${!isActive && !isLocked && !isFilled ? 'border-dashed border-zinc-700 bg-[#1a1a1a]' : ''}
                  `}
                >
                  {/* Slot Number */}
                  <div className={`absolute top-3 left-3 w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold ${
                    isFilled ? 'bg-zinc-800 text-zinc-400' :
                    isActive ? 'bg-green-500 text-green-950' :
                    'bg-zinc-800 text-zinc-600'
                  }`}>
                    {index + 1}
                  </div>

                  {isFilled ? (
                    <div className="text-center w-full">
                      <div className="inline-block px-2 py-1 bg-zinc-800 text-zinc-300 text-xs font-bold rounded mb-2">
                        {pick.sport}
                      </div>
                      <h3 className="font-bold text-white text-lg break-words">{pick.name}</h3>
                    </div>
                  ) : isActive ? (
                    <div className="text-center">
                      <div className="w-12 h-12 rounded-full bg-green-500/20 text-green-500 flex items-center justify-center mx-auto mb-3">
                        <Grid className="w-6 h-6" />
                      </div>
                      <p className="text-sm font-medium text-green-400">Select Pick {index + 1}</p>
                    </div>
                  ) : (
                    <div className="text-center opacity-50">
                      <div className="w-12 h-12 rounded-full bg-zinc-800 text-zinc-600 flex items-center justify-center mx-auto mb-3">
                        <Grid className="w-6 h-6" />
                      </div>
                      <p className="text-sm font-medium text-zinc-500">Locked</p>
                    </div>
                  )}
                </div>
              );
            })}
          </div>


          {savedPicksCount > 0 && savedPicksCount < 4 && !hasLoss && unsavedPicksCount === 0 && (
            <div className="mt-8 p-4 bg-blue-500/10 border border-blue-500/30 rounded-xl text-center">
              <h3 className="text-lg font-bold text-white mb-2">Picks Saved!</h3>
              <p className="text-blue-400">You can make the rest of your picks now, or come back any time before the segment ends.</p>
            </div>
          )}

          {unsavedPicksCount > 0 && !hasLoss && (
            <div className="mt-8 p-4 bg-zinc-900 border border-zinc-800 rounded-xl text-center">
              <h3 className="text-lg font-bold text-white mb-2">Ready to Submit?</h3>
              <p className="text-zinc-400 mb-4">Once you submit, your pick is locked for this Link4 segment.</p>
              <button
                onClick={handleSubmitPicks}
                disabled={isSubmitting}
                className="px-6 py-2 bg-green-500 hover:bg-green-600 disabled:opacity-50 text-white font-bold rounded-lg transition-colors"
              >
                {isSubmitting ? 'Submitting...' : `Lock Pick ${picks.filter(p => p !== null).length} ${savedPicksCount === 0 ? `(Costs ${segmentCost} Links)` : ''}`}
              </button>
            </div>
          )}

          {hasSubmitted && !hasLoss && (
            <div className="mt-8 p-4 bg-green-500/10 border border-green-500/30 rounded-xl text-center">
              <Trophy className="w-8 h-8 text-yellow-500 mx-auto mb-2" />
              <h3 className="text-lg font-bold text-white">Picks Complete!</h3>
              <p className="text-zinc-400">Good luck! You've filled out your entire Link4 selection.</p>
            </div>
          )}

          {hasLoss && (
            <div className="mt-8 p-4 bg-red-500/10 border border-red-500/30 rounded-xl text-center">
              <X className="w-8 h-8 text-red-500 mx-auto mb-2" />
              <h3 className="text-lg font-bold text-white">Eliminated</h3>
              <p className="text-red-400">You lost a pick and have been eliminated from this segment.</p>
            </div>
          )}
        </div>

        {/* Game Selection Slide Down */}
        <div
          className="overflow-hidden transition-all duration-500 ease-in-out"
          style={{ maxHeight: isSelectingPick ? '5000px' : '0', opacity: isSelectingPick ? 1 : 0 }}
        >
          <div className="bg-[#1a1a1a] border border-[#27272a] rounded-xl p-6 md:p-8 mt-4">
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-xl font-bold text-white flex items-center gap-2">
                <Grid className="w-5 h-5 text-green-500" />
                Select Pick {nextPickIndex + 1}
              </h2>
              <button
                onClick={() => setIsSelectingPick(false)}
                className="text-zinc-400 hover:text-white"
              >
                Cancel
              </button>
            </div>

            <div className="grid lg:grid-cols-2 gap-5">
              {availableMatchups.map((m) => (
                <MatchupCard
                  key={m.gameId}
                  m={m}
                  user={user}
                  pickData={null}
                  hasActivePickAnywhere={false}
                  mCounts={{ total: 0, away: 0, home: 0 }}
                  sponsors={sponsors}
                  onMakePick={handleMakePick}
                  onCancelPick={() => {}}
                  onShareMatchup={() => {}}
                  sharingMatchupId={null}
                  isMyPick={false}
                  isLink4={true}
                />
              ))}
              {availableMatchups.length === 0 && (
                <div className="col-span-2 text-center py-12 text-zinc-500">
                  <p>No eligible matchups available right now.</p>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Leaderboard Section */}
        <div className="bg-[#1a1a1a] border border-[#27272a] rounded-xl p-6 md:p-8 mt-8">
          <div className="flex items-center gap-2 mb-6">
            <Trophy className="w-5 h-5 text-yellow-500" />
            <h2 className="text-xl font-bold text-white">Leaderboard</h2>
          </div>

          <div className="space-y-4">
            {leaderboardData.map((entry, index) => (
              <div key={entry.userId} className={`flex flex-col sm:flex-row items-center gap-4 p-4 rounded-xl border ${entry.hasLoss ? 'bg-[#121212] border-zinc-900 opacity-50 grayscale' : 'bg-[#121212] border-zinc-800'}`}>

                {/* Rank & User Info */}
                <div className="flex items-center gap-4 min-w-[200px] w-full sm:w-auto">
                  <div className="text-xl font-black text-zinc-500 w-8 text-center">#{index + 1}</div>
                  <div className="w-10 h-10 rounded-full bg-zinc-800 border-2 border-zinc-700 overflow-hidden shrink-0 relative">
                    <img src={entry.avatarUrl} alt={entry.username} className="w-full h-full object-cover" loading="lazy" />
                    {entry.hasLoss && (
                      <div className="absolute inset-0 bg-red-900/50 flex items-center justify-center backdrop-blur-[1px]">
                        <X className="w-8 h-8 text-red-500" strokeWidth={3} />
                      </div>
                    )}
                  </div>
                  <div className="font-bold text-white truncate">{entry.username}</div>
                </div>

                {/* Picks Row */}
                <div className="flex flex-1 justify-center sm:justify-start gap-2 sm:gap-4 w-full overflow-x-auto pb-2 sm:pb-0">
                  {entry.picks.map((pick, pIdx) => {
                    if (pick.status === 'EMPTY') {
                      return (
                        <div key={pIdx} className="w-16 h-16 sm:w-20 sm:h-20 rounded-lg border-2 border-dashed border-zinc-800 flex items-center justify-center bg-[#1a1a1a] shrink-0">
                          <Grid className="w-5 h-5 text-zinc-700" />
                        </div>
                      );
                    }

                    if (pick.status === 'PENDING') {
                      return (
                        <div key={pIdx} className="w-16 h-16 sm:w-20 sm:h-20 rounded-lg border-2 border-zinc-700 bg-zinc-800/50 flex flex-col items-center justify-center shrink-0">
                          <Lock className="w-4 h-4 text-zinc-500 mb-1" />
                          <span className="text-[10px] font-bold text-zinc-500 uppercase">Pick In</span>
                        </div>
                      );
                    }

                    if (pick.status === 'CANCELLED') {
                      return (
                        <div key={pIdx} className="w-16 h-16 sm:w-20 sm:h-20 rounded-lg border-2 border-red-500/20 bg-red-500/5 flex flex-col items-center justify-center p-1 text-center shrink-0 opacity-50">
                          <div className="text-[9px] sm:text-[10px] text-zinc-500 font-bold mb-0.5 truncate w-full px-1">{pick.sport}</div>
                          <div className="text-xs sm:text-sm font-bold truncate w-full px-1 line-through text-zinc-500">{pick.name}</div>
                        </div>
                      );
                    }

                    const isWin = pick.status === 'WIN';
                    const isLoss = pick.status === 'LOSS';

                    return (
                      <div key={pIdx} className={`w-16 h-16 sm:w-20 sm:h-20 rounded-lg border-2 flex flex-col items-center justify-center p-1 text-center shrink-0 ${
                        isWin ? 'border-green-500/50 bg-green-500/10' :
                        isLoss ? 'border-red-500/50 bg-red-500/10' :
                        'border-zinc-500/50 bg-zinc-500/10'
                      }`}>
                        <div className="text-[9px] sm:text-[10px] text-zinc-400 font-bold mb-0.5 truncate w-full px-1">{pick.sport}</div>
                        <div className={`text-xs sm:text-sm font-bold truncate w-full px-1 ${
                          isWin ? 'text-green-400' : isLoss ? 'text-red-400' : 'text-zinc-300'
                        }`}>{pick.name}</div>
                      </div>
                    );
                  })}
                </div>

                {/* Score Column */}
                <div className="flex flex-col items-end sm:items-center justify-center min-w-[80px] w-full sm:w-auto border-t sm:border-t-0 sm:border-l border-zinc-800 pt-3 sm:pt-0 sm:pl-4">
                  <div className="text-2xl font-black text-green-500">{entry.score}</div>
                  <div className="text-xs text-zinc-500 font-medium">Pot. {entry.potentialScore}</div>
                </div>

              </div>
            ))}
          </div>
        </div>

      </div>
    </div>
  );
}
