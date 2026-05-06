import { useState, useEffect } from 'react';
import { collection, getDocs, doc, getDoc, query, where, updateDoc, writeBatch, deleteDoc } from 'firebase/firestore';
import { db } from '../../../lib/firebase';
import { useNavigate, useParams } from 'react-router-dom';
import { Button } from '../../../components/ui/button';
import { scrapeLeagueSchedules } from '../../../services/espnScraper';
import { RefreshCw, Trash2 } from 'lucide-react';

export default function PickEmCampaignDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [campaign, setCampaign] = useState<any>(null);
  const [matchups, setMatchups] = useState<any[]>([]);
  const [selectedWeek, setSelectedWeek] = useState<number>(1);
  const [loading, setLoading] = useState(true);
  const [matchupsLoading, setMatchupsLoading] = useState(false);

  const fetchCampaign = async () => {
    if (!id) return;
    try {
      const docRef = doc(db, 'pickemCampaigns', id);
      const docSnap = await getDoc(docRef);
      if (docSnap.exists()) {
        const data = docSnap.data();
        setCampaign({ id: docSnap.id, ...data });
        setSelectedWeek(data.currentWeek || 1);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const fetchMatchups = async (week: number) => {
    if (!id) return;
    setMatchupsLoading(true);
    try {
      const q = query(
        collection(db, 'pickemMatchups'),
        where('campaignId', '==', id),
        where('week', '==', week)
      );
      const snap = await getDocs(q);
      setMatchups(snap.docs.map(d => ({ id: d.id, ...d.data() })));
    } catch (err) {
      console.error(err);
    } finally {
      setMatchupsLoading(false);
    }
  };

  useEffect(() => {
    fetchCampaign();
  }, [id]);

  useEffect(() => {
    if (campaign && selectedWeek) {
      fetchMatchups(selectedWeek);
    }
  }, [campaign, selectedWeek]);

  const updateCurrentWeek = async () => {
    if (!campaign || !id) return;
    try {
      await updateDoc(doc(db, 'pickemCampaigns', id), {
        currentWeek: selectedWeek
      });
      setCampaign(prev => ({ ...prev, currentWeek: selectedWeek }));
      alert(`Current week updated to ${selectedWeek}`);
    } catch (err) {
      console.error(err);
      alert('Failed to update week');
    }
  };

  const handleSyncMatchups = async () => {
    if (!campaign || !id) return;
    if (!confirm(`Sync ${campaign.league} matchups for Week ${selectedWeek}?`)) return;

    setMatchupsLoading(true);
    try {
      const res = await scrapeLeagueSchedules(campaign.league, false);
      if (!res.data || res.data.length === 0) {
        alert("No games found to sync.");
        return;
      }

      let count = 0;
      let batch = writeBatch(db);
      let batchCount = 0;

      for (const m of res.data) {
        const pickemMatchupId = `${id}_${selectedWeek}_${m.gameId}`;
        const docRef = doc(db, 'pickemMatchups', pickemMatchupId);

        batch.set(docRef, {
          campaignId: id,
          week: selectedWeek,
          gameId: m.gameId,
          title: m.title,
          startTime: m.startTime,
          status: m.status,
          statusDesc: m.statusDesc,
          homeTeam: m.homeTeam,
          awayTeam: m.awayTeam,
          createdAt: Date.now()
        }, { merge: true });

        count++;
        batchCount++;

        if (batchCount === 500) {
          await batch.commit();
          batch = writeBatch(db);
          batchCount = 0;
        }
      }

      if (batchCount > 0) {
        await batch.commit();
      }

      alert(`Synced ${count} matchups successfully!`);
      await fetchMatchups(selectedWeek);
    } catch (err) {
      console.error(err);
      alert('Failed to sync matchups');
    } finally {
      setMatchupsLoading(false);
    }
  };

  const handleDeleteMatchup = async (matchupId: string) => {
    if (!confirm('Are you sure you want to remove this matchup from the pool?')) return;

    try {
      await deleteDoc(doc(db, 'pickemMatchups', matchupId));
      setMatchups(prev => prev.filter(m => m.id !== matchupId));
    } catch (err) {
      console.error(err);
      alert('Failed to remove matchup');
    }
  };

  if (loading) return <div className="p-8">Loading...</div>;
  if (!campaign) return <div className="p-8">Campaign not found</div>;

  return (
    <div className="max-w-5xl mx-auto space-y-6">
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-2xl font-bold text-white">{campaign.name}</h2>
        <Button variant="ghost" onClick={() => navigate('/admin/pickem')}>Back</Button>
      </div>

      <div className="bg-[#121212] border border-zinc-800 rounded-xl p-6 flex flex-col md:flex-row gap-6 justify-between items-start md:items-center">
        <div>
          <p className="text-zinc-400">League: <span className="text-white font-medium">{campaign.league}</span></p>
          <p className="text-zinc-400">Active Week: <span className="text-white font-medium">{campaign.currentWeek}</span></p>
        </div>

        <div className="flex items-end gap-4">
          <div>
            <label className="block text-sm font-medium text-zinc-400 mb-1">Manage Week</label>
            <select
              value={selectedWeek}
              onChange={(e) => setSelectedWeek(Number(e.target.value))}
              className="bg-[#18181A] border border-zinc-800 rounded-lg px-4 py-2 text-white"
            >
              {[...Array(20)].map((_, i) => (
                <option key={i+1} value={i+1}>Week {i+1}</option>
              ))}
            </select>
          </div>
          <Button onClick={updateCurrentWeek} variant="secondary">Set as Active Week</Button>
        </div>
      </div>

      <div className="bg-[#121212] border border-zinc-800 rounded-xl overflow-hidden shadow-xl">
        <div className="p-4 border-b border-zinc-800 flex justify-between items-center bg-[#18181A]">
          <h3 className="font-bold text-lg capitalize">Week {selectedWeek} Matchups ({matchups.length})</h3>
          <Button onClick={handleSyncMatchups} size="sm" className="gap-2" disabled={matchupsLoading}>
             <RefreshCw className={`w-4 h-4 ${matchupsLoading ? 'animate-spin' : ''}`} />
             Sync Matchups
          </Button>
        </div>

        {matchupsLoading ? (
          <div className="p-12 text-center text-zinc-500 font-medium">Loading matchups...</div>
        ) : matchups.length === 0 ? (
          <div className="p-12 text-center text-zinc-500 font-medium">No matchups found for Week {selectedWeek}.</div>
        ) : (
          <div className="overflow-x-auto max-h-[60vh] custom-scrollbar">
            <table className="w-full text-left text-sm whitespace-nowrap">
              <thead className="bg-[#18181A] text-zinc-400 sticky top-0 border-b border-zinc-800 z-10">
                <tr>
                  <th className="px-4 py-3 font-medium">Game Title</th>
                  <th className="px-4 py-3 font-medium">Status</th>
                  <th className="px-4 py-3 font-medium">Start Time</th>
                  <th className="px-4 py-3 font-medium text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-800/50">
                {matchups.map(m => (
                  <tr key={m.id} className="hover:bg-zinc-800/20 transition-colors">
                    <td className="px-4 py-3 font-medium text-zinc-200">{m.title}</td>
                    <td className="px-4 py-3 text-zinc-400">{m.statusDesc || m.status}</td>
                    <td className="px-4 py-3 text-zinc-400">{new Date(m.startTime).toLocaleString()}</td>
                    <td className="px-4 py-3 text-right">
                      <button onClick={() => handleDeleteMatchup(m.id)} className="text-red-500/70 hover:text-red-500 p-2" title="Remove Matchup">
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
