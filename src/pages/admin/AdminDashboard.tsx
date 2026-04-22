import { useState, useEffect } from 'react';
import { collection, getDocs, deleteDoc, doc, updateDoc, writeBatch, query, where } from 'firebase/firestore';
import { db } from '../../lib/firebase';
import { useAuth } from '../../lib/auth-context';
import { Navigate, Routes, Route, Link, useLocation } from 'react-router-dom';
import { Button } from '../../components/ui/button';
import {
  Users, Gamepad2, ShoppingCart, Layers, Trophy,
  Trash2, Search, Edit, RefreshCw, ChevronDown, ChevronRight,
  FileText, Diamond, Target, Bell, Shield, Coins
} from 'lucide-react';

const ADMIN_MENU = [
  {
    id: 'matchups',
    label: 'Matchups',
    icon: Gamepad2,
    subItems: [
      { id: 'matchups-all', label: 'All Matchups', path: '/admin/matchups' },
      { id: 'matchups-picks', label: 'Picks', path: '/admin/picks' },
      { id: 'matchups-create', label: 'Create Matchup', path: '/admin/matchups/create' },
      { id: 'matchups-find', label: 'Find Matchup', path: '/admin/matchups/find' }
    ]
  },
  { id: 'pickem', label: "Pick'em", icon: Layers, path: '/admin/pickem' },
  {
    id: 'announcements',
    label: 'Announcements',
    icon: FileText,
    subItems: [
      { id: 'announcements-all', label: 'All Announcements', path: '/admin/announcements' },
      { id: 'announcements-create', label: 'Create Announcement', path: '/admin/announcements/create' }
    ]
  },
  {
    id: 'sponsors',
    label: 'Sponsors',
    icon: Diamond,
    subItems: [
      { id: 'sponsors-all', label: 'All Sponsors', path: '/admin/sponsors' },
      { id: 'sponsors-create', label: 'Create Sponsor', path: '/admin/sponsors/create' },
      { id: 'sponsors-featured', label: 'Featured Sponsors', path: '/admin/sponsors/featured' }
    ]
  },
  {
    id: 'achievements',
    label: 'Achievements',
    icon: Trophy,
    subItems: [
      { id: 'achievements-all', label: 'All Achievements', path: '/admin/achievements' },
      { id: 'achievements-create', label: 'Create Achievement', path: '/admin/achievements/create' },
      { id: 'achievements-award', label: 'Award Achievement', path: '/admin/achievements/award' }
    ]
  },
  { id: 'challenges', label: 'Challenges', icon: Target, path: '/admin/challenges' },
  { id: 'users', label: 'Users', icon: Users, path: '/admin/users' },
  { id: 'squads', label: 'Squads', icon: Users, path: '/admin/squads' },
  { id: 'notifications', label: 'Notifications', icon: Bell, path: '/admin/notifications' },
  { id: 'actions', label: 'Actions', icon: Shield, path: '/admin/actions' },
  { id: 'shopItems', label: 'Shop', icon: Coins, path: '/admin/shopItems' },
];

