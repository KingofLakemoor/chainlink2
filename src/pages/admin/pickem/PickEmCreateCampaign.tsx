import React from 'react';
import { useState } from 'react';
import { collection, addDoc } from 'firebase/firestore';
import { db } from '../../../lib/firebase';
import { useNavigate } from 'react-router-dom';
import { Button } from '../../../components/ui/button';

export default function PickEmCreateCampaign() {
  const navigate = useNavigate();
  const [name, setName] = useState('');
  const [leagues, setLeagues] = useState<string[]>(['CFB']);
  const [defaultMatchType, setDefaultMatchType] = useState('STANDARD');
  const [pickLimit, setPickLimit] = useState<number>(0);
  const [loading, setLoading] = useState(false);

  const availableLeagues = ['CFB', 'CBASE', 'NFL', 'NBA'];

  const handleLeagueToggle = (league: string) => {
    setLeagues(prev =>
      prev.includes(league)
        ? prev.filter(l => l !== league)
        : [...prev, league]
    );
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim() || leagues.length === 0) {
      alert("Please enter a name and select at least one league.");
      return;
    }

    setLoading(true);
    try {
      await addDoc(collection(db, 'pickemCampaigns'), {
        name: name.trim(),
        league: leagues[0], // Keep for backward compatibility if needed in old queries
        leagues: leagues,
        pickLimit: pickLimit,
        type: 'STANDARD',
        defaultMatchType,
        scoringType: 'WIN_LOSS',
        startDate: Date.now(),
        endDate: Date.now() + 1000 * 60 * 60 * 24 * 30 * 6, // ~6 months
        currentWeek: 1,
        entryFee: 0,
        createdAt: Date.now()
      });
      navigate('/admin/pickem');
    } catch (err) {
      console.error(err);
      alert('Failed to create campaign');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-2xl mx-auto">
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-2xl font-bold text-white">Create Pick'em Campaign</h2>
        <Button variant="ghost" onClick={() => navigate('/admin/pickem')}>Cancel</Button>
      </div>

      <div className="bg-[#121212] border border-zinc-800 rounded-xl p-6">
        <form onSubmit={handleSave} className="space-y-6">
          <div>
            <label className="block text-sm font-medium text-zinc-400 mb-1">Campaign Name</label>
            <input
              type="text"
              value={name}
              onChange={e => setName(e.target.value)}
              placeholder="e.g. 2024 College Football Season"
              className="w-full bg-[#18181A] border border-zinc-800 rounded-lg px-4 py-2 text-white"
              required
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-zinc-400 mb-2">Leagues</label>
            <div className="flex flex-wrap gap-4">
              {availableLeagues.map(l => (
                <label key={l} className="flex items-center gap-2 cursor-pointer text-white">
                  <input
                    type="checkbox"
                    checked={leagues.includes(l)}
                    onChange={() => handleLeagueToggle(l)}
                    className="w-4 h-4 rounded border-zinc-800 bg-[#18181A] text-[#22c55e] focus:ring-[#22c55e]"
                  />
                  {l.replace('-', ' ')}
                </label>
              ))}
            </div>
            {leagues.length === 0 && <p className="text-red-500 text-sm mt-1">Please select at least one league.</p>}
          </div>

          <div>
            <label className="block text-sm font-medium text-zinc-400 mb-1">Weekly Pick Limit (0 for unlimited)</label>
            <input
              type="number"
              min="0"
              value={pickLimit}
              onChange={e => setPickLimit(parseInt(e.target.value) || 0)}
              className="w-full bg-[#18181A] border border-zinc-800 rounded-lg px-4 py-2 text-white"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-zinc-400 mb-1">Default Match Type</label>
            <select
              value={defaultMatchType}
              onChange={e => setDefaultMatchType(e.target.value)}
              className="w-full bg-[#18181A] border border-zinc-800 rounded-lg px-4 py-2 text-white"
            >
              <option value="STANDARD">Standard (Moneyline)</option>
              <option value="SPREAD">Against the Spread (ATS)</option>
            </select>
          </div>

          <Button type="submit" disabled={loading} className="w-full">
            {loading ? 'Creating...' : 'Create Campaign'}
          </Button>
        </form>
      </div>
    </div>
  );
}
