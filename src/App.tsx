import React, { useState, useEffect } from 'react';
import { BrowserRouter, Routes, Route, Navigate, Link, useLocation } from 'react-router-dom';
import { AuthProvider, useAuth } from './lib/auth-context';
import { loginWithGoogle, logout, db } from './lib/firebase';
import { collection, getDocs, doc, setDoc, query, where } from 'firebase/firestore';
import { Button } from './components/ui/button';
import { Modal } from './components/ui/modal';
import { cn } from './lib/utils';
import {
  Link2, LayoutDashboard, User as UserIcon, PlayCircle, Layers, Trophy,
  ShoppingCart, Gamepad2, Settings, Users, LogOut, ShieldAlert
} from 'lucide-react';

function Sidebar() {
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
    <div className="w-64 border-r border-[#27272a] bg-[#121212] flex flex-col h-full flex-shrink-0">
      <div className="h-16 flex items-center px-6">
        <div className="font-display font-extrabold text-2xl text-[#22c55e] flex items-center gap-2 tracking-wide">
          <img src="/logo.png" alt="ChainLink" className="h-8 max-w-[120px] object-contain" onError={(e) => { e.currentTarget.style.display='none'; e.currentTarget.nextElementSibling?.classList.remove('hidden'); }} />
          <Link2 className="w-6 h-6 stroke-[2.5] hidden" />
          ChainLink
        </div>
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
  );
}

