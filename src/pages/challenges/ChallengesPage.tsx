import React from 'react';
import { Target } from 'lucide-react';

export default function ChallengesPage() {
  return (
    <div className="flex-1 p-6 md:p-8 w-full pt-20 md:pt-8 overflow-hidden">
      <div className="mb-8 max-w-7xl mx-auto">
        <h1 className="text-3xl md:text-4xl font-display font-black text-white mb-2 uppercase tracking-tight flex items-center gap-3">
          <Target className="w-8 h-8 text-[#22c55e]" />
          Challenges
        </h1>
        <p className="text-zinc-400 text-lg">
          Challenges are another way to earn Links by showing off your sports knowledge. Pick the correct side of these specially curated matchups to win!
        </p>
      </div>

      <div className="bg-[#1a1a1a] border border-[#27272a] rounded-xl p-8 text-center max-w-7xl mx-auto">
        <Target className="w-16 h-16 text-zinc-600 mx-auto mb-4" />
        <h2 className="text-2xl font-bold text-white mb-2">Coming Soon</h2>
        <p className="text-zinc-400 max-w-md mx-auto">
          We are currently building out the new Challenges system. Check back later for curated matchups!
        </p>
      </div>
    </div>
  );
}