import React, { useState, useEffect } from 'react';
import { useAuth } from '../../lib/auth-context';
import { doc, getDoc, setDoc } from 'firebase/firestore';
import { db } from '../../lib/firebase';
import { cn } from '../../lib/utils';

interface WorldCupBracketProps {
  bracket: any; // The bracket document from Firestore
}

export function WorldCupBracket({ bracket }: WorldCupBracketProps) {
  const [selections, setSelections] = useState<Record<string, string>>({});

  const { user } = useAuth();

  useEffect(() => {
    async function loadSelections() {
      if (!user || !bracket?.id) return;
      try {
        const docRef = doc(db, 'bracketGamePredictions', `${bracket.id}_${user.uid}`);
        const snap = await getDoc(docRef);
        if (snap.exists()) {
          const data = snap.data();
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

  const handleSelect = async (matchId: string, team: string, isLocked: boolean) => {
    if (isLocked) return;

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

  const getMatchTeams = (round: number, globalMatchIndex: number) => {
    if (round === 0) {
      const team1 = bracket.teams[globalMatchIndex * 2] || `Team ${globalMatchIndex * 2 + 1}`;
      const team2 = bracket.teams[globalMatchIndex * 2 + 1] || `Team ${globalMatchIndex * 2 + 2}`;
      return [team1, team2];
    } else {
      const prevRound = round - 1;
      const prevMatch1Index = globalMatchIndex * 2;
      const prevMatch2Index = globalMatchIndex * 2 + 1;

      const team1 = selections[`r${prevRound}-m${prevMatch1Index}`];
      const team2 = selections[`r${prevRound}-m${prevMatch2Index}`];

      return [team1, team2];
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
    const [team1, team2] = getMatchTeams(round, globalMatchIndex);
    const selectedTeam = selections[matchId];

    const locked = isMatchLocked(round, matchId);

    return (
      <div key={matchId} className={cn("flex flex-col mb-4 bg-[#1a1a1a] border border-[#27272a] rounded-md overflow-hidden w-[160px] text-sm", locked && "opacity-75")}>
        <button
          onClick={() => team1 && handleSelect(matchId, team1, locked)}
          disabled={!team1 || locked}
          className={cn(
            "p-2 text-left hover:bg-zinc-800 transition-colors border-b border-[#27272a] truncate",
            selectedTeam === team1 ? "bg-zinc-800 font-bold" : "text-zinc-300",
            (!team1 || locked) && "text-zinc-600 cursor-not-allowed"
          )}
          style={selectedTeam === team1 ? { color: primaryColor } : undefined}
          title={team1}
        >
          {team1 || 'TBD'}
        </button>
        <button
          onClick={() => team2 && handleSelect(matchId, team2, locked)}
          disabled={!team2 || locked}
          className={cn(
            "p-2 text-left hover:bg-zinc-800 transition-colors truncate",
            selectedTeam === team2 ? "bg-zinc-800 font-bold" : "text-zinc-300",
            (!team2 || locked) && "text-zinc-600 cursor-not-allowed"
          )}
          style={selectedTeam === team2 ? { color: primaryColor } : undefined}
          title={team2}
        >
          {team2 || 'TBD'}
        </button>
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
  const champion = selections[finalWinnerId];

  return (
    <div className="w-full flex flex-col items-center">
      <div className="bg-[#1a1a1a] border border-[#27272a] rounded-xl p-4 mb-6 w-full max-w-2xl text-center">
        <p className="text-zinc-300 text-sm">
          <strong className="text-white">Lock Times:</strong> Round of 32 games lock at their scheduled time. Round of 16 locks July 4th at 10:00 AM AZ time.
        </p>
      </div>
      <div className="w-full overflow-x-auto pb-8 bg-[#0a0a0a] rounded-xl p-4 border border-[#27272a] relative">
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
            className="bg-[#1a1a1a] rounded-xl p-6 min-w-[200px] text-center flex items-center justify-center min-h-[100px]"
            style={{
              borderColor: primaryColor,
              borderWidth: '1px',
              borderStyle: 'solid',
              boxShadow: `0 0 20px ${primaryColor}26` // 26 is hex for ~15% opacity
            }}
          >
            {champion ? (
              <span className="text-2xl font-black text-white uppercase truncate px-2">{champion}</span>
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
