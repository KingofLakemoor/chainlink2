import React, { useState, useEffect } from 'react';
import { doc, getDoc, setDoc } from 'firebase/firestore';
import { db } from '../../../lib/firebase';
import { Save, Loader2, Calendar } from 'lucide-react';

const SPORTS = [
  { id: 'NFL', label: 'NFL' },
  { id: 'NBA', label: 'NBA' },
  { id: 'MLB', label: 'MLB' },
  { id: 'NHL', label: 'NHL' },
  { id: 'CBB', label: 'College Basketball' },
  { id: 'CFB', label: 'College Football' },
  { id: 'SOCCER', label: 'Soccer' },
  { id: 'UFC', label: 'UFC' },
];

export default function Link4AdminPage() {
  const [endTime, setEndTime] = useState<string>('');
  const [allowedSports, setAllowedSports] = useState<string[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [saveStatus, setSaveStatus] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

  useEffect(() => {
    const fetchSettings = async () => {
      try {
        const docRef = doc(db, 'systemSettings', 'link4');
        const snap = await getDoc(docRef);
        if (snap.exists()) {
          const data = snap.data();
          if (data.endTime) setEndTime(data.endTime);
          if (data.allowedSports) setAllowedSports(data.allowedSports);
        }
      } catch (error) {
        console.error('Error fetching Link4 settings:', error);
      } finally {
        setIsLoading(false);
      }
    };
    fetchSettings();
  }, []);

  const handleSave = async () => {
    try {
      setIsSaving(true);
      setSaveStatus(null);
      const docRef = doc(db, 'systemSettings', 'link4');
      await setDoc(docRef, {
        endTime,
        allowedSports,
        updatedAt: Date.now(),
      }, { merge: true });
      setSaveStatus({ type: 'success', message: 'Settings saved successfully' });
    } catch (error) {
      console.error('Error saving Link4 settings:', error);
      setSaveStatus({ type: 'error', message: 'Failed to save settings' });
    } finally {
      setIsSaving(false);
      setTimeout(() => setSaveStatus(null), 3000);
    }
  };

  const toggleSport = (sportId: string) => {
    setAllowedSports(prev =>
      prev.includes(sportId)
        ? prev.filter(s => s !== sportId)
        : [...prev, sportId]
    );
  };

  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center h-full p-8">
        <Loader2 className="w-8 h-8 text-green-500 animate-spin mb-4" />
        <p className="text-zinc-400">Loading Link4 settings...</p>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full bg-[#121212] border border-zinc-800 rounded-xl relative overflow-hidden p-6 md:p-8">
      <div className="flex items-center justify-between mb-8">
        <h3 className="text-2xl text-zinc-100 font-bold">Link4 Configuration</h3>
        <div className="flex items-center gap-4">
          {saveStatus && (
            <span className={`text-sm ${saveStatus.type === 'success' ? 'text-green-500' : 'text-red-500'}`}>
              {saveStatus.message}
            </span>
          )}
          <button
            onClick={handleSave}
            disabled={isSaving}
            className="flex items-center gap-2 bg-green-600 hover:bg-green-500 text-white px-4 py-2 rounded-lg font-medium transition-colors disabled:opacity-50"
          >
            {isSaving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
            Save Changes
          </button>
        </div>
      </div>

      <div className="space-y-8 max-w-2xl">
        {/* End Time Settings */}
        <div className="bg-[#1a1a1a] border border-[#27272a] rounded-xl p-6">
          <h4 className="text-lg text-zinc-200 font-medium flex items-center gap-2 mb-4">
            <Calendar className="w-5 h-5 text-green-500" />
            Game Deadline
          </h4>
          <p className="text-sm text-zinc-400 mb-4">
            Set the deadline for when picks lock and the countdown ends on the user page.
          </p>
          <input
            type="datetime-local"
            value={endTime}
            onChange={(e) => setEndTime(e.target.value)}
            className="w-full bg-[#27272a] border border-zinc-700 rounded-lg p-3 text-white focus:outline-none focus:border-green-500"
          />
        </div>

        {/* Allowed Sports Settings */}
        <div className="bg-[#1a1a1a] border border-[#27272a] rounded-xl p-6">
          <h4 className="text-lg text-zinc-200 font-medium mb-4">
            Allowed Sports
          </h4>
          <p className="text-sm text-zinc-400 mb-4">
            Select which sports users are allowed to pick from for this Link4 period.
          </p>
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
            {SPORTS.map(sport => (
              <label
                key={sport.id}
                className={`flex items-center gap-3 p-3 rounded-lg border cursor-pointer transition-colors ${
                  allowedSports.includes(sport.id)
                    ? 'bg-green-500/10 border-green-500/50 text-green-400'
                    : 'bg-[#27272a] border-zinc-700 text-zinc-400 hover:border-zinc-500 hover:text-zinc-300'
                }`}
              >
                <input
                  type="checkbox"
                  checked={allowedSports.includes(sport.id)}
                  onChange={() => toggleSport(sport.id)}
                  className="hidden"
                />
                <div className={`w-4 h-4 rounded-full border flex items-center justify-center ${
                  allowedSports.includes(sport.id) ? 'border-green-500 bg-green-500' : 'border-zinc-500'
                }`}>
                  {allowedSports.includes(sport.id) && <div className="w-2 h-2 bg-[#1a1a1a] rounded-full" />}
                </div>
                <span className="font-medium text-sm">{sport.label}</span>
              </label>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
