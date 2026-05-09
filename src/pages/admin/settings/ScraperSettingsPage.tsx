import React from 'react';
import { useState, useEffect } from 'react';
import { doc, getDoc, setDoc } from 'firebase/firestore';
import { db } from '../../../lib/firebase';
import { Button } from '../../../components/ui/button';
import { Input } from '../../../components/ui/input';

export default function ScraperSettingsPage() {
  const [maxMoneylineOdds, setMaxMoneylineOdds] = useState<string>('-300');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    const fetchSettings = async () => {
      try {
        const docRef = doc(db, 'systemSettings', 'scraper');
        const snap = await getDoc(docRef);
        if (snap.exists()) {
          const data = snap.data();
          if (data.maxMoneylineOdds !== undefined) {
            setMaxMoneylineOdds(data.maxMoneylineOdds.toString());
          }
        }
      } catch (e) {
        console.error("Failed to load scraper settings", e);
      } finally {
        setLoading(false);
      }
    };
    fetchSettings();
  }, []);

  const handleSave = async () => {
    setSaving(true);
    try {
      const parsed = parseInt(maxMoneylineOdds, 10);
      if (isNaN(parsed)) {
        alert("Please enter a valid number");
        setSaving(false);
        return;
      }

      await setDoc(doc(db, 'systemSettings', 'scraper'), {
        maxMoneylineOdds: parsed,
        updatedAt: Date.now()
      }, { merge: true });
      alert("Settings saved successfully!");
    } catch (e) {
      console.error("Failed to save scraper settings", e);
      alert("Failed to save settings.");
    } finally {
      setSaving(false);
    }
  };

  if (loading) return <div className="p-8 text-zinc-500">Loading settings...</div>;

  return (
    <div className="max-w-2xl">
      <h1 className="text-2xl font-bold mb-6 text-zinc-100">Scraper Settings</h1>

      <div className="bg-[#121212] border border-zinc-800 rounded-xl p-6 shadow-xl">
        <div className="space-y-6">
          <div>
            <label className="block text-sm font-medium text-zinc-300 mb-2">Max Moneyline Odds (Favorites)</label>
            <div className="text-xs text-zinc-500 mb-2">
              Any game with favorite odds better than or equal to this number (e.g. -300) will be automatically marked inactive.
            </div>
            <Input
              type="number"
              value={maxMoneylineOdds}
              onChange={(e) => setMaxMoneylineOdds(e.target.value)}
              className="bg-zinc-900 border-zinc-800 text-white"
              placeholder="-300"
            />
          </div>

          <Button
            onClick={handleSave}
            disabled={saving}
            className="w-full bg-cyan-600 hover:bg-cyan-500 text-white"
          >
            {saving ? 'Saving...' : 'Save Settings'}
          </Button>
        </div>
      </div>
    </div>
  );
}