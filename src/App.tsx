import React, { useState, useEffect } from 'react';
import { BrowserRouter, Routes, Route, Navigate, Link, useLocation } from 'react-router-dom';
import { AuthProvider, useAuth } from './lib/auth-context';
import { loginWithGoogle, loginWithEmail, signupWithEmail, logout, db } from './lib/firebase';
import { collection, getDocs, doc, setDoc, deleteDoc, query, where, onSnapshot } from 'firebase/firestore';
import { Button } from './components/ui/button';
import { cn } from './lib/utils';
import {
  Link2, LayoutDashboard, User as UserIcon, PlayCircle, Layers, Trophy,
  ShoppingCart, Gamepad2, Settings, Users, LogOut, ShieldAlert, Menu, X, Flame
} from 'lucide-react';
import {
  MdOutlineSportsSoccer, MdOutlineSportsBasketball, MdOutlineSportsHockey, MdOutlineSportsBaseball
} from 'react-icons/md';

function Sidebar({ open, setOpen }: { open: boolean; setOpen: (val: boolean) => void }) {
  const location = useLocation();
  const { profile } = useAuth();

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
        <div
          className="fixed inset-0 bg-black/60 z-40 md:hidden"
          onClick={() => setOpen(false)}
        />
      )}

      <div className={`fixed md:relative top-0 left-0 h-full z-50 w-64 border-r border-[#27272a] bg-[#121212] flex flex-col flex-shrink-0 transition-transform duration-300 ease-in-out ${open ? 'translate-x-0' : '-translate-x-full md:translate-x-0'}`}>
        <div className="h-[4.5rem] flex items-center justify-between px-6 border-b border-[#27272a]">
          <div className="font-display font-extrabold text-2xl text-[#22c55e] flex items-center gap-2 tracking-wide">
            <img src="/logo.png" alt="ChainLink" className="h-8 max-w-[120px] object-contain" onError={(e) => { e.currentTarget.style.display='none'; e.currentTarget.nextElementSibling?.classList.remove('hidden'); }} />
            <Link2 className="w-6 h-6 stroke-[2.5] hidden" />
            ChainLink
          </div>
          <button className="md:hidden text-zinc-400 hover:text-white" onClick={() => setOpen(false)}>
            <X className="w-6 h-6" />
          </button>
        </div>

      <div className="flex-1 overflow-y-auto py-4 px-3 flex flex-col gap-1.5 custom-scrollbar">
        <NavItem icon={LayoutDashboard} label="Dashboard" path="/dashboard" />
        <NavItem icon={UserIcon} label="My Profile" path="/profile" />

        <div className="mt-6 mb-2 px-3 text-xs font-semibold text-zinc-500 uppercase tracking-wider">ChainLink</div>
        <NavItem icon={PlayCircle} label="Play ChainLink" path="/play" />
        <NavItem icon={Layers} label="Pick'em" path="/pickem" />
        <NavItem icon={Users} label="Squads" path="/squads" />
        <NavItem icon={Trophy} label="Leaderboards" path="/leaderboards" />

        <div className="mt-6 mb-2 px-3 text-xs font-semibold text-zinc-500 uppercase tracking-wider">Other</div>
        <NavItem icon={ShoppingCart} label="Link Shop" path="/shop" />
        <NavItem icon={Gamepad2} label="Games" path="/games" />
        <NavItem icon={Settings} label="Settings" path="/settings" />

        {profile?.role === "ADMIN" && (
          <>
            <div className="mt-6 mb-2 px-3 text-xs font-semibold text-red-500/70 uppercase tracking-wider">Admin</div>
            <NavItem icon={ShieldAlert} label="Admin Console" path="/admin" />
          </>
        )}
      </div>

      <div className="p-4 mt-auto border-t border-[#27272a]">
        <Button variant="ghost" onClick={logout} className="w-full justify-start text-zinc-400 hover:text-zinc-200">
          <LogOut className="w-4 h-4 mr-2" /> Log Out
        </Button>
      </div>
      </div>
    </>
  );
}

