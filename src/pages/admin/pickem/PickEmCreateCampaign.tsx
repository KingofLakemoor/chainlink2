import { useState } from 'react';
import { collection, addDoc } from 'firebase/firestore';
import { db } from '../../../lib/firebase';
import { useNavigate } from 'react-router-dom';
import { Button } from '../../../components/ui/button';

export default function PickEmCreateCampaign() {
  const navigate = useNavigate();
  const [name, setName] = useState('');
  const [league, setLeague] = useState('COLLEGE-FOOTBALL');
  const [loading, setLoading] = useState(false);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;

    setLoading(true);
    try {
      await addDoc(collection(db, 'pickemCampaigns'), {
        name: name.trim(),
        league,
        type: 'STANDARD',
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
            <label className="block text-sm font-medium text-zinc-400 mb-1">League</label>
            <select
              value={league}
              onChange={e => setLeague(e.target.value)}
              className="w-full bg-[#18181A] border border-zinc-800 rounded-lg px-4 py-2 text-white"
            >
              <option value="COLLEGE-FOOTBALL">College Football</option>
              <option value="NFL">NFL</option>
              <option value="NBA">NBA</option>
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
