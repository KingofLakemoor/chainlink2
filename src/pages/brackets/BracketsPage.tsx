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
      // Mock for local dev
      if (import.meta.env.DEV && (!db?.app?.options?.apiKey || db?.app?.options?.apiKey === 'MY_FIREBASE_API_KEY')) {
        const teams = [
          "Mexico", "South Africa", "South Korea", "Czechia",
          "Canada", "Bosnia-Herzegovina", "Qatar", "Switzerland",
          "Brazil", "Morocco", "Haiti", "Scotland",
          "United States", "Paraguay", "Australia", "Türkiye",
          "Germany", "Curacao", "Ivory Coast", "Ecuador",
          "Netherlands", "Japan", "Sweden", "Tunisia",
          "Belgium", "Egypt", "Iran", "New Zealand",
          "Spain", "Cape Verde", "Saudi Arabia", "Uruguay",
          "France", "Senegal", "Iraq", "Norway",
          "Argentina", "Algeria", "Austria", "Jordan",
          "Portugal", "Congo DR", "Uzbekistan", "Colombia",
          "England", "Croatia", "Ghana", "Panama"
        ];

        const pointValues = {
          "Round of 32": 10,
          "Round of 16": 20,
          "Quarter Finals": 40,
          "Semi Finals": 80,
          "Finals": 160
        };

        setBracket({
          id: 'mock-bracket-123',
          name: "2026 World Cup Bracket",
          sport: "World Cup 2026",
          teams,
          pointValues,
          theme: bracketId === 'charity' ? {
            title: "Charity Cup 2026",
            subtitle: "Make your picks to support a great cause!",
            primaryColor: "#3b82f6", // Blue
            logoUrl: "https://api.dicebear.com/7.x/shapes/svg?seed=charity"
          } : undefined
        });
        setLoading(false);
        return;
      }

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
          }
        }
      } catch (error) {
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
            <img src={theme.logoUrl} alt={title} className="w-10 h-10 object-contain" />
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