function TopStats() {
  const { profile, chain } = useAuth();

  return (
    <div className="flex items-center gap-5">
      <div className="flex items-center gap-1.5 text-sm">
         <Link2 className="w-4 h-4 text-cyan-400" />
         <span className="font-mono text-cyan-400 font-medium tracking-wide">{profile?.coins?.toLocaleString() || 0}</span>
      </div>
      <div className="w-px h-4 bg-zinc-700"></div>
      <div className="flex items-center gap-3 text-sm">
         <span className="text-[#22c55e] font-bold tracking-tight">W{chain?.chain || 0}</span>
         <span className="text-zinc-400 font-mono text-xs tracking-wider">
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

  if (loading) return null;
  if (user) return <Navigate to="/play" replace />;

  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-[#0a0a0a] text-center px-4">
      <div className="flex items-center gap-4 text-[#22c55e] mb-8 animate-in slide-in-from-top-4 duration-500 fade-in">
        <img src="/logo.png" alt="ChainLink" className="h-14 max-w-[200px] object-contain drop-shadow-[0_0_15px_rgba(34,197,94,0.3)]" onError={(e) => { e.currentTarget.style.display='none'; e.currentTarget.nextElementSibling?.classList.remove('hidden'); }} />
        <Link2 className="w-14 h-14 stroke-[2.5] hidden" />
        <h1 className="font-display text-6xl font-extrabold tracking-wide">ChainLink</h1>
      </div>
      <p className="text-xl text-zinc-400 mb-10 max-w-2xl font-light">
        Build the highest chain of correct guesses to sports matchups and challenges. <br/>Wager your Links and climb the leaderboard.
      </p>
      <Button size="lg" className="h-14 px-8 text-lg font-bold shadow-[0_0_20px_rgba(34,197,94,0.3)] animate-pulse" onClick={loginWithGoogle}>
        Connect to Play
      </Button>

      {/* Visual embellishment */}
      <div className="absolute inset-0 max-w-full overflow-hidden pointer-events-none opacity-10 flex justify-center mt-32">
        <div className="w-full h-[500px] bg-[#22c55e] blur-[150px] rounded-full scale-150 translate-y-1/2"></div>
      </div>
    </div>
  );
}

function PlayDashboard() {
  const { user, profile, chain } = useAuth();
  const [matchups, setMatchups] = useState<any[]>([]);
  const [userPicks, setUserPicks] = useState<Record<string, any>>({});
  const [selectedMatchup, setSelectedMatchup] = useState<any | null>(null);

  useEffect(() => {
    if (!user) return;
    const setupMatchups = async () => {
      const snap = await getDocs(collection(db, 'matchups'));
      if (snap.empty) {
        setMatchups([]);
      } else {
        setMatchups(snap.docs.map(d => ({id: d.id, ...d.data()})));
      }
    };

    const fetchPicks = async () => {
      const q = query(collection(db, 'picks'), where('userId', '==', user.uid));
      const pickSnap = await getDocs(q);
      const picksInfo: Record<string, any> = {};
      pickSnap.docs.forEach(d => {
        const data = d.data();
        picksInfo[data.matchupId] = data;
      });
      setUserPicks(picksInfo);
    };

    setupMatchups();
    fetchPicks();
  }, [user]);

  const handleMakePick = async (matchup: any, team: any) => {
    if (!user || !profile) return;
    if (profile.coins < matchup.cost) {
      alert("Not enough links!");
      return;
    }
    try {
      const pickId = user.uid + "_" + matchup.id;
      const pickDoc = {
        userId: user.uid,
        matchupId: matchup.id,
        pickId: team.id,
        pickName: team.name,
        status: 'PENDING',
        coins: matchup.cost,
        active: true,
        createdAt: Date.now(),
        updatedAt: Date.now()
      };
      await setDoc(doc(db, 'picks', pickId), pickDoc);

      await setDoc(doc(db, 'users', user.uid), {
        ...profile,
        coins: profile.coins - matchup.cost,
        updatedAt: Date.now()
      }, { merge: true });

      setUserPicks(prev => ({...prev, [matchup.id]: pickDoc}));
      setSelectedMatchup(null);
    } catch (e) {
      console.error(e);
      alert("Failed to save pick. Ensure your rules allow this write.");
    }
  };

  return (
    <div className="max-w-5xl mx-auto px-6 py-8">

      {/* Current Chain Highlight */}
      <div className="mb-10 w-full relative group">
        <div className="absolute -inset-[2px] bg-gradient-to-r from-green-600/50 to-emerald-800/30 rounded-xl blur-sm opacity-70 group-hover:opacity-100 transition duration-500"></div>
        <div className="relative bg-[#131415] border border-zinc-800 rounded-xl p-8 flex flex-col items-center justify-center shadow-lg">
          <img src={profile?.image || `https://api.dicebear.com/7.x/avataaars/svg?seed=${profile?.id || 'guest'}`} className="w-16 h-16 rounded-full border-2 border-zinc-700 bg-zinc-800 mb-4" />
          <h2 className="text-xl font-bold text-zinc-100">{profile?.name || 'Player'}</h2>
          <div className="mt-2 text-zinc-400 font-medium">
            Current Chain: <span className="text-[#22c55e] font-bold text-lg">W{chain?.chain || 0}</span>
          </div>
          <div className="mt-1 text-sm font-bold text-zinc-500 uppercase tracking-widest">Leader</div>
        </div>
      </div>

      <div className="flex items-center gap-2 mb-6 border-b border-zinc-800/80 pb-3">
        <Button variant="secondary" className="bg-zinc-800 hover:bg-zinc-700 text-zinc-100 border-none rounded-full px-6 h-9">All</Button>
        <Button variant="ghost" className="text-zinc-400 hover:text-zinc-200 rounded-full px-6 h-9">Available</Button>
        <Button variant="ghost" className="text-zinc-400 hover:text-zinc-200 rounded-full px-6 h-9">Chain Builder</Button>
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
        {matchups.map(m => {
          const hasPicked = !!userPicks[m.id];
          const pickData = userPicks[m.id];

          return (
          <div key={m.id} className="bg-[#131415] border border-[#27272a] rounded-xl overflow-hidden hover:border-zinc-700 transition-colors shadow-sm relative group">
            {/* Header info */}
            <div className="bg-[#161d2b] px-4 py-2 border-b border-[#27272a] flex justify-between items-center bg-gradient-to-r from-[#111f38] to-[#121212]">
              <div className="flex items-center gap-2 font-bold text-sm text-zinc-200 tracking-tight">
                 <Trophy className="w-3.5 h-3.5" /> {m.league}
              </div>
              <div className="flex flex-col items-end">
                <span className="text-[10px] text-zinc-500 uppercase">last update:</span>
                <span className="text-xs text-zinc-300 font-medium">Bottom 3rd</span>
              </div>
            </div>

            {/* Matchup content */}
            <div className="p-5">
              <div className="text-base font-bold text-zinc-100 mb-6">{m.title}</div>

              <div className="flex items-center justify-between">
                 <div className="flex flex-col items-center gap-3 w-[120px]">
                   <span className="text-sm font-semibold text-zinc-200">{m.awayTeam.name}</span>
                   <div className="relative">
                     <div className={cn("w-20 h-20 rounded-xl border flex items-center justify-center p-2 bg-[#1a1a1a] transition-all", pickData?.pickId === m.awayTeam.id ? 'border-[#22c55e] shadow-[0_0_15px_rgba(34,197,94,0.2)]' : 'border-[#3f3f46]')}>
                        <img src={m.awayTeam.image} className="w-full h-full object-contain drop-shadow-md" alt={m.awayTeam.name} />
                     </div>
                     {pickData?.pickId === m.awayTeam.id && (
                       <div className="absolute -top-3 -right-3 w-6 h-6 rounded-full bg-[#22c55e] flex items-center justify-center shadow-lg">
                         <Link2 className="w-3 h-3 text-zinc-950 stroke-[3]" />
                       </div>
                     )}
                   </div>
                 </div>

                 <div className="flex items-center gap-2">
                    <div className={cn("w-16 h-10 bg-[#1a1a1a] rounded flex items-center justify-center font-mono font-bold text-lg shadow-inner relative overflow-hidden",
                      (m.metadata?.lowerScoreWins ? m.awayTeam.score < m.homeTeam.score : m.awayTeam.score > m.homeTeam.score) ? "text-zinc-100" : "text-zinc-500"
                    )}>
                       {(m.metadata?.lowerScoreWins ? m.awayTeam.score < m.homeTeam.score : m.awayTeam.score > m.homeTeam.score) && <div className="absolute bottom-0 left-0 right-0 h-1 bg-gradient-to-r from-orange-500 to-yellow-300"></div>}
                       {m.awayTeam.score ?? 0}
                    </div>
                    <div className={cn("w-16 h-10 bg-[#1a1a1a] rounded flex items-center justify-center font-mono font-bold text-lg shadow-inner relative overflow-hidden",
                      (m.metadata?.lowerScoreWins ? m.homeTeam.score < m.awayTeam.score : m.homeTeam.score > m.awayTeam.score) ? "text-zinc-100" : "text-zinc-500"
                    )}>
                       {(m.metadata?.lowerScoreWins ? m.homeTeam.score < m.awayTeam.score : m.homeTeam.score > m.awayTeam.score) && <div className="absolute bottom-0 left-0 right-0 h-1 bg-gradient-to-r from-orange-500 to-yellow-300"></div>}
                       {m.homeTeam.score ?? 0}
                    </div>
                 </div>

                 <div className="flex flex-col items-center gap-3 w-[120px]">
                   <span className="text-sm font-semibold text-zinc-200">@{m.homeTeam.name}</span>
                   <div className="relative">
                     <div className={cn("w-20 h-20 rounded-xl border flex items-center justify-center p-2 bg-[#1a1a1a] transition-all", pickData?.pickId === m.homeTeam.id ? 'border-[#22c55e] shadow-[0_0_15px_rgba(34,197,94,0.2)]' : 'border-[#3f3f46]')}>
                        <img src={m.homeTeam.image} className="w-full h-full object-contain drop-shadow-md" alt={m.homeTeam.name} />
                     </div>
                     {pickData?.pickId === m.homeTeam.id && (
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

               <span className="text-xs text-zinc-400 flex items-center gap-1 font-medium">
                 Reward: <Link2 className="w-3.5 h-3.5 text-cyan-400 ml-0.5" /> <span className="text-cyan-400 font-mono tracking-wide">{m.cost}</span>
               </span>

               {!hasPicked ? (
                  <button onClick={() => setSelectedMatchup(m)} className="text-[#22c55e] text-xs font-bold px-3 py-1.5 rounded bg-[#22c55e]/10 hover:bg-[#22c55e]/20 transition-colors uppercase tracking-wide">
                    Make Pick
                  </button>
               ) : (
                  <span className="text-xs font-bold text-red-500 uppercase tracking-wide">Locked</span>
               )}
            </div>
          </div>
        )})}
        </div>
      )}

      <Modal isOpen={!!selectedMatchup} onClose={() => setSelectedMatchup(null)}>
        {selectedMatchup && (
          <div className="p-6">
            <h3 className="text-xl font-bold mb-6 text-center text-zinc-100 border-b border-zinc-800 pb-4">Select your winner</h3>
            <div className="flex gap-4">
              <button onClick={() => handleMakePick(selectedMatchup, selectedMatchup.awayTeam)} className="flex-1 bg-zinc-900 border border-zinc-800 rounded-xl p-6 flex flex-col items-center hover:border-[#22c55e] hover:bg-[#22c55e]/5 transition-all group">
                <div className="bg-[#1a1a1a] p-4 rounded-xl border border-zinc-800 group-hover:border-[#22c55e]/50 mb-3 w-20 h-20 flex items-center justify-center">
                  <img src={selectedMatchup.awayTeam.image} className="max-w-full max-h-full object-contain" />
                </div>
                <span className="font-bold text-zinc-200">{selectedMatchup.awayTeam.name}</span>
              </button>

              <button onClick={() => handleMakePick(selectedMatchup, selectedMatchup.homeTeam)} className="flex-1 bg-zinc-900 border border-zinc-800 rounded-xl p-6 flex flex-col items-center hover:border-[#22c55e] hover:bg-[#22c55e]/5 transition-all group">
                <div className="bg-[#1a1a1a] p-4 rounded-xl border border-zinc-800 group-hover:border-[#22c55e]/50 mb-3 w-20 h-20 flex items-center justify-center">
                  <img src={selectedMatchup.homeTeam.image} className="max-w-full max-h-full object-contain" />
                </div>
                <span className="font-bold text-zinc-200">@{selectedMatchup.homeTeam.name}</span>
              </button>
            </div>
            <div className="mt-6 flex justify-center items-center text-sm font-medium text-zinc-400 bg-zinc-900 rounded-lg py-3 border border-zinc-800">
              Wager Amount: <Link2 className="w-4 h-4 text-cyan-400 ml-2 mr-1" /> <span className="font-mono text-cyan-400 font-bold tracking-wide">{selectedMatchup.cost}</span>
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
}

function MainLayout({ children }: { children: React.ReactNode }) {
  const location = useLocation();
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
       <Sidebar />
       <div className="flex-1 flex flex-col h-screen overflow-hidden">
         <header className="h-[4.5rem] flex items-center justify-between px-8 border-b border-[#27272a] bg-[#0a0a0a]">
            <div><h2 className="font-display text-2xl font-bold tracking-wide text-zinc-100">{pageTitle}</h2></div>
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

export default function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <Routes>
          <Route path="/" element={<Landing />} />
          <Route path="/admin/*" element={<AdminDashboard />} />
          <Route path="/dashboard" element={<PrivateRoute><MainLayout><PlaceholderPage title="Dashboard" /></MainLayout></PrivateRoute>} />
          <Route path="/play" element={<PrivateRoute><MainLayout><PlayDashboard /></MainLayout></PrivateRoute>} />
          <Route path="/profile" element={<PrivateRoute><MainLayout><PlaceholderPage title="My Profile" /></MainLayout></PrivateRoute>} />
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
