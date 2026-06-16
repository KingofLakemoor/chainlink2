import React from 'react';

// Common sports/leagues mapped to some display names and icons if necessary
// The database typically uses strings like 'NFL', 'MLB', 'NBA', 'MBB', 'WBB', 'NHL', 'EPL', etc.
// In a real app we might map these to icons, but for now we'll use emojis or standard text
const leagueIconMap: Record<string, string> = {
  NBA: '🏀',
  MBB: '🏀',
  WBB: '🏀',
  MLB: '⚾',
  NFL: '🏈',
  'COLLEGE-FOOTBALL': '🏈',
  NHL: '🏒',
  EPL: '⚽',
  MLS: '⚽',
  TUR: '⚽',
  RPL: '⚽',
  CSL: '⚽',
  WNBA: '🏀',
};

interface LifetimeStatsProps {
  userStats: Record<string, { wins: number, losses: number, pushes: number }>;
}

export default function LifetimeStats({ userStats }: LifetimeStatsProps) {
  const leagues = Object.keys(userStats).sort((a, b) => {
    // Sort by total volume of picks
    const totalA = (userStats[a].wins || 0) + (userStats[a].losses || 0) + (userStats[a].pushes || 0);
    const totalB = (userStats[b].wins || 0) + (userStats[b].losses || 0) + (userStats[b].pushes || 0);
    return totalB - totalA;
  });

  if (leagues.length === 0) {
    return (
      <div className="bg-[#121212] border border-zinc-800 rounded-2xl p-8 text-center text-zinc-500 mb-8">
        <p>No lifetime stats available yet. Make some picks!</p>
      </div>
    );
  }

  const totalPicks = leagues.reduce((sum, l) => sum + (userStats[l].wins || 0) + (userStats[l].losses || 0) + (userStats[l].pushes || 0), 0);

  return (
    <div className="bg-[#121212] border border-zinc-800 rounded-2xl p-6 mb-8 overflow-hidden">
      <div className="text-center mb-8">
        <h2 className="text-2xl font-bold text-zinc-100 font-display">League Stats</h2>
        <p className="text-sm text-zinc-400 mt-1">Breakdown of performance across different leagues ({totalPicks} Total Picks)</p>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
        {leagues.map(league => {
          const stats = userStats[league];
          const icon = leagueIconMap[league] || '🏆';

          return (
            <div key={league} className="bg-zinc-900/50 border border-zinc-800 rounded-xl p-6 flex flex-col items-center justify-center hover:bg-zinc-800/50 transition-colors">
              <div className="text-4xl mb-4 opacity-90">{icon}</div>
              <div className="text-lg font-bold text-zinc-100 tracking-wide mb-1">
                {stats.wins || 0} - {stats.losses || 0} - {stats.pushes || 0}
              </div>
              <div className="text-[10px] uppercase font-bold tracking-widest text-zinc-500">
                {league}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
