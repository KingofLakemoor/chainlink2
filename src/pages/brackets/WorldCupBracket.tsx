import React, { useState, useEffect } from 'react';
import { useAuth } from '../../lib/auth-context';
import { doc, getDoc, setDoc } from 'firebase/firestore';
import { db } from '../../lib/firebase';
import { cn } from '../../lib/utils';

interface WorldCupBracketProps {
  bracket: any; // The bracket document from Firestore
}

import { Coins, Loader2 } from 'lucide-react';

export function WorldCupBracket({ bracket }: WorldCupBracketProps) {
  const [selections, setSelections] = useState<Record<string, string>>({});
  const [isPaid, setIsPaid] = useState(false);
  const [isPaying, setIsPaying] = useState(false);

  const { user } = useAuth();

  useEffect(() => {
    async function loadSelections() {
      if (!user || !bracket?.id) return;
      try {
        const docRef = doc(db, 'bracketGamePredictions', `${bracket.id}_${user.uid}`);
        const snap = await getDoc(docRef);
        if (snap.exists()) {
          const data = snap.data();
          if (data.paid) setIsPaid(true);
          if (data.selections) {
            setSelections(data.selections);
          }
        }
      } catch (err) {
        console.error("Failed to load bracket predictions:", err);
      }
    }
    loadSelections();
  }, [user, bracket?.id]);

  const handlePayToEnter = async () => {
    if (!user || !bracket?.id || isPaying) return;
    setIsPaying(true);
    try {
      const token = await user.getIdToken();
      const res = await fetch('/api/brackets/enter', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ bracketId: bracket.id })
      });
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || 'Failed to enter bracket');
      }
      setIsPaid(true);
    } catch (err: any) {
      alert(err.message || "Failed to enter bracket. Check your links balance.");
    } finally {
      setIsPaying(false);
    }
  };

  const handleSelect = async (matchId: string, team: string, isLocked: boolean) => {
    if (isLocked || !isPaid) return;

    const next = { ...selections };
    const isDeselect = next[matchId] === team;

    if (isDeselect) {
      delete next[matchId];
    } else {
      next[matchId] = team;
    }

    const removedTeam = isDeselect ? team : (selections[matchId] && selections[matchId] !== team ? selections[matchId] : null);
    if (removedTeam) {
      for (const [mId, mTeam] of Object.entries(next)) {
         if (mTeam === removedTeam && mId !== matchId) {
           delete next[mId];
         }
      }
    }

    setSelections(next);

    if (user && bracket?.id) {
      try {
        const docRef = doc(db, 'bracketGamePredictions', `${bracket.id}_${user.uid}`);
        await setDoc(docRef, {
          userId: user.uid,
          bracketId: bracket.id,
          selections: next,
          updatedAt: new Date().toISOString()
        }, { merge: true });
      } catch (err) {
        console.error("Failed to save bracket prediction:", err);
      }
    }
  };

  const getSlot = (prevMatchId: string) => {
    const results = bracket.results || {};
    const eliminatedTeams = bracket.eliminatedTeams || [];

    const predicted = selections[prevMatchId] || null;
    const actual = results[prevMatchId] || null;

    let predictedWrong = false;
    if (predicted) {
      if (actual && actual !== predicted) {
         predictedWrong = true;
      } else if (eliminatedTeams.includes(predicted)) {
         predictedWrong = true;
      }
    }

    const display = actual || (predictedWrong ? null : predicted);
    return { predicted, actual, predictedWrong, display };
  };

  const getMatchTeams = (round: number, globalMatchIndex: number) => {
    if (round === 0) {
      const team1Str = bracket.teams[globalMatchIndex * 2] || `Team ${globalMatchIndex * 2 + 1}`;
      const team2Str = bracket.teams[globalMatchIndex * 2 + 1] || `Team ${globalMatchIndex * 2 + 2}`;
      return [
        { predicted: null, actual: team1Str, predictedWrong: false, display: team1Str },
        { predicted: null, actual: team2Str, predictedWrong: false, display: team2Str }
      ];
    } else {
      const prevRound = round - 1;
      const prevMatch1Index = globalMatchIndex * 2;
      const prevMatch2Index = globalMatchIndex * 2 + 1;

      const prevMatch1Id = `r${prevRound}-m${prevMatch1Index}`;
      const prevMatch2Id = `r${prevRound}-m${prevMatch2Index}`;

      return [getSlot(prevMatch1Id), getSlot(prevMatch2Id)];
    }
  };

  const theme = bracket?.theme || {};
  const primaryColor = theme.primaryColor || "#22c55e";

  const isMatchLocked = (round: number, matchId: string) => {
    const now = new Date();
    if (round === 0) {
      const matchTime = bracket?.matchTimes?.[matchId];
      if (matchTime) return now > new Date(matchTime);
      return now > new Date('2026-06-28T19:00:00Z');
    } else {
      return now > new Date('2026-07-04T17:00:00Z');
    }
  };

  const renderMatch = (round: number, globalMatchIndex: number) => {
    const matchId = `r${round}-m${globalMatchIndex}`;
    const [team1Slot, team2Slot] = getMatchTeams(round, globalMatchIndex);
    const selectedTeam = selections[matchId];

    const locked = isMatchLocked(round, matchId);

    const matchTime = bracket?.matchTimes?.[matchId];
    const formattedTime = matchTime ? new Date(matchTime).toLocaleString('en-US', { month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' }) : null;

    const renderButton = (slot: { predicted: string | null; actual: string | null; predictedWrong: boolean; display: string | null }, isTop: boolean) => {
      const { display, predicted, predictedWrong } = slot;

      const teamName = display;
      const isSelected = selectedTeam && selectedTeam === teamName;

      const matchResult = bracket?.results?.[matchId];
      // It is eliminated here if there is a result for THIS match, and it's not this team
      const isEliminatedHere = matchResult && teamName && matchResult !== teamName;
      const isPickWrongHere = isEliminatedHere && isSelected;

      return (
        <button
          onClick={() => teamName && handleSelect(matchId, teamName, locked)}
          disabled={!teamName || locked}
          className={cn(
            "p-2 text-left hover:bg-zinc-800 transition-colors truncate relative flex flex-col justify-center min-h-[40px]",
            isTop ? "border-b border-[#27272a]" : "",
            isSelected ? "bg-zinc-800 font-bold" : "text-zinc-300",
            (!teamName || locked) && "cursor-not-allowed"
          )}
          style={isSelected && !isPickWrongHere ? { color: primaryColor } : undefined}
          title={teamName || 'TBD'}
        >
          {predictedWrong && predicted && (
            <span className="text-[10px] text-red-500 line-through leading-none mb-0.5 opacity-80 truncate w-full">
              {predicted}
            </span>
          )}
          <span className={cn(
            "truncate w-full block",
            !teamName ? "text-zinc-600" : "",
            isPickWrongHere ? "line-through text-red-500 opacity-80" : isEliminatedHere ? "line-through text-zinc-500" : ""
          )}>
            {teamName || 'TBD'}
          </span>
        </button>
      );
    };

    return (
      <div key={matchId} className={cn("flex flex-col mb-4 bg-[#1a1a1a] border border-[#27272a] rounded-md overflow-hidden w-[160px] text-sm", locked && "opacity-75")}>
        {formattedTime && (
          <div className="text-[10px] text-zinc-500 text-center py-1 bg-zinc-900 border-b border-[#27272a]">
            {formattedTime}
          </div>
        )}
        {renderButton(team1Slot, true)}
        {renderButton(team2Slot, false)}
      </div>
    );
  };

  const renderRound = (round: number, startMatchIdx: number, matchCount: number, title: string) => {
    return (
      <div key={`${round}-${startMatchIdx}`} className="flex flex-col mx-4 justify-around py-4">
        <h3 className="text-zinc-400 font-bold mb-4 text-center text-xs uppercase sticky top-0">{title}</h3>
        <div className="flex flex-col justify-around h-full">
          {Array.from({ length: matchCount }).map((_, i) => renderMatch(round, startMatchIdx + i))}
        </div>
      </div>
    );
  };

  const finalWinnerId = 'r4-m0';
  const championSlot = getSlot(finalWinnerId);

  return (
    <div className="w-full flex flex-col items-center">
      <div className="bg-[#1a1a1a] border border-[#27272a] rounded-xl p-4 mb-6 w-full max-w-2xl text-center">
        <p className="text-zinc-300 text-sm">
          <strong className="text-white">Lock Times:</strong> Round of 32 games lock at their scheduled time. Round of 16 locks July 4th at 10:00 AM AZ time.
        </p>
      </div>

      {!isPaid && (
        <div className="bg-yellow-500/10 border border-yellow-500/20 rounded-xl p-6 mb-8 w-full max-w-2xl text-center flex flex-col items-center">
          <p className="text-yellow-200 mb-4 font-medium">
            You must enter this bracket to make picks.
          </p>
          <button
            onClick={handlePayToEnter}
            disabled={isPaying}
            className="flex items-center gap-2 bg-yellow-500 text-black px-6 py-2 rounded-lg font-bold hover:bg-yellow-400 transition-colors disabled:opacity-50"
          >
            {isPaying ? <Loader2 className="w-5 h-5 animate-spin" /> : <Coins className="w-5 h-5" />}
            Pay {bracket?.cost || 10} Links to Enter
          </button>
        </div>
      )}

      <div className={cn("w-full overflow-x-auto pb-8 bg-[#0a0a0a] rounded-xl p-4 border border-[#27272a] relative transition-opacity", !isPaid && "opacity-50 pointer-events-none")}>
        <div className="min-w-max flex items-stretch justify-center">
        {/* Left Side */}
        <div className="flex">
          {renderRound(0, 0, 8, "Round of 32")}
          {renderRound(1, 0, 4, "Round of 16")}
          {renderRound(2, 0, 2, "Quarter-finals")}
          {renderRound(3, 0, 1, "Semi-finals")}
        </div>

        {/* Center - Finals */}
        <div className="flex flex-col items-center justify-center mx-4">
          <h3 className="font-bold mb-4 text-center text-xl uppercase tracking-widest" style={{ color: primaryColor }}>Champion</h3>
          <div
            className="bg-[#1a1a1a] rounded-xl p-6 min-w-[200px] text-center flex flex-col items-center justify-center min-h-[100px]"
            style={{
              borderColor: primaryColor,
              borderWidth: '1px',
              borderStyle: 'solid',
              boxShadow: `0 0 20px ${primaryColor}26` // 26 is hex for ~15% opacity
            }}
          >
            {championSlot.predictedWrong && championSlot.predicted && (
              <span className="text-sm text-red-500 line-through mb-1 uppercase font-bold opacity-80">
                {championSlot.predicted}
              </span>
            )}
            {championSlot.display ? (
              <span className="text-2xl font-black text-white uppercase truncate px-2">{championSlot.display}</span>
            ) : (
              <span className="text-zinc-600 italic">Select Winner</span>
            )}
          </div>

          <div className="mt-12 flex flex-col items-center">
             <h3 className="text-zinc-400 font-bold mb-4 text-center text-xs uppercase">Final</h3>
             {renderMatch(4, 0)}
          </div>
        </div>

        {/* Right Side */}
        <div className="flex flex-row-reverse">
           {renderRound(0, 8, 8, "Round of 32")}
           {renderRound(1, 4, 4, "Round of 16")}
           {renderRound(2, 2, 2, "Quarter-finals")}
           {renderRound(3, 1, 1, "Semi-finals")}
        </div>
      </div>
      </div>
    </div>
  );
}
