import React from 'react';
import { Link } from 'react-router-dom';
import { Gamepad2, ChevronRight, Link2 } from 'lucide-react';
import { Button } from '../ui/button';
import { cn } from '../../lib/utils';

interface DashboardPickProps {
  activePick: any;
  activeMatchup: any;
}

export function DashboardPick({ activePick, activeMatchup }: DashboardPickProps) {
  return (
    <div className="bg-[#121212] border border-zinc-800 rounded-2xl p-6 h-full">
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-lg font-bold text-zinc-100 flex items-center gap-2">
          <Gamepad2 className="w-5 h-5 text-cyan-400" /> My Active Pick
        </h2>
        <Link to="/play" className="text-sm text-cyan-500 hover:text-cyan-400 font-medium flex items-center gap-1">
          View Games <ChevronRight className="w-4 h-4" />
        </Link>
      </div>

      {activeMatchup ? (
        <div className="bg-[#161d2b] rounded-xl border border-[#27272a] overflow-hidden bg-gradient-to-r from-[#111f38] to-[#121212]">
          <div className="p-5 flex flex-col items-center text-center">
            <div className="text-xs font-bold text-cyan-400 uppercase tracking-wider mb-2">{activeMatchup.league}</div>
            <div className="text-lg font-bold text-zinc-100 mb-6">{activeMatchup.title}</div>

            <div className="flex items-center justify-center gap-8 w-full">
              <div className={cn("flex flex-col items-center gap-3 p-4 rounded-xl border", activePick?.pick?.id === activeMatchup.awayTeam.id ? 'border-green-500 bg-green-500/10' : 'border-zinc-800 opacity-50')}>
                <img src={activeMatchup.awayTeam.image} className="w-16 h-16 object-contain" alt={activeMatchup.awayTeam.name} />
                <span className="text-sm font-bold text-zinc-200">{activeMatchup.awayTeam.name}</span>
                {activePick?.pick?.id === activeMatchup.awayTeam.id && <span className="text-xs bg-green-500 text-green-950 px-2 py-0.5 rounded font-bold mt-1">YOUR PICK</span>}
              </div>
              <div className="text-zinc-500 font-bold text-xl">VS</div>
              <div className={cn("flex flex-col items-center gap-3 p-4 rounded-xl border", activePick?.pick?.id === activeMatchup.homeTeam.id ? 'border-green-500 bg-green-500/10' : 'border-zinc-800 opacity-50')}>
                <img src={activeMatchup.homeTeam.image} className="w-16 h-16 object-contain" alt={activeMatchup.homeTeam.name} />
                <span className="text-sm font-bold text-zinc-200">{activeMatchup.homeTeam.name}</span>
                {activePick?.pick?.id === activeMatchup.homeTeam.id && <span className="text-xs bg-green-500 text-green-950 px-2 py-0.5 rounded font-bold mt-1">YOUR PICK</span>}
              </div>
            </div>
          </div>
          <div className="bg-[#111111] px-5 py-3 border-t border-[#27272a] flex justify-between items-center text-sm">
            <span className="text-zinc-400 font-medium">{activeMatchup.status === 'STATUS_SCHEDULED' ? 'Upcoming' : 'In Progress'}</span>
            <span className="text-zinc-300 flex items-center gap-1 font-medium">Reward: <Link2 className="w-4 h-4 text-cyan-400" /> <span className="text-cyan-400 font-bold">{activeMatchup.reward ?? 10}</span></span>
          </div>
        </div>
      ) : (
        <div className="flex flex-col items-center justify-center py-16 bg-[#18181a] rounded-xl border border-zinc-800 border-dashed">
          <Link2 className="w-12 h-12 text-zinc-600 mb-4" />
          <p className="text-zinc-400 mb-4 font-medium">You don't have an active pick right now.</p>
          <Link to="/play">
            <Button className="bg-cyan-600 hover:bg-cyan-500 text-white font-bold">
              Make a Pick
            </Button>
          </Link>
        </div>
      )}
    </div>
  );
}

//Todo loading skeleton
export function DashboardPickSkeleton() {
  return (
    <div className="flex flex-col gap-4 w-full h-[400px] border border-zinc-800 rounded-xl bg-zinc-950 p-6 animate-pulse">
      {/* Header Skeleton */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <div className="w-5 h-5 bg-zinc-800 rounded-md" />
          <div className="h-5 w-32 bg-zinc-800 rounded-md" />
        </div>
        <div className="h-4 w-24 bg-zinc-800 rounded-md" />
      </div>

      {/* Main Content Skeleton */}
      <div className="flex-1 bg-[#161d2b]/50 rounded-xl border border-zinc-800 overflow-hidden flex flex-col">
        <div className="p-5 flex flex-col items-center text-center flex-1 justify-center">
          <div className="h-3 w-16 bg-zinc-800 rounded-full mb-4" />
          <div className="h-6 w-3/4 bg-zinc-800 rounded-md mb-8" />

          <div className="flex items-center justify-center gap-8 w-full">
            {/* Team 1 */}
            <div className="flex flex-col items-center gap-3 p-4 rounded-xl border border-zinc-800/50 w-32">
              <div className="w-16 h-16 bg-zinc-800 rounded-lg" />
              <div className="h-4 w-20 bg-zinc-800 rounded-md" />
            </div>

            <div className="text-zinc-800 font-bold text-xl">VS</div>

            {/* Team 2 */}
            <div className="flex flex-col items-center gap-3 p-4 rounded-xl border border-zinc-800/50 w-32">
              <div className="w-16 h-16 bg-zinc-800 rounded-lg" />
              <div className="h-4 w-20 bg-zinc-800 rounded-md" />
            </div>
          </div>
        </div>

        {/* Footer Skeleton */}
        <div className="bg-zinc-900/50 px-5 py-3 border-t border-zinc-800 flex justify-between items-center">
          <div className="h-4 w-20 bg-zinc-800 rounded-md" />
          <div className="h-4 w-24 bg-zinc-800 rounded-md" />
        </div>
      </div>
    </div>
  );
}