function TopStats() {
  const { profile, chain } = useAuth();

  return (
    <div className="flex items-center gap-2 sm:gap-5">
      <div className="flex items-center gap-1.5 text-sm">
         <Link2 className="w-4 h-4 text-cyan-400" />
         <span className="font-mono text-cyan-400 font-medium tracking-wide">{profile?.coins?.toLocaleString() || 0}</span>
      </div>
      <div className="w-px h-4 bg-zinc-700"></div>
      <div className="flex items-center gap-3 text-sm">
         <span className="text-[#22c55e] font-bold tracking-tight">W{chain?.chain || 0}</span>
         <span className="hidden sm:inline text-zinc-400 font-mono text-xs tracking-wider">
           {profile?.stats?.wins || 0} - {profile?.stats?.losses || 0} - {profile?.stats?.pushes || 0}
         </span>
      </div>
      <div className="w-px h-4 bg-zinc-700"></div>
      <div className="w-8 h-8 rounded-full border border-zinc-700 overflow-hidden bg-zinc-800">
        <img src={profile?.image || `https://api.dicebear.com/7.x/avataaars/svg?seed=${profile?.id || 'guest'}`} className="w-full h-full object-cover" referrerPolicy="no-referrer" alt="Avatar" />
      </div>
    </div>
  );
}

