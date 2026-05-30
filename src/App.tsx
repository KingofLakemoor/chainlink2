import React, { useState, useEffect } from 'react';
import { BrowserRouter, Routes, Route, Navigate, useLocation, Link } from 'react-router-dom';
import { AuthProvider, useAuth } from './lib/auth-context';
import { loginWithGoogle, loginWithEmail, signupWithEmail, logout, db } from './lib/firebase';
import { collection, getDocs, doc, setDoc, deleteDoc, query, where, onSnapshot } from 'firebase/firestore';
import { Button } from './components/ui/button';
import { cn } from './lib/utils';
import { useNotifications } from './hooks/useNotifications';
import { useInstallPrompt } from './hooks/useInstallPrompt';
import { NotificationPrompt } from './components/ui/NotificationPrompt';
import {
  Link2, LayoutDashboard, User as UserIcon, PlayCircle, Layers, Trophy, Grid,
  ShoppingCart, CheckCircle2, Users, LogOut, ShieldAlert, Menu, X, Flame
} from 'lucide-react';
import {
  MdOutlineSportsSoccer, MdOutlineSportsBasketball, MdOutlineSportsHockey, MdOutlineSportsBaseball, MdOutlineSportsTennis
} from 'react-icons/md';
import { Download } from 'lucide-react';


const Sidebar = React.memo(function Sidebar({ open, setOpen }: { open: boolean, setOpen: (open: boolean) => void }) {
  const { user, profile } = useAuth();
  const location = useLocation();
  const { isInstallable, promptInstall } = useInstallPrompt();

  if (!user) return null;


  const NavItem = ({ icon: Icon, label, path }: { icon: any, label: string, path: string }) => {
    const active = location.pathname === path;
    return (
      <Link to={path} className={`flex items-center gap-3 px-3 py-2.5 rounded-lg cursor-pointer transition-colors ${active ? 'bg-[#22c55e]/10 text-[#22c55e] font-medium' : 'text-zinc-400 hover:bg-zinc-800/50 hover:text-zinc-200'}`}>
        <Icon className="w-5 h-5" />
        <span className="text-sm">{label}</span>
      </Link>
    );
  };

  return (
    <>
      {/* Mobile overlay */}
      {open && (
        <div className="fixed inset-0 bg-black/80 z-40 md:hidden" onClick={() => setOpen(false)} />
      )}

      {/* Sidebar */}
      <div className={cn(
        "fixed md:static inset-y-0 left-0 w-[240px] bg-[#121212] border-r border-[#27272a] z-50 flex flex-col transition-transform duration-300 ease-in-out md:translate-x-0",
        open ? "translate-x-0" : "-translate-x-full"
      )}>
        <div className="h-16 flex items-center justify-between px-6 border-b border-[#27272a] bg-[#121212] shrink-0">
          <div className="flex items-center gap-2">
            <Link2 className="w-6 h-6 text-[#22c55e]" />
            <span className="font-bold text-xl font-display text-zinc-100">ChainLink</span>
          </div>
          <button className="md:hidden text-zinc-400" onClick={() => setOpen(false)}>
            <X className="w-6 h-6" />
          </button>
        </div>

      <div className="flex-1 overflow-y-auto py-4 px-3 flex flex-col gap-1.5 custom-scrollbar">
        <NavItem icon={LayoutDashboard} label="Dashboard" path="/dashboard" />
        <NavItem icon={UserIcon} label="My Profile" path="/profile" />

        <div className="mt-6 mb-2 px-3 text-xs font-semibold text-zinc-500 uppercase tracking-wider">ChainLink</div>
        <NavItem icon={PlayCircle} label="Play ChainLink" path="/" />
        <NavItem icon={CheckCircle2} label="My Picks" path="/mypicks" />
        {/* <NavItem icon={Layers} label="Pick'em" path="/pickem" /> */}
        <NavItem icon={Trophy} label="Brackets" path="/brackets" />
        <NavItem icon={Trophy} label="Leaderboards" path="/leaderboards" />

        <NavItem icon={ShoppingCart} label="Link Shop" path="/shop" />

        {profile?.role === "ADMIN" && (
          <>
            <div className="mt-6 mb-2 px-3 text-xs font-semibold text-red-500/70 uppercase tracking-wider">Admin</div>
            <NavItem icon={ShieldAlert} label="Admin Console" path="/admin" />
          </>
        )}
      </div>

      <div className="p-4 mt-auto border-t border-[#27272a] space-y-2">
        {isInstallable && (
          <Button variant="outline" onClick={promptInstall} className="w-full justify-start bg-cyan-950/30 text-cyan-400 border-cyan-900/50 hover:bg-cyan-900/50 hover:text-cyan-300">
            <Download className="w-4 h-4 mr-2" /> Install App
          </Button>
        )}
        <Button variant="ghost" onClick={logout} className="w-full justify-start text-zinc-400 hover:text-zinc-200">
          <LogOut className="w-4 h-4 mr-2" /> Log Out
        </Button>
      </div>
      </div>
    </>
  );
});

