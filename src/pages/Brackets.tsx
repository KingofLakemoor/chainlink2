import React from 'react';
import { Trophy } from 'lucide-react';

export function BracketsPage() {
  return (
    <div className="flex-1 p-6 md:p-8 max-w-7xl mx-auto w-full pt-20 md:pt-8">
      <div className="mb-8">
        <h1 className="text-3xl md:text-4xl font-display font-black text-white mb-2 uppercase tracking-tight flex items-center gap-3">
          <Trophy className="w-8 h-8 text-[#22c55e]" />
          Brackets
        </h1>
        <p className="text-zinc-400 text-lg">Pick entire brackets ahead of their start time.</p>
      </div>

      <div className="bg-[#1a1a1a] border border-[#27272a] rounded-xl p-8 text-center">
        <Trophy className="w-16 h-16 text-zinc-600 mx-auto mb-4" />
        <h2 className="text-2xl font-bold text-white mb-2">Coming Soon</h2>
        <p className="text-zinc-400 max-w-md mx-auto">
          We are currently building the brackets feature. The first supported event will be the 2026 FIFA World Cup. Check back later!
        </p>
      </div>
    </div>
  );
}