function Landing() {
  const { user, loading } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [username, setUsername] = useState('');
  const [isSignUp, setIsSignUp] = useState(false);
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  if (loading) return null;
  if (user) return <Navigate to="/play" replace />;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setIsLoading(true);

    try {
      if (isSignUp) {
        await signupWithEmail(email, password, username);
      } else {
        await loginWithEmail(email, password);
      }
    } catch (err: any) {
      console.error(err);
      setError(err.message || 'An error occurred during authentication.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-[#0a0a0a] text-center px-4 relative z-10">
      <div className="flex items-center gap-4 text-[#22c55e] mb-8 animate-in slide-in-from-top-4 duration-500 fade-in">
        <img src="/logo.png" alt="ChainLink" className="h-14 max-w-[200px] object-contain drop-shadow-[0_0_15px_rgba(34,197,94,0.3)]" onError={(e) => { e.currentTarget.style.display='none'; e.currentTarget.nextElementSibling?.classList.remove('hidden'); }} />
        <Link2 className="w-14 h-14 stroke-[2.5] hidden" />
        <h1 className="font-display text-6xl font-extrabold tracking-wide">ChainLink</h1>
      </div>
      <p className="text-xl text-zinc-400 mb-10 max-w-2xl font-light">
        Build the highest chain of correct guesses to sports matchups and challenges. <br/>Wager your Links and climb the leaderboard.
      </p>

      <div className="w-full max-w-sm bg-[#121212] border border-[#27272a] rounded-xl p-6 shadow-xl z-20">
        <form onSubmit={handleSubmit} className="flex flex-col gap-4 text-left">
          {error && <div className="text-red-500 text-sm p-2 bg-red-500/10 rounded">{error}</div>}

          {isSignUp && (
            <div className="flex flex-col gap-1.5">
              <label className="text-xs font-medium text-zinc-400 uppercase tracking-wider">Username</label>
              <input
                type="text"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                className="bg-[#1a1a1a] border border-[#27272a] rounded-lg px-3 py-2 text-zinc-200 focus:outline-none focus:border-[#22c55e] focus:ring-1 focus:ring-[#22c55e] transition-all"
                required={isSignUp}
              />
            </div>
          )}

          <div className="flex flex-col gap-1.5">
            <label className="text-xs font-medium text-zinc-400 uppercase tracking-wider">Email</label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="bg-[#1a1a1a] border border-[#27272a] rounded-lg px-3 py-2 text-zinc-200 focus:outline-none focus:border-[#22c55e] focus:ring-1 focus:ring-[#22c55e] transition-all"
              required
            />
          </div>

          <div className="flex flex-col gap-1.5">
            <label className="text-xs font-medium text-zinc-400 uppercase tracking-wider">Password</label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="bg-[#1a1a1a] border border-[#27272a] rounded-lg px-3 py-2 text-zinc-200 focus:outline-none focus:border-[#22c55e] focus:ring-1 focus:ring-[#22c55e] transition-all"
              required
            />
          </div>

          <Button type="submit" size="lg" className="w-full h-12 mt-2 font-bold shadow-[0_0_15px_rgba(34,197,94,0.2)]" disabled={isLoading}>
            {isLoading ? 'Processing...' : isSignUp ? 'Sign Up' : 'Login'}
          </Button>

          <div className="relative flex items-center py-2">
             <div className="flex-grow border-t border-[#27272a]"></div>
             <span className="flex-shrink-0 mx-4 text-zinc-500 text-xs">OR</span>
             <div className="flex-grow border-t border-[#27272a]"></div>
          </div>

          <Button type="button" variant="outline" size="lg" className="w-full h-12 border-[#27272a] text-zinc-300 hover:bg-[#1a1a1a] hover:text-white" onClick={async (e) => {
            e.preventDefault();
            setError('');
            try {
              await loginWithGoogle();
            } catch (err: any) {
              setError(err.message || 'Google sign-in failed.');
            }
          }}>
            <svg className="w-5 h-5 mr-2" viewBox="0 0 24 24">
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
        </form>
      </div>

      {/* Visual embellishment */}
      <div className="absolute inset-0 max-w-full overflow-hidden pointer-events-none opacity-10 flex justify-center mt-32 z-0">
        <div className="w-full h-[500px] bg-[#22c55e] blur-[150px] rounded-full scale-150 translate-y-1/2"></div>
      </div>
    </div>
  );
}

const formatUpcomingTime = (startTime: number) => {
  const date = new Date(startTime);
  const now = new Date();

  const isToday = date.getDate() === now.getDate() &&
                  date.getMonth() === now.getMonth() &&
                  date.getFullYear() === now.getFullYear();

  const timeString = date.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' });

  if (isToday) {
    return timeString;
  } else {
    const dayString = date.toLocaleDateString([], { weekday: 'short' });
    return `${dayString} ${timeString}`;
  }
};

function PlayDashboard() {
  const { user, profile, chain } = useAuth();
  const [matchups, setMatchups] = useState<any[]>([]);
  const [userPicks, setUserPicks] = useState<Record<string, any>>({});
  const [selectedSport, setSelectedSport] = useState<string | null>(null);
  const [filterType, setFilterType] = useState<'all' | 'available' | 'chain'>('all');

  const [allFetchedMatchups, setAllFetchedMatchups] = useState<any[]>([]);
  const [globalUpcomingPicks, setGlobalUpcomingPicks] = useState<any[]>([]);

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
                awayTeam: { id: 'teamC', name: 'Mock Live Away', image: 'https://via.placeholder.com/150', score: 2 },
                homeTeam: { id: 'teamD', name: 'Mock Live Home', image: 'https://via.placeholder.com/150', score: 1 },
                metadata: {}
            }
        ];

       const handleMockMatchups = (e: any) => {
         if (e.detail && e.detail.matchups) {
           setAllFetchedMatchups(e.detail.matchups);
         }
       };
       window.addEventListener('mock-matchups', handleMockMatchups);

       setAllFetchedMatchups(mockMatchups);

       // Mock upcoming picks for hot rating visual
       setGlobalUpcomingPicks([
         { matchupId: 'mock-1', pick: { id: 'teamA' }, status: 'PENDING' },
         { matchupId: 'mock-1', pick: { id: 'teamA' }, status: 'PENDING' },
         { matchupId: 'mock-1', pick: { id: 'teamB' }, status: 'PENDING' }
       ]);

       return () => window.removeEventListener('mock-matchups', handleMockMatchups);
    }

    const setupMatchups = async () => {
      const snap = await getDocs(collection(db, 'matchups'));
      if (snap.empty) {
        setAllFetchedMatchups([]);
      } else {
        const allMatchups = snap.docs.map(d => ({id: d.id, ...d.data()}));
        setAllFetchedMatchups(allMatchups);
      }
    };


    let unsubPicks = () => {};
    let unsubGlobalPicks = () => {};

    const setupPicksListeners = () => {
      const q = query(collection(db, 'picks'), where('userId', '==', user.uid));
      unsubPicks = onSnapshot(q, (pickSnap) => {
        const picksInfo: Record<string, any> = {};
        pickSnap.docs.forEach(d => {
          const data = d.data();
          picksInfo[data.matchupId] = data;
        });
        setUserPicks(picksInfo);
      });

      // Fetch all pending picks for global hot rating
      const globalQ = query(collection(db, 'picks'), where('status', '==', 'PENDING'));
      unsubGlobalPicks = onSnapshot(globalQ, (globalPickSnap) => {
        const allUpcomingPicks = globalPickSnap.docs.map(d => d.data());
        setGlobalUpcomingPicks(allUpcomingPicks);
      });
    };

    setupMatchups();
    setupPicksListeners();

    return () => {
      unsubPicks();
      unsubGlobalPicks();
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

      if (matchup && p.pick?.id === matchup.awayTeam?.id) {
        counts[p.matchupId].away += 1;
      } else if (matchup && p.pick?.id === matchup.homeTeam?.id) {
        counts[p.matchupId].home += 1;
      }
    });

    return { totalUpcomingPicks: total, matchupPickCounts: counts };
  }, [globalUpcomingPicks, allFetchedMatchups]);

  useEffect(() => {
    const now = Date.now();
    const next24Hours = now + 24 * 60 * 60 * 1000;

    const filteredMatchups = allFetchedMatchups.filter((m: any) => {
      if (m.abandoned) return false;

      const isFinal = m.status === 'STATUS_FINAL' || m.statusDesc?.toLowerCase().includes('final');
      const isLive = m.status !== 'STATUS_SCHEDULED' && !isFinal && m.status !== 'STATUS_POSTPONED' && m.status !== 'STATUS_CANCELED';
      const isUpcomingWithin24Hours = m.status === 'STATUS_SCHEDULED' && m.startTime <= next24Hours && m.startTime > (now - 24 * 60 * 60 * 1000);

      if (!((isLive || isUpcomingWithin24Hours) && !isFinal)) return false;

      if (filterType === 'available' && m.status !== 'STATUS_SCHEDULED') return false;

      if (selectedSport === 'SOCCER' && !['MLS', 'EPL', 'NWSL'].includes(m.league)) return false;
      if (selectedSport === 'BASKETBALL' && !['NBA', 'MBB', 'WBB', 'WNBA'].includes(m.league)) return false;
      if (selectedSport === 'HOCKEY' && !['NHL'].includes(m.league)) return false;
      if (selectedSport === 'BASEBALL' && !['MLB'].includes(m.league)) return false;

      return true;
    });

    filteredMatchups.sort((a: any, b: any) => a.startTime - b.startTime);

    setMatchups(filteredMatchups);
  }, [allFetchedMatchups, selectedSport, filterType]);

  const handleCancelPick = async (matchup: any) => {
    if (!user || !profile) return;
    try {
      const pickId = user.uid + "_" + matchup.gameId;

      if (import.meta.env.DEV && !user.getIdToken) {
          // Mock local flow
          try {
            await deleteDoc(doc(db, 'picks', pickId));
          } catch (e) {
            console.warn("Mock local flow: Failed to delete from Firestore. Skipping...");
          }
          const updatedPicks = { ...userPicks };
          delete updatedPicks[matchup.gameId];
          setUserPicks(updatedPicks);
          return;
      }

      const idToken = await user.getIdToken();
      const res = await fetch('/api/picks/cancel-pick', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${idToken}`
        },
        body: JSON.stringify({ matchupId: matchup.gameId })
      });
      const contentType = res.headers.get("content-type");
      if (!contentType || !contentType.includes("application/json")) {
        throw new Error("Server returned an invalid response. The backend API may not be running.");
      }
      const data = await res.json();
      if (!data.success) throw new Error(data.error);

      // Successfully removed by backend, real-time listener will update local state,
      // but we enthusiastically update locally
      const updatedPicks = { ...userPicks };
      delete updatedPicks[matchup.gameId];
      setUserPicks(updatedPicks);

    } catch (e) {
      console.error(e);
      alert("Failed to cancel pick.");
    }
  };

  const handleMakePick = async (matchup: any, team: any) => {
    if (!user || !profile) return;

    const hasActivePick = Object.values(userPicks).some((p: any) => p.status === 'PENDING');
    if (hasActivePick) {
      alert("You already have an active pick! Wait for it to finish before making another.");
      return;
    }

    const matchCost = matchup.cost ?? 0;
    if (profile.coins < matchCost) {
      alert("Not enough links!");
      return;
    }
    try {
      const pickId = user.uid + "_" + matchup.gameId;
      const pickDoc = {
        userId: user.uid,
        matchupId: matchup.gameId,
        pick: {
          id: team.id,
          name: team.name,
          image: team.image || ""
        },
        status: 'PENDING',
        coins: matchCost,
        active: true,
        createdAt: Date.now(),
        updatedAt: Date.now()
      };

      if (import.meta.env.DEV && !user.getIdToken) {
          // Mock local flow
          try {
            await setDoc(doc(db, 'picks', pickId), pickDoc);
          } catch (e) {
            console.warn("Mock local flow: Failed to save to Firestore. Skipping...");
          }
          setUserPicks(prev => ({...prev, [matchup.gameId]: pickDoc}));
          return;
      }

      const idToken = await user.getIdToken();
      const res = await fetch('/api/picks/make-pick', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${idToken}`
        },
        body: JSON.stringify({ matchupId: matchup.gameId, team: { id: team.id, name: team.name, image: team.image || "" } })
      });
      const contentType = res.headers.get("content-type");
      if (!contentType || !contentType.includes("application/json")) {
        throw new Error("Server returned an invalid response. The backend API may not be running.");
      }
      const data = await res.json();
      if (!data.success) throw new Error(data.error);

      // Successfully saved by backend, real-time listener will update local state,
      // but we can enthusiastically update locally if we want, or just wait for the listener.
      setUserPicks(prev => ({...prev, [matchup.gameId]: pickDoc}));

    } catch (e) {
      console.error(e);
      alert("Failed to save pick. Ensure your rules allow this write. Error: " + e.message);
    }
  };

  const renderMatchupCard = (m: any, isMyPick: boolean = false) => {
    const hasActivePickAnywhere = Object.values(userPicks).some((p: any) => p.status === 'PENDING');
    const hasPicked = !!userPicks[m.gameId];
    const pickData = userPicks[m.gameId];
    const isPickDisabled = hasPicked || hasActivePickAnywhere;

    const mCounts = matchupPickCounts[m.gameId] || { total: 0, away: 0, home: 0 };
    const awayHotPct = mCounts.total > 0 ? Math.round((mCounts.away / mCounts.total) * 100) : 0;
    const homeHotPct = mCounts.total > 0 ? Math.round((mCounts.home / mCounts.total) * 100) : 0;
    const isScheduled = m.status === 'STATUS_SCHEDULED';

    return (
      <div key={isMyPick ? `my-pick-${m.gameId}` : m.gameId} className="bg-[#131415] border border-[#27272a] rounded-xl overflow-hidden hover:border-zinc-700 transition-colors shadow-sm relative group">
        {/* Header info */}
        <div className="bg-[#161d2b] px-4 py-2 border-b border-[#27272a] flex justify-between items-center bg-gradient-to-r from-[#111f38] to-[#121212]">
          <div className="flex items-center gap-2 font-bold text-sm text-zinc-200 tracking-tight">
             <Trophy className="w-3.5 h-3.5" /> {m.league}
          </div>
          <div className="flex flex-col items-end">
            {m.status !== 'STATUS_SCHEDULED' && m.statusDesc !== 'Upcoming' && <span className="text-[10px] text-zinc-500 uppercase">last update:</span>}
            <span className="text-xs text-zinc-300 font-medium">
              {m.status === 'STATUS_SCHEDULED' ? formatUpcomingTime(m.startTime) : (m.statusDesc || 'Upcoming')}
            </span>
          </div>
        </div>

        {/* Matchup content */}
        <div className="p-5">
          <div className="text-base font-bold text-zinc-100 mb-6">{m.title}</div>

          <div className="flex items-center justify-between">
             <div className="flex flex-col items-center gap-3 w-[120px]">
               <span className="text-sm font-semibold text-zinc-200">{m.awayTeam.name}</span>
               <div className="relative">
                 <button
                   disabled={isPickDisabled}
                   onClick={() => !isPickDisabled && handleMakePick(m, m.awayTeam)}
                   className={cn("w-20 h-20 rounded-xl border flex items-center justify-center p-2 bg-[#1a1a1a] transition-all", pickData?.pick?.id === m.awayTeam.id ? 'border-[#22c55e] shadow-[0_0_15px_rgba(34,197,94,0.2)]' : (!isPickDisabled ? 'border-[#3f3f46] hover:border-[#22c55e] cursor-pointer' : 'border-[#3f3f46] cursor-default opacity-50'))}
                 >
                    <img src={m.awayTeam.image} className="w-full h-full object-contain drop-shadow-md" alt={m.awayTeam.name} />
                 </button>
                 {pickData?.pick?.id === m.awayTeam.id && (
                   <div className="absolute -top-3 -right-3 w-6 h-6 rounded-full bg-[#22c55e] flex items-center justify-center shadow-lg">
                     <Link2 className="w-3 h-3 text-zinc-950 stroke-[3]" />
                   </div>
                 )}
               </div>
             </div>

             <div className="flex items-center gap-2">
                {isScheduled ? (
                  <div className="flex items-center justify-center gap-2 w-[140px]">
                    <div className="flex-1 flex justify-end">
                       <div className="w-12 h-1.5 bg-zinc-800 rounded-full overflow-hidden flex justify-end">
                         <div className="h-full bg-blue-500 rounded-full" style={{ width: `${awayHotPct}%` }}></div>
                       </div>
                    </div>
                    <div className="flex-1 flex justify-start">
                       <div className="w-12 h-1.5 bg-zinc-800 rounded-full overflow-hidden">
                         <div className="h-full bg-blue-500 rounded-full" style={{ width: `${homeHotPct}%` }}></div>
                       </div>
                    </div>
                  </div>
                ) : (
                  <div className="flex items-center gap-2">
                    <div className={cn("w-16 h-10 rounded flex items-center justify-center font-mono font-bold text-lg shadow-inner relative overflow-hidden",
                      m.status === 'STATUS_IN_PROGRESS' ? "bg-[#27272a] text-white ring-1 ring-zinc-700" : "bg-[#1a1a1a]",
                      (m.metadata?.lowerScoreWins ? m.awayTeam.score < m.homeTeam.score : m.awayTeam.score > m.homeTeam.score) ? "text-zinc-100" : (m.status === 'STATUS_IN_PROGRESS' ? "text-zinc-200" : "text-zinc-500")
                    )}>
                       {(m.metadata?.lowerScoreWins ? m.awayTeam.score < m.homeTeam.score : m.awayTeam.score > m.homeTeam.score) && <div className="absolute bottom-0 left-0 right-0 h-1 bg-gradient-to-r from-orange-500 to-yellow-300"></div>}
                       {m.awayTeam.score ?? 0}
                    </div>

                    {m.status === 'STATUS_IN_PROGRESS' && (
                      <div className="flex flex-col items-center justify-center min-w-[40px]">
                        <span className="relative flex h-2.5 w-2.5 mb-1">
                          <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-500 opacity-75"></span>
                          <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-red-500"></span>
                        </span>
                        <span className="text-[9px] font-bold text-red-500 tracking-wider">LIVE</span>
                      </div>
                    )}

                    <div className={cn("w-16 h-10 rounded flex items-center justify-center font-mono font-bold text-lg shadow-inner relative overflow-hidden",
                      m.status === 'STATUS_IN_PROGRESS' ? "bg-[#27272a] text-white ring-1 ring-zinc-700" : "bg-[#1a1a1a]",
                      (m.metadata?.lowerScoreWins ? m.homeTeam.score < m.awayTeam.score : m.homeTeam.score > m.awayTeam.score) ? "text-zinc-100" : (m.status === 'STATUS_IN_PROGRESS' ? "text-zinc-200" : "text-zinc-500")
                    )}>
                       {(m.metadata?.lowerScoreWins ? m.homeTeam.score < m.awayTeam.score : m.homeTeam.score > m.awayTeam.score) && <div className="absolute bottom-0 left-0 right-0 h-1 bg-gradient-to-r from-orange-500 to-yellow-300"></div>}
                       {m.homeTeam.score ?? 0}
                    </div>
                  </div>
                )}
             </div>

             <div className="flex flex-col items-center gap-3 w-[120px]">
               <span className="text-sm font-semibold text-zinc-200">@{m.homeTeam.name}</span>
               <div className="relative">
                 <button
                   disabled={isPickDisabled}
                   onClick={() => !isPickDisabled && handleMakePick(m, m.homeTeam)}
                   className={cn("w-20 h-20 rounded-xl border flex items-center justify-center p-2 bg-[#1a1a1a] transition-all", pickData?.pick?.id === m.homeTeam.id ? 'border-[#22c55e] shadow-[0_0_15px_rgba(34,197,94,0.2)]' : (!isPickDisabled ? 'border-[#3f3f46] hover:border-[#22c55e] cursor-pointer' : 'border-[#3f3f46] cursor-default opacity-50'))}
                 >
                    <img src={m.homeTeam.image} className="w-full h-full object-contain drop-shadow-md" alt={m.homeTeam.name} />
                 </button>
                 {pickData?.pick?.id === m.homeTeam.id && (
                   <div className="absolute -top-3 -right-3 w-6 h-6 rounded-full bg-[#22c55e] flex items-center justify-center shadow-lg">
                     <Link2 className="w-3 h-3 text-zinc-950 stroke-[3]" />
                   </div>
                 )}
               </div>
             </div>
          </div>
        </div>

        {/* Footer */}
        <div className="px-5 py-3 border-t border-[#27272a] flex items-center justify-between bg-[#111111]">
           <button className="text-xs text-zinc-400 hover:text-zinc-200 transition-colors flex items-center gap-1">
             <span className="text-[10px]">↓</span> Share Matchup
           </button>

           <div className="flex flex-col items-center">
             {m.cost > 0 && (
               <span className="text-xs text-zinc-400 flex items-center gap-1 font-medium">
                 Wager: <Link2 className="w-3.5 h-3.5 text-cyan-400 ml-0.5" /> <span className="text-cyan-400 font-mono tracking-wide">{m.cost}</span>
               </span>
             )}
             <span className="text-xs text-zinc-400 flex items-center gap-1 font-medium">
               Reward: <Link2 className="w-3.5 h-3.5 text-cyan-400 ml-0.5" /> <span className="text-cyan-400 font-mono tracking-wide">{m.reward ?? 10}</span>
             </span>
           </div>

           {!hasPicked ? (
              <div className="w-[88px]"></div>
           ) : (
              (m.status === 'STATUS_SCHEDULED' || m.status === 'STATUS_POSTPONED') && m.active !== false ? (
                <button
                  onClick={() => handleCancelPick(m)}
                  className="text-xs font-bold text-red-500 hover:text-red-400 transition-colors uppercase tracking-wide border border-red-500/30 hover:border-red-400/50 bg-red-500/10 hover:bg-red-500/20 px-3 py-1.5 rounded"
                >
                  Cancel Pick
                </button>
              ) : (
                <span className="text-xs font-bold text-red-500 uppercase tracking-wide">Locked</span>
              )
           )}
        </div>
      </div>
    );
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
            {renderMatchupCard(activeMatchup, true)}
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
        </div>
      </div>

      {matchups.length === 0 ? (
        <div className="text-center py-20 text-zinc-500">
          <Gamepad2 className="w-12 h-12 mx-auto mb-4 opacity-50" />
          <p>No matchups available right now.</p>
          {profile?.role === "ADMIN" && (
            <p className="text-sm mt-2">Click "Admin: Sync ESPN Games" to fetch active schedules.</p>
          )}
        </div>
      ) : (
        <div className="grid lg:grid-cols-2 gap-5">
          {filteredMatchups.map(m => (
            <React.Fragment key={m.gameId}>
              {renderMatchupCard(m)}
            </React.Fragment>
          ))}
        </div>
      )}
    </div>
  );
}