function AdminSidebar() {
  const location = useLocation();
  const [expanded, setExpanded] = useState<Record<string, boolean>>({ matchups: true });

  const toggleExpand = (id: string) => {
    setExpanded(prev => ({ ...prev, [id]: !prev[id] }));
  };

  return (
    <div className="w-64 border-r border-zinc-800 bg-[#121212] flex flex-col h-full flex-shrink-0">
      <div className="h-[4.5rem] flex items-center px-6 border-b border-zinc-800">
         <div className="font-display font-extrabold text-xl text-zinc-100 tracking-wide">
           Admin
         </div>
      </div>

      <div className="flex-1 overflow-y-auto py-4 px-3 flex flex-col gap-1 custom-scrollbar">
        <Link to="/play" className="px-3 py-2 text-sm text-zinc-400 hover:text-white pb-4 border-b border-zinc-800/50 mb-2">← Back to App</Link>

        {ADMIN_MENU.map(item => {
          const isActive = location.pathname === item.path || (item.subItems && item.subItems.some(sub => location.pathname === sub.path));

          if (item.subItems) {
            const isExpanded = expanded[item.id];
            return (
              <div key={item.id} className="mb-1">
                <button
                  onClick={() => toggleExpand(item.id)}
                  className={`w-full flex items-center justify-between px-3 py-2.5 rounded-lg transition-colors ${isActive ? 'text-zinc-100 font-medium' : 'text-zinc-400 hover:bg-zinc-800/50 hover:text-zinc-200'}`}
                >
                  <div className="flex items-center gap-3">
                    <item.icon className="w-[18px] h-[18px]" />
                    <span className="text-[15px]">{item.label}</span>
                  </div>
                  {isExpanded ? <ChevronDown className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
                </button>

                {isExpanded && (
                  <div className="ml-9 mt-1 flex flex-col gap-1 border-l border-zinc-800/80 pl-2">
                    {item.subItems.map(subItem => {
                      const isSubActive = location.pathname === subItem.path;
                      return (
                        <Link
                          key={subItem.id}
                          to={subItem.path}
                          className={`flex items-center gap-2 px-3 py-2 rounded-lg text-sm transition-colors ${isSubActive ? 'bg-zinc-800 text-zinc-100 font-medium' : 'text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800/30'}`}
                        >
                          <span className="w-1 h-1 rounded-full bg-zinc-600"></span>
                          {subItem.label}
                        </Link>
                      );
                    })}
                  </div>
                )}
              </div>
            );
          } else {
            return (
              <Link
                key={item.id}
                to={item.path!}
                className={`flex items-center gap-3 px-3 py-2.5 rounded-lg transition-colors mb-1 ${isActive ? 'bg-zinc-800 text-zinc-100 font-medium' : 'text-zinc-400 hover:bg-zinc-800/50 hover:text-zinc-200'}`}
              >
                <item.icon className="w-[18px] h-[18px]" />
                <span className="text-[15px]">{item.label}</span>
              </Link>
            );
          }
        })}
      </div>
    </div>
  );
}

function AdminMatchups() {
  const [data, setData] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [syncing, setSyncing] = useState(false);

  const fetchData = async () => {
    setLoading(true);
    try {
      const snap = await getDocs(collection(db, 'matchups'));
      setData(snap.docs.map(d => ({ id: d.id, ...d.data() })));
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const handleSync = async () => {
    setSyncing(true);
    try {
      const leagues = ["MLB", "NBA", "NHL", "PGA"];

      let totalImported = 0;

      for (const league of leagues) {
        const response = await fetch("/api/admin/sync-schedules", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ league })
        });

        const json = await response.json();
        if (json.success && json.result?.data) {
          const scrapedMatchups = json.result.data;

          if (scrapedMatchups.length > 0) {
             console.log(`Fetched ${scrapedMatchups.length} matchups for ${league}. Writing...`);

             // Client-side mapping
             // Fetch existing matchups for this league to avoid duplicates
             const existingSnap = await getDocs(query(collection(db, 'matchups'), where('league', '==', league)));
             const existingMap = new Map<string, any>();
             existingSnap.docs.forEach(d => {
               const m = d.data();
               existingMap.set(m.gameId, d);
             });

             // Process in batches of 500 (Firestore limit)
             let batch = writeBatch(db);
             let opCount = 0;
             let newCount = 0;

             for (const scrapedMatchup of scrapedMatchups) {
               const gameId = scrapedMatchup.gameId;
               const existingDoc = existingMap.get(gameId);

               if (existingDoc) {
                 // Check if it needs update...
                 const existingData = existingDoc.data();
                 if (existingData.status !== scrapedMatchup.status ||
                     existingData.startTime !== scrapedMatchup.startTime ||
                     existingData.homeTeam?.score !== scrapedMatchup.homeTeam?.score ||
                     existingData.awayTeam?.score !== scrapedMatchup.awayTeam?.score)
                 {
                   batch.update(doc(db, 'matchups', existingDoc.id), {
                     status: scrapedMatchup.status,
                     startTime: scrapedMatchup.startTime,
                     'homeTeam.score': scrapedMatchup.homeTeam?.score || 0,
                     'awayTeam.score': scrapedMatchup.awayTeam?.score || 0,
                     'metadata.overUnder': scrapedMatchup.metadata?.overUnder,
                     'metadata.spread': scrapedMatchup.metadata?.spread,
                     'metadata.network': scrapedMatchup.metadata?.network,
                     updatedAt: Date.now()
                   });
                   opCount++;
                 }
               } else {
                 // Create new
                 batch.set(doc(collection(db, 'matchups')), {
                   ...scrapedMatchup,
                   updatedAt: Date.now(),
                   createdAt: Date.now()
                 });
                 opCount++;
                 newCount++;

                 // Add to tracking map for this loop
                 existingMap.set(gameId, { data: () => scrapedMatchup } as any);
               }

               if (opCount === 500) {
                 await batch.commit();
                 batch = writeBatch(db);
                 opCount = 0;
               }
             }

             if (opCount > 0) {
               await batch.commit();
             }

             totalImported += newCount;
          }
        } else {
          console.error(`Sync error for ${league}:`, json.error);
        }
      }

      await fetchData();
      alert(`ESPN Sync Complete! Inserted ${totalImported} new matchups.`);
    } catch (e) {
      console.error(e);
      alert("Sync failed");
    } finally {
      setSyncing(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Are you sure?")) return;
    await deleteDoc(doc(db, 'matchups', id));
    fetchData();
  };

  const handleToggleActive = async (id: string, currentActive: boolean) => {
    try {
      await updateDoc(doc(db, 'matchups', id), {
        active: !currentActive,
        updatedAt: Date.now()
      });
      setData(prev => prev.map(m => m.id === id ? { ...m, active: !currentActive } : m));
    } catch (e) {
      console.error("Error toggling active status", e);
      alert("Failed to toggle active status");
    }
  };

  if (loading) return <div className="p-8 text-zinc-500">Loading matchups...</div>;

  return (
    <div className="bg-[#121212] border border-zinc-800 rounded-xl overflow-hidden shadow-xl flex flex-col h-full max-h-[85vh]">
      <div className="p-4 border-b border-zinc-800 flex justify-between items-center bg-[#18181A]">
        <h3 className="font-bold text-lg">Matchups Management ({data.length})</h3>
        <div className="flex items-center gap-3">
          <Button
            variant="outline"
            onClick={handleSync}
            disabled={syncing}
            className="text-cyan-400 border-cyan-800 hover:bg-cyan-900/30"
          >
            <RefreshCw className={`w-4 h-4 mr-2 ${syncing ? 'animate-spin' : ''}`} />
            {syncing ? "Syncing..." : "Sync ESPN APIs"}
          </Button>
          <div className="relative">
            <Search className="w-4 h-4 absolute left-3 top-2.5 text-zinc-500" />
            <input type="text" placeholder="Search Matchups..." className="bg-zinc-900 border border-zinc-800 rounded-lg pl-9 pr-4 py-1.5 text-sm focus:outline-none focus:border-zinc-700 w-64" />
          </div>
          <Button variant="secondary" size="sm" onClick={fetchData}>Refresh</Button>
        </div>
      </div>

      {data.length === 0 ? (
        <div className="p-12 text-center text-zinc-500 font-medium">No matchups found. Run Sync.</div>
      ) : (
        <div className="overflow-x-auto overflow-y-auto flex-1 custom-scrollbar">
          <table className="w-full text-left text-sm whitespace-nowrap">
            <thead className="bg-[#18181A] text-zinc-400 sticky top-0 border-b border-zinc-800 z-10">
              <tr>
                <th className="px-4 py-3 font-medium">League</th>
                <th className="px-4 py-3 font-medium">Title</th>
                <th className="px-4 py-3 font-medium">Status</th>
                <th className="px-4 py-3 font-medium">Active</th>
                <th className="px-4 py-3 font-medium">Start Time</th>
                <th className="px-4 py-3 font-medium">Cost</th>
                <th className="px-4 py-3 font-medium text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-800">
              {data.map(row => (
                <tr key={row.id} className="hover:bg-zinc-800/30 transition-colors">
                  <td className="px-4 py-3 font-bold text-zinc-300">{row.league}</td>
                  <td className="px-4 py-3 text-zinc-200">{row.title}</td>
                  <td className="px-4 py-3 text-zinc-400">
                    <span className={`px-2 py-0.5 rounded text-[10px] uppercase font-bold tracking-wider ${row.status === 'STATUS_SCHEDULED' ? 'bg-zinc-800 text-zinc-300' : 'bg-green-500/10 text-green-400'}`}>
                      {row.status}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <button
                      onClick={() => handleToggleActive(row.id, row.active)}
                      className={`px-2 py-0.5 rounded text-[10px] uppercase font-bold tracking-wider transition-colors ${row.active ? 'bg-green-500/20 text-green-400 hover:bg-red-500/20 hover:text-red-400' : 'bg-red-500/20 text-red-400 hover:bg-green-500/20 hover:text-green-400'}`}
                      title={row.active ? "Mark Inactive" : "Mark Active"}
                    >
                      {row.active ? 'ACTIVE' : 'INACTIVE'}
                    </button>
                  </td>
                  <td className="px-4 py-3 text-zinc-500">{new Date(row.startTime).toLocaleString()}</td>
                  <td className="px-4 py-3 text-cyan-400 font-mono">{row.cost} LNK</td>
                  <td className="px-4 py-3 text-right">
                    <button className="text-zinc-500 hover:text-white mr-3"><Edit className="w-4 h-4" /></button>
                    <button onClick={() => handleDelete(row.id)} className="text-red-500/70 hover:text-red-500"><Trash2 className="w-4 h-4" /></button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

function GenericTable({ collectionName }: { collectionName: string }) {
  const [data, setData] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchData = async () => {
    setLoading(true);
    try {
      const snap = await getDocs(collection(db, collectionName));
      setData(snap.docs.map(d => ({ id: d.id, ...d.data() })));
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, [collectionName]);

  const handleDelete = async (id: string) => {
    if (!confirm("Are you sure?")) return;
    await deleteDoc(doc(db, collectionName, id));
    fetchData();
  };

  if (loading) return <div className="p-8 text-zinc-500">Loading {collectionName}...</div>;

  const headers = data.length > 0 ? Array.from(new Set(data.flatMap(d => Object.keys(d)))) : [];

  return (
    <div className="bg-[#121212] border border-zinc-800 rounded-xl overflow-hidden shadow-xl">
      <div className="p-4 border-b border-zinc-800 flex justify-between items-center bg-[#18181A]">
        <h3 className="font-bold text-lg capitalize">{collectionName} ({data.length})</h3>
        <div className="flex items-center gap-2">
          <div className="relative">
            <Search className="w-4 h-4 absolute left-3 top-2.5 text-zinc-500" />
            <input type="text" placeholder="Search..." className="bg-zinc-900 border border-zinc-800 rounded-lg pl-9 pr-4 py-1.5 text-sm focus:outline-none focus:border-zinc-700 w-64" />
          </div>
          <Button variant="secondary" size="sm" onClick={fetchData}>Refresh</Button>
        </div>
      </div>

      {data.length === 0 ? (
        <div className="p-12 text-center text-zinc-500 font-medium">No records found.</div>
      ) : (
        <div className="overflow-x-auto max-h-[70vh] custom-scrollbar">
          <table className="w-full text-left text-sm whitespace-nowrap">
            <thead className="bg-[#18181A] text-zinc-400 sticky top-0 border-b border-zinc-800 z-10">
              <tr>
                {headers.map(h => <th key={h} className="px-4 py-3 font-medium">{h}</th>)}
                <th className="px-4 py-3 font-medium text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-800">
              {data.map(row => (
                <tr key={row.id} className="hover:bg-zinc-800/30 transition-colors">
                  {headers.map((h: string) => (
                    <td key={h} className="px-4 py-3 max-w-[200px] truncate text-zinc-300">
                      {typeof row[h] === 'object' && row[h] !== null ? JSON.stringify(row[h]) : String(row[h])}
                    </td>
                  ))}
                  <td className="px-4 py-3 text-right">
                    <button className="text-zinc-500 hover:text-white mr-3"><Edit className="w-4 h-4" /></button>
                    <button onClick={() => handleDelete(row.id)} className="text-red-500/70 hover:text-red-500"><Trash2 className="w-4 h-4" /></button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

function AdminPlaceholder({ title }: { title: string }) {
  return (
    <div className="flex flex-col items-center justify-center h-full text-zinc-500 font-medium bg-[#121212] border border-zinc-800 rounded-xl relative overflow-hidden">
      <div className="absolute inset-0 bg-[radial-gradient(#27272a_1px,transparent_1px)] [background-size:16px_16px] opacity-20"></div>
      <div className="z-10 text-center">
        <h3 className="text-xl text-zinc-300 font-bold mb-2">{title}</h3>
        <p className="text-sm">Admin View Under Construction</p>
      </div>
    </div>
  );
}

export default function AdminDashboard() {
  const { profile, loading } = useAuth();
  const location = useLocation();

  if (loading) return null;
  if (!profile || profile.role !== "ADMIN") return <Navigate to="/play" replace />;

  const pathParts = location.pathname.split('/').filter(Boolean);
  const activeSection = pathParts[1] || 'matchups';

  let headerTitle = activeSection;
  if (pathParts.length > 2) {
    headerTitle = `${activeSection} - ${pathParts[2]}`;
  }

  return (
    <div className="flex h-screen bg-[#0a0a0a] text-zinc-50 font-sans overflow-hidden">
       <AdminSidebar />

       <div className="flex-1 flex flex-col h-screen overflow-hidden relative">
          <div className="absolute -z-10 h-full w-full bg-[radial-gradient(#22c55e_1px,transparent_1px)] [background-size:24px_24px] [mask-image:radial-gradient(ellipse_50%_50%_at_50%_50%,#000_10%,transparent_80%)] opacity-5"></div>

          <header className="h-[4.5rem] flex items-center px-8 border-b border-zinc-800/80 bg-[#121212]/80 backdrop-blur-md">
            <h2 className="font-display text-xl font-bold tracking-wide capitalize text-zinc-100">{headerTitle.replace('-', ' ')}</h2>
          </header>

          <main className="flex-1 overflow-y-auto p-8 relative">
             <Routes>
                {/* Matchups routes */}
                <Route path="matchups" element={<AdminMatchups />} />
                <Route path="picks" element={<GenericTable collectionName="picks" />} />
                <Route path="matchups/create" element={<AdminPlaceholder title="Create Matchup" />} />
                <Route path="matchups/find" element={<AdminPlaceholder title="Find Matchup" />} />

                {/* Announcements */}
                <Route path="announcements" element={<GenericTable collectionName="announcements" />} />
                <Route path="announcements/create" element={<AdminPlaceholder title="Create Announcement" />} />

                {/* Sponsors */}
                <Route path="sponsors" element={<GenericTable collectionName="sponsors" />} />
                <Route path="sponsors/create" element={<AdminPlaceholder title="Create Sponsor" />} />
                <Route path="sponsors/featured" element={<AdminPlaceholder title="Featured Sponsors" />} />

                {/* Achievements */}
                <Route path="achievements" element={<GenericTable collectionName="achievements" />} />
                <Route path="achievements/create" element={<AdminPlaceholder title="Create Achievement" />} />
                <Route path="achievements/award" element={<AdminPlaceholder title="Award Achievement" />} />

                {/* Flat routes */}
                <Route path="pickem" element={<GenericTable collectionName="pickemCampaigns" />} />
                <Route path="challenges" element={<GenericTable collectionName="globalQuiz" />} />
                <Route path="users" element={<GenericTable collectionName="users" />} />
                <Route path="squads" element={<GenericTable collectionName="squads" />} />
                <Route path="notifications" element={<AdminPlaceholder title="Notifications System" />} />
                <Route path="actions" element={<AdminPlaceholder title="Admin Actions Log" />} />
                <Route path="shopItems" element={<GenericTable collectionName="shopItems" />} />

                {/* Fallback */}
                <Route path="*" element={<Navigate to="matchups" replace />} />
             </Routes>
          </main>
       </div>
    </div>
  );
}
