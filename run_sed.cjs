const fs = require('fs');

const path = 'src/pages/brackets/WorldCupBracket.tsx';
let content = fs.readFileSync(path, 'utf8');

// 1. imports and useAuth
content = content.replace(
  "import React, { useState } from 'react';",
  "import React, { useState, useEffect } from 'react';\nimport { useAuth } from '../../lib/auth-context';\nimport { doc, getDoc, setDoc } from 'firebase/firestore';\nimport { db } from '../../lib/firebase';"
);

// 2. Add useAuth and useEffect, and replace handleSelect
const originalHandleSelect = `  const handleSelect = (matchId: string, team: string) => {
    setSelections(prev => {
      const next = { ...prev, [matchId]: team };
      return next;
    });
  };`;

const newHandleSelect = `  const { user } = useAuth();

  useEffect(() => {
    async function loadSelections() {
      if (!user || !bracket?.id) return;
      try {
        const docRef = doc(db, 'bracketGamePredictions', \`\${bracket.id}_\${user.uid}\`);
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

    let newSelections = { ...selections };
    setSelections(prev => {
      const next = { ...prev };
      const isDeselect = next[matchId] === team;

      if (isDeselect) {
        delete next[matchId];
      } else {
        next[matchId] = team;
      }

      const removedTeam = isDeselect ? team : (prev[matchId] && prev[matchId] !== team ? prev[matchId] : null);
      if (removedTeam) {
        for (const [mId, mTeam] of Object.entries(next)) {
           if (mTeam === removedTeam && mId !== matchId) {
             delete next[mId];
           }
        }
      }

      newSelections = next;
      return next;
    });

    if (user && bracket?.id) {
      try {
        const docRef = doc(db, 'bracketGamePredictions', \`\${bracket.id}_\${user.uid}\`);
        await setDoc(docRef, {
          userId: user.uid,
          bracketId: bracket.id,
          selections: newSelections,
          updatedAt: new Date().toISOString()
        }, { merge: true });
      } catch (err) {
        console.error("Failed to save bracket prediction:", err);
      }
    }
  };`;
content = content.replace(originalHandleSelect, newHandleSelect);


// 3. Add isMatchLocked logic
const originalRenderMatch = `  const renderMatch = (round: number, globalMatchIndex: number) => {`;
const newRenderMatch = `  const isMatchLocked = (round: number, matchId: string) => {
    const now = new Date();
    if (round === 0) {
      const matchTime = bracket?.matchTimes?.[matchId];
      if (matchTime) return now > new Date(matchTime);
      return now > new Date('2026-06-28T19:00:00Z');
    } else {
      return now > new Date('2026-07-04T17:00:00Z');
    }
  };

  const renderMatch = (round: number, globalMatchIndex: number) => {`;
content = content.replace(originalRenderMatch, newRenderMatch);

// 4. Update the match UI
const matchUIOriginal = `    return (
      <div key={matchId} className="flex flex-col mb-4 bg-[#1a1a1a] border border-[#27272a] rounded-md overflow-hidden w-[160px] text-sm">
        <button
          onClick={() => team1 && handleSelect(matchId, team1)}
          disabled={!team1}
          className={cn(
            "p-2 text-left hover:bg-zinc-800 transition-colors border-b border-[#27272a] truncate",
            selectedTeam === team1 ? "bg-zinc-800 font-bold" : "text-zinc-300",
            !team1 && "text-zinc-600 cursor-not-allowed"
          )}
          style={selectedTeam === team1 ? { color: primaryColor } : undefined}
          title={team1}
        >
          {team1 || 'TBD'}
        </button>
        <button
          onClick={() => team2 && handleSelect(matchId, team2)}
          disabled={!team2}
          className={cn(
            "p-2 text-left hover:bg-zinc-800 transition-colors truncate",
            selectedTeam === team2 ? "bg-zinc-800 font-bold" : "text-zinc-300",
            !team2 && "text-zinc-600 cursor-not-allowed"
          )}
          style={selectedTeam === team2 ? { color: primaryColor } : undefined}
          title={team2}
        >
          {team2 || 'TBD'}
        </button>
      </div>
    );`;

const matchUINew = `    const locked = isMatchLocked(round, matchId);

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
    );`;
content = content.replace(matchUIOriginal, matchUINew);


// 5. Update main return
const returnOriginal = `  return (
    <div className="w-full overflow-x-auto pb-8 bg-[#0a0a0a] rounded-xl p-4 border border-[#27272a] relative">
      {/* Overlay */}
      <div className="absolute inset-0 z-10 flex items-center justify-center bg-black/60 rounded-xl backdrop-blur-sm pointer-events-auto">
        <div className="bg-zinc-900 border border-zinc-800 p-8 rounded-xl max-w-md mx-4 text-center shadow-2xl">
          <p className="text-white text-lg font-medium leading-relaxed">
            We will launch our Bracket feature with the 2026 World Cup Knockout Round, beginning on June 28th
          </p>
        </div>
      </div>

      <div className="min-w-max flex items-stretch justify-center pointer-events-none select-none opacity-50">`;

const returnNew = `  return (
    <div className="w-full flex flex-col items-center">
      <div className="bg-[#1a1a1a] border border-[#27272a] rounded-xl p-4 mb-6 w-full max-w-2xl text-center">
        <p className="text-zinc-300 text-sm">
          <strong className="text-white">Lock Times:</strong> Round of 32 games lock at their scheduled time. Round of 16 locks July 4th at 10:00 AM AZ time.
        </p>
      </div>
      <div className="w-full overflow-x-auto pb-8 bg-[#0a0a0a] rounded-xl p-4 border border-[#27272a] relative">
        <div className="min-w-max flex items-stretch justify-center">`;

content = content.replace(returnOriginal, returnNew);

content = content.replace(/    <\/div>\n  \);\n}/g, "      </div>\n    </div>\n  );\n}");

fs.writeFileSync(path, content, 'utf8');