function MainLayout({ children }: { children: React.ReactNode }) {
  const location = useLocation();
  const [sidebarOpen, setSidebarOpen] = useState(false);

  useEffect(() => {
    setSidebarOpen(false);
  }, [location.pathname]);

  const pageTitle = {
    '/dashboard': 'Dashboard',
    '/play': 'Play',
    '/profile': 'My Profile',
    '/pickem': "Pick'em",
    '/squads': 'Squads',
    '/leaderboards': 'Leaderboards',
  }[location.pathname] || 'ChainLink';

  return (
    <div className="flex h-screen bg-[#0a0a0a] text-zinc-50 font-sans overflow-hidden">
       <Sidebar open={sidebarOpen} setOpen={setSidebarOpen} />
       <div className="flex-1 flex flex-col h-screen overflow-hidden w-full relative">
         <header className="h-[4.5rem] flex items-center justify-between px-4 md:px-8 border-b border-[#27272a] bg-[#0a0a0a]">
            <div className="flex items-center gap-4">
              <button className="md:hidden text-zinc-400 hover:text-white" onClick={() => setSidebarOpen(true)}>
                <Menu className="w-6 h-6" />
              </button>
              <h2 className="font-display text-xl md:text-2xl font-bold tracking-wide text-zinc-100">{pageTitle}</h2>
            </div>
            <TopStats />
         </header>
         <main className="flex-1 overflow-y-auto bg-[#0a0a0a]">
            {children}
         </main>
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
  return user ? <>{children}</> : <Navigate to="/" />;
}

import AdminDashboard from './pages/admin/AdminDashboard';
import ProfilePage from './pages/profile/ProfilePage';

export default function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <Routes>
          <Route path="/" element={<Landing />} />
          <Route path="/admin/*" element={<AdminDashboard />} />
          <Route path="/dashboard" element={<PrivateRoute><MainLayout><PlaceholderPage title="Dashboard" /></MainLayout></PrivateRoute>} />
          <Route path="/play" element={<PrivateRoute><MainLayout><PlayDashboard /></MainLayout></PrivateRoute>} />
          <Route path="/profile" element={<PrivateRoute><MainLayout><ProfilePage /></MainLayout></PrivateRoute>} />
          <Route path="/pickem" element={<PrivateRoute><MainLayout><PlaceholderPage title="Pick'em" /></MainLayout></PrivateRoute>} />
          <Route path="/squads" element={<PrivateRoute><MainLayout><PlaceholderPage title="Squads" /></MainLayout></PrivateRoute>} />
          <Route path="/leaderboards" element={<PrivateRoute><MainLayout><PlaceholderPage title="Leaderboards" /></MainLayout></PrivateRoute>} />
          <Route path="/shop" element={<PrivateRoute><MainLayout><PlaceholderPage title="Link Shop" /></MainLayout></PrivateRoute>} />
          <Route path="/games" element={<PrivateRoute><MainLayout><PlaceholderPage title="Games" /></MainLayout></PrivateRoute>} />
          <Route path="/settings" element={<PrivateRoute><MainLayout><PlaceholderPage title="Settings" /></MainLayout></PrivateRoute>} />
          {/* Catch all route back to play */}
          <Route path="*" element={<Navigate to="/play" replace />} />
        </Routes>
      </BrowserRouter>
    </AuthProvider>
  );
}
