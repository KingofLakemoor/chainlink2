import React, { useState, useEffect } from 'react';
import { collection, getDocs, deleteDoc, doc, updateDoc, writeBatch, query, where, documentId } from 'firebase/firestore';
import { db } from '../../../lib/firebase';
import { Link } from 'react-router-dom';
import { Button } from '../../../components/ui/button';
import { Trash2, Search, Edit, RefreshCw } from 'lucide-react';
import { scrapeLeagueSchedules } from '../../../services/espnScraper';

export function AdminMatchups() {
  const [data, setData] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [syncing, setSyncing] = useState(false);
  const [leagueFilter, setLeagueFilter] = useState('All');
  const [statusFilter, setStatusFilter] = useState('All');
  const [activeFilter, setActiveFilter] = useState('ACTIVE');
  const [searchQuery, setSearchQuery] = useState('');
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
      let scraperConfig: { maxMoneylineOdds?: number, sportOverrides?: Record<string, number> } = {};
      try {
        const scraperSnap = await getDocs(query(collection(db, 'systemSettings')));
        const scraperDoc = scraperSnap.docs.find(d => d.id === 'scraper')?.data();
        if (scraperDoc) {
          scraperConfig = scraperDoc as any;
        }
      } catch (e) {
        console.error("Error fetching system settings", e);
      }

      const leagues = ["MLB", "NBA", "NHL", "PGA", "WNBA", "NFL", "WBB", "MBB", "MLS", "EPL", "NWSL", "CFB", "CBASE", "FIFA", "FRA", "TUR", "RPL", "CHN", "ATP", "WTA", "CRICKET"];

      let totalImported = 0;

      for (const league of leagues) {
        try {
          // @ts-ignore
          const result = await scrapeLeagueSchedules(league, false, scraperConfig);
          const scrapedMatchups = result.data;

          if (scrapedMatchups && scrapedMatchups.length > 0) {
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
                 // Check if it needs update or migration
                 const existingData = existingDoc.data();
                 const newTitle = existingData.hasCustomTitle ? existingData.title : scrapedMatchup.title;
                 const needsUpdate = existingData.status !== scrapedMatchup.status ||
                     existingData.startTime !== scrapedMatchup.startTime ||
                     existingData.homeTeam?.score !== scrapedMatchup.homeTeam?.score ||
                     existingData.awayTeam?.score !== scrapedMatchup.awayTeam?.score ||
                     existingData.title !== newTitle ||
                     existingData.homeTeam?.name !== scrapedMatchup.homeTeam?.name ||
                     existingData.homeTeam?.image !== scrapedMatchup.homeTeam?.image ||
                     existingData.homeTeam?.id !== scrapedMatchup.homeTeam?.id ||
                     existingData.awayTeam?.name !== scrapedMatchup.awayTeam?.name ||
                     existingData.awayTeam?.image !== scrapedMatchup.awayTeam?.image ||
                     existingData.awayTeam?.id !== scrapedMatchup.awayTeam?.id ||
                     existingData.metadata?.overUnder !== scrapedMatchup.metadata?.overUnder ||
                     (existingData.type !== 'SPREAD' && existingData.metadata?.spread !== scrapedMatchup.metadata?.spread) ||
                     existingData.metadata?.mlHome !== scrapedMatchup.metadata?.mlHome ||
                     existingData.metadata?.mlAway !== scrapedMatchup.metadata?.mlAway;

                 if (existingDoc.id !== gameId) {
                   // Migrate to use gameId as the document ID
                   const newDocRef = doc(db, 'matchups', gameId);
                   const updateData = {
                     ...existingData,
                     title: newTitle,
                     status: scrapedMatchup.status,
                     startTime: scrapedMatchup.startTime,
                     homeTeam: {
                         ...(existingData.homeTeam || {}),
                         id: scrapedMatchup.homeTeam?.id || existingData.homeTeam?.id,
                         name: scrapedMatchup.homeTeam?.name || existingData.homeTeam?.name,
                         image: scrapedMatchup.homeTeam?.image || existingData.homeTeam?.image,
                         score: scrapedMatchup.homeTeam?.score || existingData.homeTeam?.score || 0
                     },
                     awayTeam: {
                         ...(existingData.awayTeam || {}),
                         id: scrapedMatchup.awayTeam?.id || existingData.awayTeam?.id,
                         name: scrapedMatchup.awayTeam?.name || existingData.awayTeam?.name,
                         image: scrapedMatchup.awayTeam?.image || existingData.awayTeam?.image,
                         score: scrapedMatchup.awayTeam?.score || existingData.awayTeam?.score || 0
                     },
                     metadata: {
                         ...(existingData.metadata || {}),
                         overUnder: scrapedMatchup.metadata?.overUnder,
                         spread: existingData.type === 'SPREAD' ? existingData.metadata?.spread : scrapedMatchup.metadata?.spread,
                         network: scrapedMatchup.metadata?.network,
                         mlHome: scrapedMatchup.metadata?.mlHome,
                         mlAway: scrapedMatchup.metadata?.mlAway
                     },
                     updatedAt: Date.now()
                   };
                   batch.set(newDocRef, updateData);
                   batch.delete(doc(db, 'matchups', existingDoc.id));
                   opCount += 2;
                   existingMap.set(gameId, { id: gameId, data: () => updateData } as any);
                 } else if (needsUpdate) {
                   batch.update(doc(db, 'matchups', existingDoc.id), {
                     title: newTitle,
                     status: scrapedMatchup.status,
                     startTime: scrapedMatchup.startTime,
                     'homeTeam.id': scrapedMatchup.homeTeam?.id || existingData.homeTeam?.id,
                     'homeTeam.name': scrapedMatchup.homeTeam?.name || existingData.homeTeam?.name,
                     'homeTeam.image': scrapedMatchup.homeTeam?.image || existingData.homeTeam?.image,
                     'homeTeam.score': scrapedMatchup.homeTeam?.score || 0,
                     'awayTeam.id': scrapedMatchup.awayTeam?.id || existingData.awayTeam?.id,
                     'awayTeam.name': scrapedMatchup.awayTeam?.name || existingData.awayTeam?.name,
                     'awayTeam.image': scrapedMatchup.awayTeam?.image || existingData.awayTeam?.image,
                     'awayTeam.score': scrapedMatchup.awayTeam?.score || 0,
                     'metadata.overUnder': scrapedMatchup.metadata?.overUnder,
                     'metadata.spread': existingData.type === 'SPREAD' ? existingData.metadata?.spread : scrapedMatchup.metadata?.spread,
                     'metadata.network': scrapedMatchup.metadata?.network,
                     'metadata.mlHome': scrapedMatchup.metadata?.mlHome,
                     'metadata.mlAway': scrapedMatchup.metadata?.mlAway,
                     updatedAt: Date.now()
                   });
                   opCount++;
                 }
               } else {
                 // Create new
                 const newDocRef = doc(db, 'matchups', gameId);
                 batch.set(newDocRef, {
                   ...scrapedMatchup,
                   active: scrapedMatchup.active && defaultActive,
                   updatedAt: Date.now(),
                   createdAt: Date.now()
                 });
                 opCount++;
                 newCount++;

                 // Add to tracking map for this loop
                 existingMap.set(gameId, { id: gameId, data: () => scrapedMatchup } as any);
               }

               if (opCount >= 500) {
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

  const handleToggleLink4Excluded = async (id: string, currentExcluded: boolean) => {
    try {
      await updateDoc(doc(db, 'matchups', id), {
        link4Excluded: !currentExcluded,
        updatedAt: Date.now()
      });
      setData(prev => prev.map(m => m.id === id ? { ...m, link4Excluded: !currentExcluded } : m));
    } catch (e) {
      console.error("Error toggling Link4 excluded status", e);
      alert("Failed to toggle Link4 excluded status");
    }
  };

  if (loading) return <div className="p-8 text-zinc-500">Loading matchups...</div>;

  const statuses = Array.from(new Set(data.map(m => m.status))).filter(Boolean);

  const filteredData = data.filter(row => {
    if (row.abandoned || row.status === 'STATUS_FINAL' || row.status === 'STATUS_POSTPONED' || row.status === 'STATUS_CANCELED') return false;
    if (leagueFilter !== 'All' && row.league !== leagueFilter) return false;
    if (statusFilter !== 'All' && row.status !== statusFilter) return false;
    if (activeFilter !== 'All') {
      const isActive = activeFilter === 'ACTIVE';
      if (row.active !== isActive) return false;
    }
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      const matchesTitle = row.title?.toLowerCase().includes(query);
      const matchesLeague = row.league?.toLowerCase().includes(query);
      if (!matchesTitle && !matchesLeague) return false;
    }
    return true;
  });

  return (
    <div className="bg-[#121212] border border-zinc-800 rounded-xl shadow-xl flex flex-col h-full max-h-[85vh] overflow-hidden">
      <div className="p-4 border-b border-zinc-800 flex flex-col md:flex-row gap-4 justify-between items-start md:items-center bg-[#18181A]">
        <h3 className="font-bold text-lg">Matchups Management ({filteredData.length})</h3>
        <div className="flex flex-wrap items-center gap-3">
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
            {["MLB", "NBA", "NHL", "PGA", "WNBA", "NFL", "WBB", "MBB", "MLS", "EPL", "NWSL", "CFB", "CBASE", "FIFA", "FRA", "TUR", "RPL", "CHN", "ATP", "WTA", "CRICKET"].map(l => <option key={l} value={l}>{l}</option>)}
          </select>
          <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)} className="bg-zinc-900 border border-zinc-800 rounded-lg px-3 py-1.5 text-sm focus:outline-none focus:border-zinc-700 text-zinc-300">
            <option value="All">All Statuses</option>
            {statuses.map(s => <option key={s as string} value={s as string}>{s as string}</option>)}
          </select>
          <select value={activeFilter} onChange={(e) => setActiveFilter(e.target.value)} className="bg-zinc-900 border border-zinc-800 rounded-lg px-3 py-1.5 text-sm focus:outline-none focus:border-zinc-700 text-zinc-300">
            <option value="All">All Active States</option>
            <option value="ACTIVE">Active</option>
            <option value="INACTIVE">Inactive</option>
          </select>
          <div className="relative">
            <Search className="w-4 h-4 absolute left-3 top-2.5 text-zinc-500" />
            <input type="text" value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} placeholder="Search Matchups..." className="bg-zinc-900 border border-zinc-800 rounded-lg pl-9 pr-4 py-1.5 text-sm focus:outline-none focus:border-zinc-700 w-64" />
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
                <th className="px-4 py-3 font-medium">ML</th>
                <th className="px-4 py-3 font-medium">Status</th>
                <th className="px-4 py-3 font-medium">Active</th>
                <th className="px-4 py-3 font-medium">Link4</th>
                <th className="px-4 py-3 font-medium">Start Time</th>
                <th className="px-4 py-3 font-medium">Picks</th>
                <th className="px-4 py-3 font-medium text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-800">
              {filteredData.sort((a, b) => (a.startTime || 0) - (b.startTime || 0)).map(row => (
                <tr key={row.id} className="hover:bg-zinc-800/30 transition-colors">
                  <td className="px-4 py-3 font-bold text-zinc-300">{row.league}</td>
                  <td className="px-4 py-3 text-zinc-200">{row.title}</td>
                  <td className="px-4 py-3 text-zinc-400 font-mono">{row.metadata?.mlHome !== undefined && row.metadata?.mlHome !== null ? row.metadata.mlHome : '-'}</td>
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
                  <td className="px-4 py-3">
                    <button
                      onClick={() => handleToggleLink4Excluded(row.id, !!row.link4Excluded)}
                      className={`px-2 py-0.5 rounded text-[10px] uppercase font-bold tracking-wider transition-colors ${!row.link4Excluded ? 'bg-green-500/20 text-green-400 hover:bg-red-500/20 hover:text-red-400' : 'bg-red-500/20 text-red-400 hover:bg-green-500/20 hover:text-green-400'}`}
                      title={row.link4Excluded ? "Include in Link4" : "Exclude from Link4"}
                    >
                      {!row.link4Excluded ? 'INCLUDED' : 'EXCLUDED'}
                    </button>
                  </td>
                  <td className="px-4 py-3 text-zinc-500">{new Date(row.startTime).toLocaleString()}</td>
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
