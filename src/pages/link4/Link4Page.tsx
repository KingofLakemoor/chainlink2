import React from 'react';
import { Grid } from 'lucide-react';

export default function Link4Page() {
  return (
    <div className="flex-1 p-6 md:p-8 w-full pt-20 md:pt-8 overflow-hidden">
      <div className="mb-8 max-w-7xl mx-auto">
        <h1 className="text-3xl md:text-4xl font-display font-black text-white mb-2 uppercase tracking-tight flex items-center gap-3">
          <Grid className="w-8 h-8 text-[#22c55e]" />
          Link4
        </h1>
        <p className="text-zinc-400 text-lg">
          Connect four to win! Play Link4 and earn links.
        </p>
      </div>

      <div className="bg-[#1a1a1a] border border-[#27272a] rounded-xl p-8 max-w-7xl mx-auto">
        {/* Link4 Game Content Will Go Here */}
        <p className="text-zinc-400">Link4 game canvas.</p>
      </div>
    </div>
  );
}
