import React, { useState, useEffect } from 'react';
import { collection, getDocs, doc, query, where, setDoc, getDoc, deleteDoc } from 'firebase/firestore';
import { db } from '../../lib/firebase';
import { useAuth } from '../../lib/auth-context';
import { Button } from '../../components/ui/button';
import { Layers, CheckCircle } from 'lucide-react';
import { MATCHUP_FINAL_STATUSES } from '../../services/espnScraper';

export default function PickEmPage() {
  const { user } = useAuth();
  const [campaigns, setCampaigns] = useState<any[]>([]);
  const [selectedCampaign, setSelectedCampaign] = useState<any>(null);
  const [selectedWeek, setSelectedWeek] = useState<number>(1);
  const [matchups, setMatchups] = useState<any[]>([]);
  const [userPicks, setUserPicks] = useState<Record<string, any>>({});
  const [loading, setLoading] = useState(true);
  const [matchupsLoading, setMatchupsLoading] = useState(false);

  useEffect(() => {
    const fetchCampaigns = async () => {
      try {
        const snap = await getDocs(collection(db, 'pickemCampaigns'));
        const camps = snap.docs.map(d => ({ id: d.id, ...(d.data() as any) }));
        setCampaigns(camps);
        if (camps.length > 0) {
          setSelectedCampaign(camps[0]);
          setSelectedWeek(camps[0].currentWeek || 1);
        }
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    };
    fetchCampaigns();
  }, []);

  const fetchMatchupsAndPicks = async (campaignId: string, week: number) => {
    if (!user) return;
    setMatchupsLoading(true);
    try {
      const mQuery = query(
        collection(db, 'pickemMatchups'),
        where('campaignId', '==', campaignId),
        where('week', '==', week)
      );
      const mSnap = await getDocs(mQuery);
      setMatchups(mSnap.docs.map(d => ({ id: d.id, ...d.data() })).sort((a: any, b: any) => a.startTime - b.startTime));

      const pQuery = query(
        collection(db, 'pickemPicks'),
        where('campaignId', '==', campaignId),
        where('week', '==', week),
        where('participantId', '==', user.uid)
      );
      const pSnap = await getDocs(pQuery);
      const picksMap: Record<string, any> = {};
      pSnap.docs.forEach(d => {
        const data = d.data();
        picksMap[data.matchupId] = { id: d.id, ...data };
      });
      setUserPicks(picksMap);
    } catch (err) {
      console.error(err);
    } finally {
      setMatchupsLoading(false);
    }
  };

  useEffect(() => {
    if (selectedCampaign && selectedWeek && user) {
      fetchMatchupsAndPicks(selectedCampaign.id, selectedWeek);
    }
  }, [selectedCampaign, selectedWeek, user]);

  const handlePick = async (matchup: any, teamId: string) => {
    if (!user || !selectedCampaign) return;
    if (matchup.status !== 'STATUS_SCHEDULED') return;

    try {
      const pickId = `${selectedCampaign.id}_${selectedWeek}_${matchup.id}_${user.uid}`;
      const pickRef = doc(db, 'pickemPicks', pickId);

      const existingPick = userPicks[matchup.id];
      if (existingPick?.pick.teamId === teamId) {
        // Unselect if clicking the same team
        await deleteDoc(pickRef);
        setUserPicks(prev => {
          const next = { ...prev };
          delete next[matchup.id];
          return next;
        });
        return;
      }

      const newPick = {
        campaignId: selectedCampaign.id,
        participantId: user.uid,
        matchupId: matchup.id,
        week: selectedWeek,
        pick: { teamId },
        status: 'PENDING',
        pointsEarned: 0,
        submittedAt: Date.now(),
        createdAt: Date.now(),
        updatedAt: Date.now()
      };

      await setDoc(pickRef, newPick, { merge: true });
      setUserPicks(prev => ({ ...prev, [matchup.id]: { id: pickId, ...newPick } }));
    } catch (err) {
      console.error(err);
      alert('Failed to save pick');
    }
  };

  if (loading) return <div className="p-8 text-center text-zinc-500">Loading Pick'em...</div>;

  if (campaigns.length === 0) {
    return (
      <div className="flex-1 p-6 md:p-8 max-w-7xl mx-auto w-full pt-20 md:pt-8 text-center">
        <Layers className="w-16 h-16 text-zinc-600 mx-auto mb-4" />
        <h2 className="text-2xl font-bold text-white mb-2">No Active Campaigns</h2>
        <p className="text-zinc-400">There are no Pick'em campaigns available right now.</p>
      </div>
    );
  }

  return (
    <div className="flex-1 p-6 md:p-8 max-w-7xl mx-auto w-full pt-20 md:pt-8">
      <div className="mb-8">
        <h1 className="text-3xl md:text-4xl font-display font-black text-white mb-2 uppercase tracking-tight flex items-center gap-3">
          <Layers className="w-8 h-8 text-[#22c55e]" />
          Pick'em
        </h1>
        <p className="text-zinc-400 text-lg">Make weekly picks and compete on the leaderboard.</p>
      </div>

      <div className="flex flex-col md:flex-row gap-4 mb-8">
        <select
          value={selectedCampaign?.id || ''}
          onChange={e => {
            const camp = campaigns.find(c => c.id === e.target.value);
            setSelectedCampaign(camp);
            setSelectedWeek(camp?.currentWeek || 1);
          }}
          className="bg-[#121212] border border-zinc-800 rounded-xl px-4 py-3 text-white text-lg font-medium"
        >
          {campaigns.map(c => (
            <option key={c.id} value={c.id}>{c.name}</option>
          ))}
        </select>

        <select
          value={selectedWeek}
          onChange={e => setSelectedWeek(Number(e.target.value))}
          className="bg-[#121212] border border-zinc-800 rounded-xl px-4 py-3 text-white text-lg font-medium"
        >
          {[...Array(20)].map((_, i) => (
            <option key={i+1} value={i+1}>Week {i+1}</option>
          ))}
        </select>
      </div>

      {matchupsLoading ? (
        <div className="text-center py-20 text-zinc-500">Loading matchups...</div>
      ) : matchups.length === 0 ? (
        <div className="text-center py-20 bg-[#121212] border border-zinc-800 rounded-xl">
          <Layers className="w-12 h-12 mx-auto mb-4 text-zinc-600" />
          <p className="text-zinc-400 text-lg">No matchups scheduled for Week {selectedWeek}.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {matchups.map(m => {
            const pick = userPicks[m.id];
            const isLocked = m.status !== 'STATUS_SCHEDULED';

            const isSpread = m.type === 'SPREAD' && m.metadata?.spread !== undefined;
            const spread = m.metadata?.spread || 0;

            return (
              <div key={m.id} className="bg-[#121212] border border-zinc-800 rounded-xl overflow-hidden flex flex-col">
                <div className="p-3 bg-[#18181A] border-b border-zinc-800 text-xs text-zinc-400 font-medium flex justify-between items-center">
                  <span>{new Date(m.startTime).toLocaleString()}</span>
                  <div className="flex items-center gap-2">
                    {isSpread && (
                      <span className="px-2 py-1 text-[10px] uppercase tracking-wider rounded-md font-bold bg-purple-500/20 text-purple-400 border border-purple-500/30">
                        ATS
                      </span>
                    )}
                    <span className={isLocked ? "text-red-400" : "text-green-400"}>
                      {m.statusDesc || (isLocked ? 'Locked' : 'Open')}
                    </span>
                  </div>
                </div>

                <div className="p-4 flex-1 flex flex-col gap-3">
                  <button
                    onClick={() => handlePick(m, m.awayTeam.id)}
                    disabled={isLocked}
                    className={`p-3 rounded-lg border text-left flex items-center justify-between transition-colors
                      ${pick?.pick.teamId === m.awayTeam.id
                        ? 'border-[#22c55e] bg-[#22c55e]/10'
                        : 'border-zinc-800 hover:border-zinc-600 bg-[#18181A]'}
                      ${isLocked && pick?.pick.teamId !== m.awayTeam.id ? 'opacity-50 cursor-not-allowed' : ''}
                    `}
                  >
                    <div className="flex items-center gap-3">
                      <img src={m.awayTeam.image} alt={m.awayTeam.name} className="w-8 h-8 object-contain" />
                      <div className="flex flex-row items-baseline gap-2">
                        <span className="font-bold text-white">{m.awayTeam.name}</span>
                        {isSpread && (
                           <span className="text-base text-zinc-400 font-medium">{spread > 0 ? `-${spread}` : `+${Math.abs(spread)}`}</span>
                        )}
                      </div>
                    </div>
                    {pick?.pick.teamId === m.awayTeam.id && <CheckCircle className="w-5 h-5 text-[#22c55e]" />}
                  </button>

                  <div className="text-center text-xs text-zinc-600 font-bold uppercase">@</div>

                  <button
                    onClick={() => handlePick(m, m.homeTeam.id)}
                    disabled={isLocked}
                    className={`p-3 rounded-lg border text-left flex items-center justify-between transition-colors
                      ${pick?.pick.teamId === m.homeTeam.id
                        ? 'border-[#22c55e] bg-[#22c55e]/10'
                        : 'border-zinc-800 hover:border-zinc-600 bg-[#18181A]'}
                      ${isLocked && pick?.pick.teamId !== m.homeTeam.id ? 'opacity-50 cursor-not-allowed' : ''}
                    `}
                  >
                    <div className="flex items-center gap-3">
                      <img src={m.homeTeam.image} alt={m.homeTeam.name} className="w-8 h-8 object-contain" />
                      <div className="flex flex-row items-baseline gap-2">
                        <span className="font-bold text-white">{m.homeTeam.name}</span>
                        {isSpread && (
                           <span className="text-base text-zinc-400 font-medium">{spread > 0 ? `+${spread}` : `-${Math.abs(spread)}`}</span>
                        )}
                      </div>
                    </div>
                    {pick?.pick.teamId === m.homeTeam.id && <CheckCircle className="w-5 h-5 text-[#22c55e]" />}
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
