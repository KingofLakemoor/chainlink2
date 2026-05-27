import React, { useState, useEffect } from 'react';
import { Grid, Clock, Trophy } from 'lucide-react';
import { doc, getDoc } from 'firebase/firestore';
import { db } from '../../lib/firebase';

interface Link4Pick {
  id: string;
  name: string;
  sport: string;
}

export default function Link4Page() {
  const [endTime, setEndTime] = useState<string>('');
  const [allowedSports, setAllowedSports] = useState<string[]>([]);
  const [picks, setPicks] = useState<(Link4Pick | null)[]>([null, null, null, null]);
  const [timeLeft, setTimeLeft] = useState<{ days: number; hours: number; minutes: number; seconds: number } | null>(null);

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
      }
    };
    fetchSettings();
  }, []);

  useEffect(() => {
    if (!endTime) return;

    const calculateTimeLeft = () => {
      const difference = new Date(endTime).getTime() - new Date().getTime();
      if (difference > 0) {
        setTimeLeft({
          days: Math.floor(difference / (1000 * 60 * 60 * 24)),
          hours: Math.floor((difference / (1000 * 60 * 60)) % 24),
          minutes: Math.floor((difference / 1000 / 60) % 60),
          seconds: Math.floor((difference / 1000) % 60),
        });
      } else {
        setTimeLeft(null);
      }
    };

    calculateTimeLeft();
    const timer = setInterval(calculateTimeLeft, 1000);
    return () => clearInterval(timer);
  }, [endTime]);

  const addMockPick = () => {
    const firstEmptyIndex = picks.findIndex(p => p === null);
    if (firstEmptyIndex !== -1) {
      const newPicks = [...picks];
      newPicks[firstEmptyIndex] = {
        id: `mock-${Date.now()}`,
        name: `Mock Pick ${firstEmptyIndex + 1}`,
        sport: allowedSports[Math.floor(Math.random() * allowedSports.length)] || 'UNKNOWN',
      };
      setPicks(newPicks);
    }
  };

  const clearPicks = () => {
    setPicks([null, null, null, null]);
  };

  const nextPickIndex = picks.findIndex(p => p === null);

  return (
    <div className="flex-1 p-6 md:p-8 w-full pt-20 md:pt-8 overflow-hidden">
      <div className="mb-8 max-w-5xl mx-auto flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl md:text-4xl font-display font-black text-white mb-2 uppercase tracking-tight flex items-center gap-3">
            <Grid className="w-8 h-8 text-[#22c55e]" />
            Link4
          </h1>
          <p className="text-zinc-400 text-lg">
            Connect four to win! Play Link4 and earn links.
          </p>
        </div>

        {/* Countdown Timer */}
        {endTime && (
          <div className="bg-[#1a1a1a] border border-[#27272a] rounded-xl p-4 flex items-center gap-4">
            <div className="flex items-center gap-2 text-green-500">
              <Clock className="w-5 h-5 animate-pulse" />
              <span className="font-bold uppercase text-sm">Ends In:</span>
            </div>
            {timeLeft ? (
              <div className="flex gap-3 text-center">
                <div className="flex flex-col">
                  <span className="text-xl font-black text-white">{timeLeft.days}</span>
                  <span className="text-[10px] text-zinc-500 font-bold uppercase">Days</span>
                </div>
                <span className="text-zinc-600 font-bold text-xl">:</span>
                <div className="flex flex-col">
                  <span className="text-xl font-black text-white">{timeLeft.hours.toString().padStart(2, '0')}</span>
                  <span className="text-[10px] text-zinc-500 font-bold uppercase">Hrs</span>
                </div>
                <span className="text-zinc-600 font-bold text-xl">:</span>
                <div className="flex flex-col">
                  <span className="text-xl font-black text-white">{timeLeft.minutes.toString().padStart(2, '0')}</span>
                  <span className="text-[10px] text-zinc-500 font-bold uppercase">Min</span>
                </div>
                <span className="text-zinc-600 font-bold text-xl">:</span>
                <div className="flex flex-col">
                  <span className="text-xl font-black text-white">{timeLeft.seconds.toString().padStart(2, '0')}</span>
                  <span className="text-[10px] text-zinc-500 font-bold uppercase">Sec</span>
                </div>
              </div>
            ) : (
              <span className="text-red-500 font-bold">EXPIRED</span>
            )}
          </div>
        )}
      </div>

      <div className="max-w-5xl mx-auto space-y-6">
        {/* Allowed Sports Banner */}
        {allowedSports.length > 0 && (
          <div className="bg-[#1a1a1a] border border-[#27272a] rounded-xl p-4">
            <h3 className="text-sm font-bold text-zinc-400 uppercase tracking-wider mb-3">Allowed Sports for this Link4</h3>
            <div className="flex flex-wrap gap-2">
              {allowedSports.map(sport => (
                <span key={sport} className="px-3 py-1 bg-green-500/10 border border-green-500/30 text-green-400 rounded-lg text-sm font-bold">
                  {sport}
                </span>
              ))}
            </div>
          </div>
        )}

        {/* Link4 Boxes */}
        <div className="bg-[#1a1a1a] border border-[#27272a] rounded-xl p-6 md:p-8">
          <div className="flex justify-between items-center mb-6">
            <h2 className="text-xl font-bold text-white flex items-center gap-2">
              <Trophy className="w-5 h-5 text-yellow-500" />
              Your 4 Picks
            </h2>
            <div className="flex gap-2">
              <button
                onClick={addMockPick}
                disabled={nextPickIndex === -1}
                className="px-3 py-1.5 bg-zinc-800 hover:bg-zinc-700 text-sm font-medium text-white rounded-lg transition-colors disabled:opacity-50"
              >
                Add Mock Pick
              </button>
              <button
                onClick={clearPicks}
                className="px-3 py-1.5 bg-red-500/10 hover:bg-red-500/20 text-red-500 text-sm font-medium rounded-lg transition-colors"
              >
                Clear
              </button>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            {picks.map((pick, index) => {
              const isActive = index === nextPickIndex;
              const isLocked = index > nextPickIndex && nextPickIndex !== -1;
              const isFilled = pick !== null;

              return (
                <div
                  key={index}
                  className={`
                    relative aspect-square md:aspect-auto md:h-48 rounded-xl border-2 flex flex-col items-center justify-center p-4 transition-all
                    ${isActive ? 'border-green-500 bg-green-500/5 shadow-[0_0_15px_rgba(34,197,94,0.1)] scale-[1.02]' : ''}
                    ${isLocked ? 'border-zinc-800 bg-[#121212] opacity-50' : ''}
                    ${isFilled ? 'border-[#27272a] bg-[#121212]' : ''}
                    ${!isActive && !isLocked && !isFilled ? 'border-dashed border-zinc-700 bg-[#1a1a1a]' : ''}
                  `}
                >
                  {/* Slot Number */}
                  <div className={`absolute top-3 left-3 w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold ${
                    isFilled ? 'bg-zinc-800 text-zinc-400' :
                    isActive ? 'bg-green-500 text-green-950' :
                    'bg-zinc-800 text-zinc-600'
                  }`}>
                    {index + 1}
                  </div>

                  {isFilled ? (
                    <div className="text-center w-full">
                      <div className="inline-block px-2 py-1 bg-zinc-800 text-zinc-300 text-xs font-bold rounded mb-2">
                        {pick.sport}
                      </div>
                      <h3 className="font-bold text-white text-lg break-words">{pick.name}</h3>
                    </div>
                  ) : isActive ? (
                    <div className="text-center">
                      <div className="w-12 h-12 rounded-full bg-green-500/20 text-green-500 flex items-center justify-center mx-auto mb-3">
                        <Grid className="w-6 h-6" />
                      </div>
                      <p className="text-sm font-medium text-green-400">Select Pick {index + 1}</p>
                    </div>
                  ) : (
                    <div className="text-center opacity-50">
                      <div className="w-12 h-12 rounded-full bg-zinc-800 text-zinc-600 flex items-center justify-center mx-auto mb-3">
                        <Grid className="w-6 h-6" />
                      </div>
                      <p className="text-sm font-medium text-zinc-500">Locked</p>
                    </div>
                  )}
                </div>
              );
            })}
          </div>

          {nextPickIndex === -1 && (
            <div className="mt-8 p-4 bg-green-500/10 border border-green-500/30 rounded-xl text-center">
              <Trophy className="w-8 h-8 text-yellow-500 mx-auto mb-2" />
              <h3 className="text-lg font-bold text-white">All 4 Picks Locked In!</h3>
              <p className="text-zinc-400">Good luck! You've completed your Link4 selection.</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
