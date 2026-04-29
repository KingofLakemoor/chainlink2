import { useState, useEffect } from 'react';
import { collection, getDocs, deleteDoc, doc, setDoc, updateDoc, writeBatch, query, where } from 'firebase/firestore';
import { db } from '../../lib/firebase';
import { scrapeLeagueSchedules } from '../../services/espnScraper';
import { useAuth } from '../../lib/auth-context';
import { Navigate, Routes, Route, Link, useLocation, useParams, useNavigate } from 'react-router-dom';
import { Button } from '../../components/ui/button';
import CreateMatchupPage from './matchups/CreateMatchupPage';
import {
  Users, Gamepad2, ShoppingCart, Layers, Trophy,
  Trash2, Search, Edit, RefreshCw, ChevronDown, ChevronRight,
  FileText, Diamond, Target, Bell, Shield, Coins, Menu, X
} from 'lucide-react';

const ADMIN_MENU = [
  { id: 'leagues', label: 'Leagues', icon: Target, path: '/admin/leagues' },
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

function AdminSidebar({ open, setOpen }: { open: boolean; setOpen: (val: boolean) => void }) {
  const location = useLocation();
  const [expanded, setExpanded] = useState<Record<string, boolean>>({ matchups: true });

  const toggleExpand = (id: string) => {
    setExpanded(prev => ({ ...prev, [id]: !prev[id] }));
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

      <div className={`fixed md:relative top-0 left-0 h-full z-50 w-64 border-r border-zinc-800 bg-[#121212] flex flex-col flex-shrink-0 transition-transform duration-300 ease-in-out ${open ? 'translate-x-0' : '-translate-x-full md:translate-x-0'}`}>
        <div className="h-[4.5rem] flex items-center justify-between px-6 border-b border-zinc-800">
           <div className="font-display font-extrabold text-xl text-zinc-100 tracking-wide">
             Admin
           </div>
           <button className="md:hidden text-zinc-400 hover:text-white" onClick={() => setOpen(false)}>
             <X className="w-6 h-6" />
           </button>
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
    </>
  );
}

function AdminMatchups() {
  const [data, setData] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [syncing, setSyncing] = useState(false);
  const [leagueFilter, setLeagueFilter] = useState('All');
  const [pickCounts, setPickCounts] = useState<Record<string, number>>({});

  const fetchData = async () => {
    setLoading(true);
    try {
      const snap = await getDocs(collection(db, 'matchups'));
      setData(snap.docs.map(d => ({ id: d.id, ...d.data() })));

      const picksSnap = await getDocs(collection(db, 'picks'));
      const counts: Record<string, number> = {};
      picksSnap.docs.forEach(d => {
        const p = d.data();
        counts[p.matchupId] = (counts[p.matchupId] || 0) + 1;
      });
      setPickCounts(counts);
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
      const leagues = ["MLB", "NBA", "NHL", "PGA", "WNBA", "NFL", "WBB", "MBB", "MLS", "EPL", "NWSL", "COLLEGE-FOOTBALL"];

      let totalImported = 0;

      for (const league of leagues) {
        try {
          const result = await scrapeLeagueSchedules(league);
          const scrapedMatchups = result.data;

          if (scrapedMatchups && scrapedMatchups.length > 0) {
             console.log(`Fetched ${scrapedMatchups.length} matchups for ${league}. Writing...`);

             // Client-side mapping
             // Fetch existing matchups for this league to avoid duplicates
             const existingSnap = await getDocs(query(collection(db, 'matchups'), where('league', '==', league)));
             const existingMap = new Map<string, any>();
             existingSnap.docs.forEach(d => {
               const m = d.data();
               existingMap.set(m.gameId, d);
             });

             // Fetch default active setting
             let defaultActive = true;
             try {
               const settingsSnap = await getDocs(query(collection(db, 'leagueSettings')));
               const leagueSetting = settingsSnap.docs.find(d => d.id === league)?.data();
               if (leagueSetting && typeof leagueSetting.active === 'boolean') {
                 defaultActive = leagueSetting.active;
               }
             } catch (e) {
               console.error("Error fetching league settings", e);
             }

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
                 const newDocRef = doc(collection(db, 'matchups'));
                 batch.set(newDocRef, {
                   ...scrapedMatchup,
                   active: scrapedMatchup.active && defaultActive,
                   updatedAt: Date.now(),
                   createdAt: Date.now()
                 });
                 opCount++;
                 newCount++;

                 // Add to tracking map for this loop
                 existingMap.set(gameId, { id: newDocRef.id, data: () => scrapedMatchup } as any);
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
          } else if (result.error) {
             console.error(`Sync error for ${league}:`, result.error);
          }
        } catch (err: any) {
          console.error(`Sync error for ${league}:`, err);
        }
      }

      await fetchData();
      alert(`ESPN Sync Complete! Inserted ${totalImported} new matchups.`);
    } catch (e) {
      console.error(e);
      alert("Sync failed: " + e.message);
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
        <h3 className="font-bold text-lg">Matchups Management ({data.filter(m => m.status !== 'STATUS_FINAL' && (leagueFilter === 'All' || m.league === leagueFilter)).length})</h3>
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
          <select value={leagueFilter} onChange={(e) => setLeagueFilter(e.target.value)} className="bg-zinc-900 border border-zinc-800 rounded-lg px-3 py-1.5 text-sm focus:outline-none focus:border-zinc-700 text-zinc-300">
            <option value="All">All Leagues</option>
            {["MLB", "NBA", "NHL", "PGA", "WNBA", "NFL", "WBB", "MBB", "MLS", "EPL", "NWSL", "COLLEGE-FOOTBALL"].map(l => <option key={l} value={l}>{l}</option>)}
          </select>
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
                <th className="px-4 py-3 font-medium">Picks</th>
                <th className="px-4 py-3 font-medium text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-800">
              {data.filter(row => row.status !== 'STATUS_FINAL' && (leagueFilter === 'All' || row.league === leagueFilter)).sort((a, b) => (a.startTime || 0) - (b.startTime || 0)).map(row => (
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
                  <td className="px-4 py-3 text-zinc-300 font-mono">{pickCounts[row.id] || 0}</td>
                  <td className="px-4 py-3 text-right">
                    <Link to={`/admin/matchups/${row.id}`} className="text-zinc-500 hover:text-white mr-3 inline-block"><Edit className="w-4 h-4" /></Link>
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


function AdminEditMatchup() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [matchup, setMatchup] = useState<any>(null);
  const [picks, setPicks] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchMatchup = async () => {
      setLoading(true);
      try {
        if (!id) return;
        const docRef = doc(db, 'matchups', id);
        const docSnap = await getDocs(query(collection(db, 'matchups'), where('__name__', '==', id)));

        if (!docSnap.empty) {
            const mData = docSnap.docs[0].data();
            // Start time formatting for input type="datetime-local"
            let formattedDate = "";
            if (mData.startTime) {
                const date = new Date(mData.startTime);
                const tzOffset = date.getTimezoneOffset() * 60000;
                formattedDate = new Date(date.getTime() - tzOffset).toISOString().slice(0, 16);
            }

            setMatchup({ ...mData, id: docSnap.docs[0].id, formStartTime: formattedDate });
        }

        const picksSnap = await getDocs(query(collection(db, 'picks'), where('matchupId', '==', id)));

        const picksData = await Promise.all(picksSnap.docs.map(async (pDoc) => {
            const p = pDoc.data();
            let userName = p.userId;
            let userImage = "";
            try {
                const uSnap = await getDocs(query(collection(db, 'users'), where('__name__', '==', p.userId)));
                if (!uSnap.empty) {
                    const u = uSnap.docs[0].data();
                    userName = u.name || p.userId;
                    userImage = u.image || "";
                }
            } catch (e) {
                console.error(e);
            }
            return { id: pDoc.id, ...p, userName, userImage };
        }));

        setPicks(picksData);
      } catch (e) {
        console.error(e);
      } finally {
        setLoading(false);
      }
    };
    fetchMatchup();
  }, [id]);

  const handleChange = (field: string, value: any) => {
    setMatchup((prev: any) => {
        const newData = { ...prev };
        const keys = field.split('.');
        let current = newData;
        for (let i = 0; i < keys.length - 1; i++) {
            if (!current[keys[i]]) current[keys[i]] = {};
            // Need to shallow copy the nested object as well
            current[keys[i]] = { ...current[keys[i]] };
            current = current[keys[i]];
        }
        current[keys[keys.length - 1]] = value;
        return newData;
    });
  };

  const handleUpdate = async () => {
    try {
        if (!id) return;
        const updateData = { ...matchup };
        delete updateData.id;
        delete updateData.formStartTime;

        if (matchup.formStartTime) {
            updateData.startTime = new Date(matchup.formStartTime).getTime();
        }

        updateData.cost = Number(updateData.cost);
        updateData.reward = Number(updateData.reward ?? 10);
        if (updateData.homeTeam) updateData.homeTeam.score = Number(updateData.homeTeam.score || 0);
        if (updateData.awayTeam) updateData.awayTeam.score = Number(updateData.awayTeam.score || 0);

        updateData.updatedAt = Date.now();
        await updateDoc(doc(db, 'matchups', id), updateData);
        alert('Matchup updated successfully!');
    } catch (e) {
        console.error(e);
        alert('Failed to update matchup');
    }
  };

  const handleFinalize = async () => {
      handleChange('status', 'STATUS_FINAL');

      try {
          const res = await fetch('/api/admin/grade-matchup', {
              method: 'POST',
              headers: {
                  'Content-Type': 'application/json'
              },
              body: JSON.stringify({ gameId: matchup.gameId })
          });

          const data = await res.json();
          if (data.success) {
              alert('Matchup finalized and picks graded successfully!');
          } else {
              alert('Failed to grade picks: ' + (data.error || 'Unknown error'));
          }
      } catch (e) {
          console.error('Error finalizing matchup:', e);
          alert('Failed to contact server for grading.');
      }
  };

  if (loading) return <div className="p-8 text-zinc-500">Loading matchup details...</div>;
  if (!matchup) return <div className="p-8 text-zinc-500">Matchup not found</div>;

  return (
    <div className="bg-[#121212] border border-zinc-800 rounded-xl overflow-hidden shadow-xl flex flex-col h-full max-h-[85vh] overflow-y-auto custom-scrollbar">
      <div className="p-6 border-b border-zinc-800 bg-[#18181A] sticky top-0 z-10 flex justify-between items-center">
        <div>
            <h2 className="text-2xl font-bold text-white mb-1">Edit Matchup</h2>
            <p className="text-zinc-400 text-sm">{matchup.title} - {matchup.league}</p>
        </div>
        <Button onClick={() => navigate('/admin/matchups')} variant="outline">Back to Matchups</Button>
      </div>

      <div className="p-6 space-y-6">
        {/* Basic Info */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-2">
                <label className="text-xs font-medium text-zinc-400 uppercase tracking-wider">Matchup Title</label>
                <input
                    type="text"
                    value={matchup.title || ''}
                    onChange={(e) => handleChange('title', e.target.value)}
                    className="w-full bg-zinc-900 border border-zinc-800 rounded-lg px-3 py-2 text-sm text-zinc-200 focus:outline-none focus:border-zinc-700"
                />
            </div>
            <div className="space-y-2">
                <label className="text-xs font-medium text-zinc-400 uppercase tracking-wider">League</label>
                <select
                    value={matchup.league || ''}
                    onChange={(e) => handleChange('league', e.target.value)}
                    className="w-full bg-zinc-900 border border-zinc-800 rounded-lg px-3 py-2 text-sm text-zinc-200 focus:outline-none focus:border-zinc-700"
                >
                    {["MLB", "NBA", "NHL", "PGA", "WNBA", "NFL", "WBB", "MBB", "MLS", "EPL", "NWSL", "COLLEGE-FOOTBALL", "TUR", "RPL"].map(l => <option key={l} value={l}>{l}</option>)}
                </select>
            </div>
            <div className="space-y-2 md:col-span-2">
                <label className="text-xs font-medium text-zinc-400 uppercase tracking-wider">Status</label>
                <select
                    value={matchup.status || ''}
                    onChange={(e) => handleChange('status', e.target.value)}
                    className="w-full bg-zinc-900 border border-zinc-800 rounded-lg px-3 py-2 text-sm text-zinc-200 focus:outline-none focus:border-zinc-700"
                >
                    <option value="STATUS_SCHEDULED">STATUS_SCHEDULED</option>
                    <option value="STATUS_IN_PROGRESS">STATUS_IN_PROGRESS</option>
                    <option value="STATUS_FINAL">STATUS_FINAL</option>
                    <option value="STATUS_POSTPONED">STATUS_POSTPONED</option>
                    <option value="STATUS_CANCELED">STATUS_CANCELED</option>
                </select>
            </div>
        </div>

        {/* Teams */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8 border-t border-zinc-800/50 pt-6">
            {/* Away Team */}
            <div className="space-y-4">
                <div className="space-y-2">
                    <label className="text-xs font-medium text-zinc-400 uppercase tracking-wider">Away Team Name</label>
                    <input type="text" value={matchup.awayTeam?.name || ''} onChange={(e) => handleChange('awayTeam.name', e.target.value)} className="w-full bg-zinc-900 border border-zinc-800 rounded-lg px-3 py-2 text-sm text-zinc-200 focus:outline-none focus:border-zinc-700" />
                </div>
                <div className="flex gap-4 items-center">
                    {matchup.awayTeam?.image && <img src={matchup.awayTeam.image} alt="Away" className="w-8 h-8 object-contain bg-white rounded p-0.5" />}
                    <div className="flex-1 space-y-2">
                        <label className="text-xs font-medium text-zinc-400 uppercase tracking-wider">Away Team Image URL</label>
                        <input type="text" value={matchup.awayTeam?.image || ''} onChange={(e) => handleChange('awayTeam.image', e.target.value)} className="w-full bg-zinc-900 border border-zinc-800 rounded-lg px-3 py-2 text-sm text-zinc-200 focus:outline-none focus:border-zinc-700" />
                    </div>
                </div>
                <div className="space-y-2">
                    <label className="text-xs font-medium text-zinc-400 uppercase tracking-wider">Away Team Score</label>
                    <input type="number" value={matchup.awayTeam?.score || 0} onChange={(e) => handleChange('awayTeam.score', e.target.value)} className="w-full bg-zinc-900 border border-zinc-800 rounded-lg px-3 py-2 text-sm text-zinc-200 focus:outline-none focus:border-zinc-700" />
                </div>
            </div>

            {/* Home Team */}
            <div className="space-y-4">
                <div className="space-y-2">
                    <label className="text-xs font-medium text-zinc-400 uppercase tracking-wider">Home Team Name</label>
                    <input type="text" value={matchup.homeTeam?.name || ''} onChange={(e) => handleChange('homeTeam.name', e.target.value)} className="w-full bg-zinc-900 border border-zinc-800 rounded-lg px-3 py-2 text-sm text-zinc-200 focus:outline-none focus:border-zinc-700" />
                </div>
                <div className="flex gap-4 items-center">
                    {matchup.homeTeam?.image && <img src={matchup.homeTeam.image} alt="Home" className="w-8 h-8 object-contain bg-white rounded p-0.5" />}
                    <div className="flex-1 space-y-2">
                        <label className="text-xs font-medium text-zinc-400 uppercase tracking-wider">Home Team Image URL</label>
                        <input type="text" value={matchup.homeTeam?.image || ''} onChange={(e) => handleChange('homeTeam.image', e.target.value)} className="w-full bg-zinc-900 border border-zinc-800 rounded-lg px-3 py-2 text-sm text-zinc-200 focus:outline-none focus:border-zinc-700" />
                    </div>
                </div>
                <div className="space-y-2">
                    <label className="text-xs font-medium text-zinc-400 uppercase tracking-wider">Home Team Score</label>
                    <input type="number" value={matchup.homeTeam?.score || 0} onChange={(e) => handleChange('homeTeam.score', e.target.value)} className="w-full bg-zinc-900 border border-zinc-800 rounded-lg px-3 py-2 text-sm text-zinc-200 focus:outline-none focus:border-zinc-700" />
                </div>
            </div>
        </div>

        {/* Details */}
        <div className="grid grid-cols-1 gap-6 border-t border-zinc-800/50 pt-6">
            <div className="space-y-2">
                <label className="text-xs font-medium text-zinc-400 uppercase tracking-wider">Type</label>
                <select value={matchup.type || 'SCORE'} onChange={(e) => handleChange('type', e.target.value)} className="w-full bg-zinc-900 border border-zinc-800 rounded-lg px-3 py-2 text-sm text-zinc-200 focus:outline-none focus:border-zinc-700">
                    <option value="SCORE">SCORE</option>
                    <option value="STATS">STATS</option>
                    <option value="LEADERS">LEADERS</option>
                    <option value="BOOLEAN">BOOLEAN</option>
                    <option value="CUSTOM">CUSTOM</option>
                    <option value="SPREAD">SPREAD</option>
                    <option value="CUSTOM_SCORE">CUSTOM_SCORE</option>
                    <option value="OVER_UNDER">OVER_UNDER</option>
                </select>
            </div>
            <div className="space-y-2">
                <label className="text-xs font-medium text-zinc-400 uppercase tracking-wider">Type Details</label>
                <input type="text" value={matchup.typeDetails || ''} onChange={(e) => handleChange('typeDetails', e.target.value)} className="w-full bg-zinc-900 border border-zinc-800 rounded-lg px-3 py-2 text-sm text-zinc-200 focus:outline-none focus:border-zinc-700" />
            </div>
            <div className="space-y-2">
                <label className="text-xs font-medium text-zinc-400 uppercase tracking-wider">Cost</label>
                <input type="number" value={matchup.cost || 0} onChange={(e) => handleChange('cost', e.target.value)} className="w-full bg-zinc-900 border border-zinc-800 rounded-lg px-3 py-2 text-sm text-zinc-200 focus:outline-none focus:border-zinc-700" />
            </div>
            <div className="space-y-2">
                <label className="text-xs font-medium text-zinc-400 uppercase tracking-wider">Reward</label>
                <input type="number" value={matchup.reward ?? 10} onChange={(e) => handleChange('reward', e.target.value)} className="w-full bg-zinc-900 border border-zinc-800 rounded-lg px-3 py-2 text-sm text-zinc-200 focus:outline-none focus:border-zinc-700" />
            </div>
            <div className="space-y-2">
                <label className="text-xs font-medium text-zinc-400 uppercase tracking-wider">Start Time</label>
                <input type="datetime-local" value={matchup.formStartTime || ''} onChange={(e) => handleChange('formStartTime', e.target.value)} className="w-full bg-zinc-900 border border-zinc-800 rounded-lg px-3 py-2 text-sm text-zinc-200 focus:outline-none focus:border-zinc-700 [color-scheme:dark]" />
            </div>
        </div>

        {/* Toggles */}
        <div className="flex gap-8 border-t border-zinc-800/50 pt-6 pb-2">
            <label className="flex items-center gap-3 cursor-pointer">
                <input type="checkbox" checked={matchup.active || false} onChange={(e) => handleChange('active', e.target.checked)} className="w-4 h-4 rounded border-zinc-700 bg-zinc-900 text-green-500 focus:ring-green-500/20" />
                <span className="text-sm font-medium text-zinc-300">Active</span>
            </label>
            <label className="flex items-center gap-3 cursor-pointer">
                <input type="checkbox" checked={matchup.featured || false} onChange={(e) => handleChange('featured', e.target.checked)} className="w-4 h-4 rounded border-zinc-700 bg-zinc-900 text-green-500 focus:ring-green-500/20" />
                <span className="text-sm font-medium text-zinc-300">Featured</span>
            </label>
        </div>

        {/* Actions */}
        <div className="border-t border-zinc-800/50 pt-6 space-y-4">
            <h3 className="font-bold text-lg text-white">In Progress Actions</h3>
            <div className="flex flex-col gap-3">
                <button onClick={handleFinalize} className="w-full bg-red-900/40 hover:bg-red-800/60 text-red-100 font-bold py-3 rounded-lg transition-colors border border-red-900/50">Finalize Matchup</button>
                <button className="w-full bg-zinc-800 hover:bg-zinc-700 text-zinc-200 font-bold py-3 rounded-lg transition-colors">Release Picks</button>
            </div>
        </div>

        <div className="pt-4 flex justify-end">
            <Button onClick={handleUpdate} className="bg-emerald-500 hover:bg-emerald-600 text-white border-none">Update Matchup</Button>
        </div>
      </div>

      {/* Picks Section */}
      <div className="border-t border-zinc-800 bg-[#18181A] p-6">
        <h3 className="font-bold text-lg mb-4 text-white">Picks ({picks.length})</h3>
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm whitespace-nowrap">
            <thead className="text-zinc-500 border-b border-zinc-800/50">
              <tr>
                <th className="pb-3 font-medium">User</th>
                <th className="pb-3 font-medium">Pick</th>
                <th className="pb-3 font-medium">Status</th>
                <th className="pb-3 font-medium">Coins</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-800/50">
                {picks.map(p => (
                    <tr key={p.id} className="hover:bg-zinc-800/30 transition-colors">
                        <td className="py-4">
                            <div className="flex items-center gap-3">
                                <img src={p.userImage || `https://api.dicebear.com/7.x/avataaars/svg?seed=${p.userId}`} className="w-8 h-8 rounded-full bg-zinc-800" />
                                <span className="font-medium text-zinc-300">{p.userName}</span>
                            </div>
                        </td>
                        <td className="py-4">
                            <div className="flex items-center gap-2">
                                <img src={p.team?.image} className="w-5 h-5 object-contain" />
                                <span className="text-zinc-300">{p.team?.name}</span>
                            </div>
                        </td>
                        <td className="py-4">
                            <span className="px-2 py-0.5 rounded text-[10px] uppercase font-bold tracking-wider bg-zinc-800 text-zinc-400">
                                {p.status || 'PENDING'}
                            </span>
                        </td>
                        <td className="py-4 text-zinc-400">{p.coins || 0}</td>
                    </tr>
                ))}
                {picks.length === 0 && (
                    <tr>
                        <td colSpan={4} className="py-8 text-center text-zinc-500">No picks found for this matchup.</td>
                    </tr>
                )}
            </tbody>
          </table>
        </div>
      </div>

    </div>
  );
}

function AdminLeagues() {
  const [leagues, setLeagues] = useState<{ id: string, active: boolean }[]>([]);
  const [loading, setLoading] = useState(true);
  const ALL_LEAGUES = ["MLB", "NBA", "NHL", "PGA", "WNBA", "NFL", "WBB", "MBB", "MLS", "EPL", "NWSL", "COLLEGE-FOOTBALL"];

  const fetchLeagues = async () => {
    setLoading(true);
    try {
      const snap = await getDocs(collection(db, 'leagueSettings'));
      const settingsMap = new Map();
      snap.docs.forEach(d => settingsMap.set(d.id, d.data()));

      const formatted = ALL_LEAGUES.map(league => ({
        id: league,
        active: settingsMap.has(league) ? settingsMap.get(league).active : true
      }));

      setLeagues(formatted);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchLeagues();
  }, []);

  const handleToggle = async (leagueId: string, currentActive: boolean) => {
    try {
      await setDoc(doc(db, 'leagueSettings', leagueId), {
        active: !currentActive,
        updatedAt: Date.now()
      }, { merge: true });

      setLeagues(prev => prev.map(l => l.id === leagueId ? { ...l, active: !currentActive } : l));
    } catch (e) {
      console.error(e);
      alert("Failed to update league settings.");
    }
  };

  const handleDeactivateScheduled = async (leagueId: string) => {
    if (!confirm(`Are you sure you want to deactivate all SCHEDULED games for ${leagueId}?`)) return;

    try {
      const snap = await getDocs(query(
        collection(db, 'matchups'),
        where('league', '==', leagueId),
        where('status', '==', 'STATUS_SCHEDULED')
      ));

      let batch = writeBatch(db);
      let opCount = 0;

      for (const d of snap.docs) {
        batch.update(doc(db, 'matchups', d.id), { active: false, updatedAt: Date.now() });
        opCount++;

        if (opCount === 500) {
          await batch.commit();
          batch = writeBatch(db);
          opCount = 0;
        }
      }

      if (opCount > 0) {
        await batch.commit();
      }

      alert(`Successfully deactivated scheduled games for ${leagueId}.`);
    } catch (e) {
      console.error(e);
      alert(`Failed to deactivate games for ${leagueId}.`);
    }
  };

  if (loading) return <div className="p-8 text-zinc-500">Loading leagues...</div>;

  return (
    <div className="bg-[#121212] border border-zinc-800 rounded-xl overflow-hidden shadow-xl">
      <div className="p-4 border-b border-zinc-800 flex justify-between items-center bg-[#18181A]">
        <h3 className="font-bold text-lg">League Settings</h3>
        <Button variant="secondary" size="sm" onClick={fetchLeagues}>Refresh</Button>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full text-left text-sm whitespace-nowrap">
          <thead className="bg-[#18181A] text-zinc-400 border-b border-zinc-800">
            <tr>
              <th className="px-4 py-3 font-medium">League</th>
              <th className="px-4 py-3 font-medium">Status (Default)</th>
              <th className="px-4 py-3 font-medium text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-zinc-800">
            {leagues.map(l => (
              <tr key={l.id} className="hover:bg-zinc-800/30 transition-colors">
                <td className="px-4 py-3 font-bold text-zinc-300">{l.id}</td>
                <td className="px-4 py-3">
                  <button
                    onClick={() => handleToggle(l.id, l.active)}
                    className={`px-2 py-0.5 rounded text-[10px] uppercase font-bold tracking-wider transition-colors ${l.active ? 'bg-green-500/20 text-green-400 hover:bg-red-500/20 hover:text-red-400' : 'bg-red-500/20 text-red-400 hover:bg-green-500/20 hover:text-green-400'}`}
                  >
                    {l.active ? 'ACTIVE' : 'INACTIVE'}
                  </button>
                </td>
                <td className="px-4 py-3 text-right">
                  <Button variant="outline" size="sm" onClick={() => handleDeactivateScheduled(l.id)}>
                    Deactivate Scheduled Games
                  </Button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
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
  const [sidebarOpen, setSidebarOpen] = useState(false);

  useEffect(() => {
    setSidebarOpen(false);
  }, [location.pathname]);

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
       <AdminSidebar open={sidebarOpen} setOpen={setSidebarOpen} />

       <div className="flex-1 flex flex-col h-screen overflow-hidden relative w-full">
          <div className="absolute -z-10 h-full w-full bg-[radial-gradient(#22c55e_1px,transparent_1px)] [background-size:24px_24px] [mask-image:radial-gradient(ellipse_50%_50%_at_50%_50%,#000_10%,transparent_80%)] opacity-5"></div>

          <header className="h-[4.5rem] flex items-center gap-4 px-4 md:px-8 border-b border-zinc-800/80 bg-[#121212]/80 backdrop-blur-md">
            <button className="md:hidden text-zinc-400 hover:text-white" onClick={() => setSidebarOpen(true)}>
              <Menu className="w-6 h-6" />
            </button>
            <h2 className="font-display text-xl font-bold tracking-wide capitalize text-zinc-100">{headerTitle.replace('-', ' ')}</h2>
          </header>

          <main className="flex-1 overflow-y-auto p-8 relative">
             <Routes>
                <Route path="leagues" element={<AdminLeagues />} />
                {/* Matchups routes */}
                <Route path="matchups" element={<AdminMatchups />} />
                <Route path="picks" element={<GenericTable collectionName="picks" />} />
                <Route path="matchups/create" element={<CreateMatchupPage />} />
                <Route path="matchups/find" element={<AdminPlaceholder title="Find Matchup" />} />
                <Route path="matchups/:id" element={<AdminEditMatchup />} />

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