function Landing() {
  const { user, loading } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [username, setUsername] = useState('');
  const [isSignUp, setIsSignUp] = useState(false);
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  // Check for referral code in URL
  const location = useLocation();
  const searchParams = new URLSearchParams(location.search);
  const referrerId = searchParams.get('ref') || undefined;

  // Auto-switch to sign up if referral code is present
  useEffect(() => {
    if (referrerId) {
      setIsSignUp(true);
    }
  }, [referrerId]);

  if (loading) return null;
  if (user) return <Navigate to="/" replace />;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setIsLoading(true);

    try {
      if (isSignUp) {
        await signupWithEmail(email, password, username, referrerId);
      } else {
        await loginWithEmail(email, password);
      }
    } catch (err: any) {
      setError(err.message || 'Authentication failed');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#0a0a0a] flex items-center justify-center p-4">
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-[#22c55e]/10 rounded-full blur-[128px]" />
        <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-cyan-500/10 rounded-full blur-[128px]" />
      </div>

      <div className="w-full max-w-md z-10">
        <div className="text-center mb-10">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-[#22c55e]/10 mb-6 border border-[#22c55e]/20 shadow-[0_0_30px_rgba(34,197,94,0.2)]">
            <Link2 className="w-8 h-8 text-[#22c55e]" />
          </div>
          <h1 className="text-4xl font-bold text-zinc-100 mb-3 font-display">ChainLink</h1>
          <p className="text-zinc-400 text-lg">Build your chain. Earn Links. Climb the ranks.</p>
        </div>

        <div className="bg-[#121212] border border-[#27272a] rounded-2xl p-8 shadow-xl">
          <form onSubmit={handleSubmit} className="space-y-4 mb-6">
            {error && (
              <div className="p-3 text-sm text-red-500 bg-red-500/10 border border-red-500/20 rounded-lg">
                {error}
              </div>
            )}

            {isSignUp && (
              <div>
                <label className="block text-sm font-medium text-zinc-400 mb-1.5">Username</label>
                <input
                  type="text"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  className="w-full bg-[#1a1a1a] border border-[#3f3f46] rounded-lg px-4 py-2.5 text-zinc-100 focus:outline-none focus:ring-2 focus:ring-[#22c55e]/50 focus:border-[#22c55e]"
                  placeholder="cooluser123"
                  required={isSignUp}
                />
              </div>
            )}

            <div>
              <label className="block text-sm font-medium text-zinc-400 mb-1.5">Email</label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full bg-[#1a1a1a] border border-[#3f3f46] rounded-lg px-4 py-2.5 text-zinc-100 focus:outline-none focus:ring-2 focus:ring-[#22c55e]/50 focus:border-[#22c55e]"
                placeholder="you@example.com"
                required
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-zinc-400 mb-1.5">Password</label>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full bg-[#1a1a1a] border border-[#3f3f46] rounded-lg px-4 py-2.5 text-zinc-100 focus:outline-none focus:ring-2 focus:ring-[#22c55e]/50 focus:border-[#22c55e]"
                placeholder="••••••••"
                required
              />
            </div>

            <Button type="submit" size="lg" className="w-full h-12 mt-2 font-bold shadow-[0_0_15px_rgba(34,197,94,0.2)]" disabled={isLoading}>
              {isLoading ? 'Processing...' : isSignUp ? 'Sign Up' : 'Login'}
            </Button>

            <div className="relative py-4">
              <div className="absolute inset-0 flex items-center">
                <div className="w-full border-t border-[#3f3f46]"></div>
              </div>
              <div className="relative flex justify-center text-sm">
                <span className="px-2 bg-[#121212] text-zinc-500">or</span>
              </div>
            </div>

          </form>

          <Button
            variant="outline"
            size="lg"
            className="w-full h-12 border-[#3f3f46] hover:bg-zinc-800/50 flex items-center justify-center gap-2"
            onClick={() => {
              if (referrerId) {
                // Store in local storage temporarily before redirect
                localStorage.setItem('chainlink_referrer_id', referrerId);
              }
              loginWithGoogle();
            }}
          >
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
               <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4" />
               <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853" />
               <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05" />
               <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335" />
            </svg>
            Continue with Google
          </Button>

          <p className="text-center text-sm text-zinc-400 mt-2">
            {isSignUp ? 'Already have an account?' : "Don't have an account?"}
            <button type="button" onClick={() => setIsSignUp(!isSignUp)} className="ml-1 text-[#22c55e] hover:underline font-medium">
              {isSignUp ? 'Login' : 'Sign up'}
            </button>
          </p>
        </div>

        {import.meta.env.DEV && (
          <div className="mt-8 text-center">
            <Button variant="ghost" className="text-zinc-500 hover:text-zinc-300" onClick={() => window.dispatchEvent(new Event('mock-login'))}>
               Bypass Auth (Dev Only)
            </Button>
          </div>
        )}
      </div>
    </div>
  );
}

import { MatchupCard } from './components/ui/MatchupCard';

function PlayDashboard() {
  const { user, profile, chain } = useAuth();
  const [userPicks, setUserPicks] = useState<Record<string, any>>({});
  const [selectedSport, setSelectedSport] = useState<string | null>(null);
  const [filterType, setFilterType] = useState<'all' | 'available' | 'chain'>('all');
  const [sharingMatchupId, setSharingMatchupId] = useState<string | null>(null);

  const [allFetchedMatchups, setAllFetchedMatchups] = useState<any[]>([]);
  const [globalUpcomingPicks, setGlobalUpcomingPicks] = useState<any[]>([]);
  const [sponsors, setSponsors] = useState<any[]>([]);

  useEffect(() => {
    if (!user) return;

    if (import.meta.env.DEV) {

       const mockMatchups = [
            {
                id: 'mock-1',
                gameId: 'mock-1',
                title: 'Who will win? Mock Team A @ Mock Team B',
                league: 'EPL',
                status: 'STATUS_SCHEDULED',
                startTime: Date.now() + 1000000,
                statusDesc: 'Upcoming',
                cost: 0,
                awayTeam: { id: 'teamA', name: 'Mock Team A', image: 'https://via.placeholder.com/150', score: 0 },
                homeTeam: { id: 'teamB', name: 'Mock Team B', image: 'https://via.placeholder.com/150', score: 0 },
                metadata: {}
            },
            {
                id: 'mock-live-1',
                title: 'Who will win? Mock Live Away @ Mock Live Home',
                league: 'EPL',
                status: 'STATUS_IN_PROGRESS',
                startTime: Date.now() - 3600000,
                statusDesc: 'In Progress',
                cost: 0,
                awayTeam: { id: 'liveA', name: 'Mock Live Away', image: 'https://via.placeholder.com/150', score: 1 },
                homeTeam: { id: 'liveH', name: 'Mock Live Home', image: 'https://via.placeholder.com/150', score: 2 },
                metadata: {}
            }
       ];

       const handleMockMatchups = (e: any) => {
          setAllFetchedMatchups(e.detail);
       };

       window.addEventListener('mock-matchups', handleMockMatchups);
       setAllFetchedMatchups(mockMatchups);
       setGlobalUpcomingPicks([
          { matchupId: 'mock-1', pick: { id: 'teamA' } },
          { matchupId: 'mock-1', pick: { id: 'teamA' } },
          { matchupId: 'mock-1', pick: { id: 'teamB' } },
       ]);

       return () => window.removeEventListener('mock-matchups', handleMockMatchups);
    }

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
                     <img src={sponsor.image} alt={sponsor.name} className="h-16 md:h-24 object-contain" loading="lazy" />
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


function TopStats() {
  const { user, profile, chain } = useAuth();

  if (!user) {
    return (
      <div className="flex items-center gap-2 md:gap-5">
        <Link to="/login" className="text-zinc-100 hover:text-zinc-300 font-medium">Sign in</Link>
      </div>
    );
  }

  return (
    <div className="flex items-center gap-2 md:gap-5">
      <div className="hidden md:flex items-center gap-1.5 text-sm">
         <Link2 className="w-4 h-4 text-cyan-400" />
         <span className="font-mono text-cyan-400 font-medium tracking-wide">{profile?.links?.toLocaleString() || 0}</span>
      </div>
      <div className="hidden md:block w-px h-4 bg-zinc-700"></div>
      <div className="flex items-center gap-2 md:gap-3 text-sm">
         <span className={cn("font-bold tracking-tight", (chain?.chain || 0) < 0 ? "text-red-500" : "text-[#22c55e]")}>
           {(chain?.chain || 0) < 0 ? `L${Math.abs(chain?.chain || 0)}` : `W${chain?.chain || 0}`}
         </span>
         <span className="text-zinc-400 font-mono text-xs tracking-wider">
           {profile?.stats?.wins || 0} - {profile?.stats?.losses || 0} - {profile?.stats?.pushes || 0}
         </span>
      </div>
      <div className="w-px h-4 bg-zinc-700"></div>
      <div className="w-8 h-8 rounded-full border border-zinc-700 overflow-hidden bg-zinc-800 shrink-0">
        <img src={profile?.image || `https://api.dicebear.com/7.x/avataaars/svg?seed=${profile?.id || 'guest'}`} className="w-full h-full object-cover" referrerPolicy="no-referrer" alt="Avatar" loading="lazy" />
      </div>
    </div>
  );
}

function MainLayout({ children }: { children: React.ReactNode }) {
  const { user } = useAuth();
  const location = useLocation();
  useNotifications();
  const [sidebarOpen, setSidebarOpen] = useState(false);

  useEffect(() => {
    setSidebarOpen(false);
  }, [location.pathname]);

  const pageTitle = {
    '/dashboard': 'Dashboard',
    '/': 'Play',
    '/profile': 'My Profile',
    '/pickem': "Pick'em",
    '/leaderboards': 'Leaderboards',
  }[location.pathname] || 'ChainLink';

  return (
    <div className="flex h-screen bg-[#0a0a0a] text-zinc-50 font-sans overflow-hidden">
       <Sidebar open={sidebarOpen} setOpen={setSidebarOpen} />
       <div className="flex-1 flex flex-col h-screen overflow-hidden w-full relative">
         <NotificationPrompt />
         {/* Mobile Header */}
         <div className="md:hidden h-16 border-b border-[#27272a] bg-[#121212]/80 backdrop-blur-xl flex items-center justify-between px-4 shrink-0 sticky top-0 z-30">
           <div className="flex items-center gap-2">
             {user && (
               <button className="p-2 text-zinc-400 border border-zinc-800 rounded-lg hover:bg-zinc-800/50 mr-1" onClick={() => setSidebarOpen(true)}>
                 <Menu className="w-5 h-5" />
               </button>
             )}
             {!user && <Link2 className="w-6 h-6 text-[#22c55e]" />}
             <span className="font-bold text-lg font-display text-zinc-100">{pageTitle}</span>
           </div>
           <div className="flex items-center gap-3"><div className="pointer-events-auto"><TopStats /></div></div>
         </div>

         {/* Desktop Header */}
         <div className="hidden md:flex h-20 items-center justify-between px-8 bg-gradient-to-b from-[#0a0a0a] to-transparent sticky top-0 z-30 pointer-events-none">
           <div className="pointer-events-auto flex items-center gap-3">
             <h1 className="text-2xl font-bold font-display text-zinc-100 tracking-tight">{pageTitle}</h1>
           </div>
           <div className="pointer-events-auto"><TopStats /></div>
         </div>

         <div className="flex-1 overflow-y-auto custom-scrollbar relative z-10 w-full max-w-full">
            {children}
         </div>
       </div>
    </div>
  );
}

function PlaceholderPage({ title }: { title: string }) {
  return (
    <div className="flex items-center justify-center h-full text-zinc-500 font-medium">
      {title} - Coming Soon
    </div>
  );
}

function PrivateRoute({ children }: { children: React.ReactNode }) {
  const { user, loading } = useAuth();
  if (loading) return null;
  return user ? <>{children}</> : <Navigate to="/login" />;
}

import AdminDashboard from './pages/admin/AdminDashboard';
import DashboardPage from './pages/dashboard/DashboardPage';
import ProfilePage from './pages/profile/ProfilePage';
import LeaderboardsPage from './pages/leaderboards/LeaderboardsPage';
import ShopPage from './pages/shop/ShopPage';
import MyPicksPage from './pages/mypicks/MyPicksPage';
import { BracketsPage } from './pages/brackets/BracketsPage';
import Link4Page from './pages/link4/Link4Page';
import PickEmPage from './pages/pickem/PickEmPage';
import SponsorPage from './pages/SponsorPage';
import ChallengesPage from './pages/challenges/ChallengesPage';

export default function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <Routes>
          <Route path="/login" element={<Landing />} />
          <Route path="/" element={<MainLayout><PlayDashboard /></MainLayout>} />
          <Route path="/admin/*" element={<AdminDashboard />} />
          <Route path="/dashboard" element={<PrivateRoute><MainLayout><DashboardPage /></MainLayout></PrivateRoute>} />
                    <Route path="/profile" element={<PrivateRoute><MainLayout><ProfilePage /></MainLayout></PrivateRoute>} />
          <Route path="/pickem" element={<PrivateRoute><MainLayout><PickEmPage /></MainLayout></PrivateRoute>} />
          <Route path="/pickem/:campaignId" element={<PrivateRoute><MainLayout><PickEmPage /></MainLayout></PrivateRoute>} />
          <Route path="/brackets" element={<PrivateRoute><MainLayout><BracketsPage /></MainLayout></PrivateRoute>} />
          <Route path="/brackets/:bracketId" element={<PrivateRoute><MainLayout><BracketsPage /></MainLayout></PrivateRoute>} />
          <Route path="/challenges" element={<PrivateRoute><MainLayout><ChallengesPage /></MainLayout></PrivateRoute>} />
          <Route path="/link4" element={<PrivateRoute><MainLayout><Link4Page /></MainLayout></PrivateRoute>} />
          <Route path="/squads" element={<PrivateRoute><MainLayout><PlaceholderPage title="Squads" /></MainLayout></PrivateRoute>} />
          <Route path="/mypicks" element={<PrivateRoute><MainLayout><MyPicksPage /></MainLayout></PrivateRoute>} />
          <Route path="/leaderboards" element={<PrivateRoute><MainLayout><LeaderboardsPage /></MainLayout></PrivateRoute>} />
          <Route path="/shop" element={<PrivateRoute><MainLayout><ShopPage /></MainLayout></PrivateRoute>} />
          <Route path="/games" element={<PrivateRoute><MainLayout><PlaceholderPage title="Games" /></MainLayout></PrivateRoute>} />
          <Route path="/sponsor" element={<SponsorPage />} />
          {/* Catch all route back to play */}
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </BrowserRouter>
    </AuthProvider>
  );
}
