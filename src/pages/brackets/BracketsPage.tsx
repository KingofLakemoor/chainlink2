import React, { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import { Trophy, Loader2 } from 'lucide-react';
import { WorldCupBracket } from './WorldCupBracket';
import { collection, query, where, getDocs, doc, getDoc, limit } from 'firebase/firestore';
import { db } from '../../lib/firebase';

export function BracketsPage() {
  const { bracketId } = useParams<{ bracketId: string }>();
  const [bracket, setBracket] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchBracket() {
        const defaultTeams = [
          "Winner Group E", "3rd Group A/B/C/D/F",
          "Winner Group I", "3rd Group C/D/F/G/H",
          "Runner-up Group A", "Runner-up Group B",
          "Winner Group F", "Runner-up Group C",
          "Runner-up Group K", "Runner-up Group L",
          "Winner Group H", "Runner-up Group J",
          "Winner Group D", "3rd Group B/E/F/I/J",
          "Winner Group G", "3rd Group A/E/H/I/J",
          "Winner Group C", "Runner-up Group F",
          "Runner-up Group E", "Runner-up Group I",
          "Winner Group A", "3rd Group C/E/F/H/I",
          "Winner Group L", "3rd Group E/H/I/J/K",
          "Winner Group J", "Runner-up Group H",
          "Runner-up Group D", "Runner-up Group G",
          "Winner Group B", "3rd Group E/F/G/I/J",
          "Winner Group K", "3rd Group D/E/I/J/L"
        ];

        const defaultBracket = {
          id: 'world-cup-2026',
          name: "2026 World Cup Bracket",
          sport: "World Cup 2026",
          teams: defaultTeams,
          pointValues: {
            "Round of 32": 10,
            "Round of 16": 20,
            "Quarter Finals": 40,
            "Semi Finals": 80,
            "Finals": 160
          },
          theme: bracketId === 'charity' ? {
            title: "Charity Cup 2026",
            subtitle: "Make your picks to support a great cause!",
            primaryColor: "#3b82f6",
            logoUrl: "https://api.dicebear.com/7.x/shapes/svg?seed=charity"
          } : undefined
        };

      try {
        if (bracketId) {
          const docRef = doc(db, 'brackets', bracketId);
          const docSnap = await getDoc(docRef);
          if (docSnap.exists()) {
            setBracket({ id: docSnap.id, ...docSnap.data() });
          }
        } else {
          const q = query(
            collection(db, 'brackets'),
            where('sport', '==', 'World Cup 2026'),
            limit(1)
          );
          const snapshot = await getDocs(q);
          if (!snapshot.empty) {
            setBracket({ id: snapshot.docs[0].id, ...snapshot.docs[0].data() });
          } else {
            setBracket(defaultBracket);
          }
        }
      } catch (error) {
        setBracket(defaultBracket);
        console.error("Error fetching bracket:", error);
      } finally {
        setLoading(false);
      }
    }

    fetchBracket();
  }, []);

  const theme = bracket?.theme || {};
  const primaryColor = theme.primaryColor || "#22c55e";
  const title = theme.title || "Brackets";
  const subtitle = theme.subtitle || "Pick entire brackets ahead of their start time.";

  return (
    <div className="flex-1 p-6 md:p-8 w-full pt-20 md:pt-8 overflow-hidden">
      <div className="mb-8 max-w-7xl mx-auto">
        <h1 className="text-3xl md:text-4xl font-display font-black text-white mb-2 uppercase tracking-tight flex items-center gap-3">
          {theme.logoUrl ? (
            <img src={theme.logoUrl} alt={title} className="w-10 h-10 object-contain" loading="lazy" />
          ) : (
            <Trophy className="w-8 h-8" style={{ color: primaryColor }} />
          )}
          {title}
        </h1>
        <p className="text-zinc-400 text-lg">{subtitle}</p>
      </div>

      {loading ? (
        <div className="flex items-center justify-center p-12">
          <Loader2 className="w-8 h-8 animate-spin" style={{ color: primaryColor }} />
        </div>
      ) : bracket ? (
        <div className="w-full">
          <div className="mb-6 max-w-7xl mx-auto flex items-center justify-between">
             <h2 className="text-xl font-bold text-white">{bracket.name}</h2>
             <span className="text-sm text-zinc-400 bg-zinc-800/50 px-3 py-1 rounded-full">
               Points per round: {Object.values(bracket.pointValues).join(' / ')}
             </span>
          </div>
          <WorldCupBracket bracket={bracket} />
        </div>
      ) : (
        <div className="bg-[#1a1a1a] border border-[#27272a] rounded-xl p-8 text-center max-w-7xl mx-auto">
          <Trophy className="w-16 h-16 text-zinc-600 mx-auto mb-4" />
          <h2 className="text-2xl font-bold text-white mb-2">Coming Soon</h2>
          <p className="text-zinc-400 max-w-md mx-auto">
            We are currently building the brackets feature. The first supported event will be the 2026 FIFA World Cup. Check back later!
          </p>
        </div>
      )}
    </div>
  );
}
