import fs from 'fs';

let content = fs.readFileSync('src/pages/link4/Link4Page.tsx', 'utf8');

const replacement = `
        for (const userPickData of allUserPicks) {
           let score = 0;
           let potentialScore = 0;
           let hasLoss = userPickData.hasLoss === true;

           const rawPicks = Array.isArray(userPickData.picks) ? userPickData.picks : (userPickData.picks ? Object.values(userPickData.picks) : []);
           const processedPicks = rawPicks.map((pick: any) => {
              const pickMatchup = allMatchups.find(m => m.gameId === pick.id.replace('pick-', ''));
              let status = pick.status || 'PENDING';

              // If backend hasn't graded it yet, do a local calculation for display
              if (!pick.status || pick.status === 'PENDING') {
                if (!pickMatchup || pickMatchup.status === 'STATUS_SCHEDULED' || pickMatchup.status === 'STATUS_IN_PROGRESS') {
                   status = 'PENDING';
                } else if (pickMatchup.status === 'STATUS_FINAL') {
                   // Determine win/loss locally to update display instantly before grader runs
                   const homeScore = pickMatchup.homeTeam.score;
                   const awayScore = pickMatchup.awayTeam.score;
                   let won = false;
                   let isPush = false;

                   if (homeScore === awayScore) {
                      isPush = true;
                      status = 'PUSH';
                   } else {
                      const pickedHome = pick.name === pickMatchup.homeTeam.name;
                      if (pickedHome && homeScore > awayScore) won = true;
                      if (!pickedHome && awayScore > homeScore) won = true;
                      status = won ? 'WIN' : 'LOSS';
                   }

                   if (status === 'LOSS') {
                      hasLoss = true;
                   }
                }
              }

              if (status === 'WIN' && pickMatchup) {
                 // Add Moneyline logic for calculating score
                 const pickedHome = pick.name === pickMatchup.homeTeam.name;
                 const ml = pickedHome ? pickMatchup.metadata?.mlHome : pickMatchup.metadata?.mlAway;
                 if (ml !== undefined && ml !== null) {
                    score += ml;
                 }
              }

              return {
                 id: pick.id,
                 name: pick.name,
                 sport: pick.sport,
                 status
              };
           });

           // Calculate potential score by assuming PENDING games are WINs
           processedPicks.forEach((pick: any) => {
              if (pick.status === 'PENDING') {
                 const pickMatchup = allMatchups.find(m => m.gameId === pick.id.replace('pick-', ''));
                 if (pickMatchup) {
                    const pickedHome = pick.name === pickMatchup.homeTeam.name;
                    const ml = pickedHome ? pickMatchup.metadata?.mlHome : pickMatchup.metadata?.mlAway;
                    if (ml !== undefined && ml !== null && ml > 0) {
                       potentialScore += ml;
                    } else if (ml !== undefined && ml !== null && ml < 0) {
                       potentialScore += ml;
                    }
                 }
              }
           });

           // If there is any loss, cancel the remaining pending picks locally for display
           if (hasLoss) {
              processedPicks.forEach((p: any) => {
                 if (p.status === 'PENDING') p.status = 'CANCELLED';
              });
              score = -99999;
           }

           leaderboardEntries.push({
              userId: userPickData.userId,
              username: userPickData.username,
              avatarUrl: userPickData.avatarUrl,
              picks: processedPicks,
              score,
              potentialScore: hasLoss ? -99999 : score + potentialScore,
              hasLoss
           });
        }

        // Sort Leaderboard: score descending, but keep losses at the bottom
        leaderboardEntries.sort((a, b) => {
           if (a.hasLoss && !b.hasLoss) return 1;
           if (!a.hasLoss && b.hasLoss) return -1;
           return b.score - a.score;
        });
        setLeaderboardData(leaderboardEntries);
`;

content = content.replace(/        for \(const userPickData of allUserPicks\) \{[\s\S]*?        setLeaderboardData\(leaderboardEntries\);/m, replacement);

const interfaceReplacement = `interface Link4LeaderboardPick {
  id: string;
  name?: string;
  sport?: string;
  status: 'PENDING' | 'WIN' | 'LOSS' | 'PUSH' | 'EMPTY' | 'CANCELLED';
}

interface Link4LeaderboardEntry {
  userId: string;
  username: string;
  avatarUrl: string;
  picks: Link4LeaderboardPick[];
  score: number;
  potentialScore: number;
  hasLoss: boolean;
}`;

content = content.replace(/interface Link4LeaderboardPick \{[\s\S]*?potentialScore: number;\n\}/m, interfaceReplacement);

const htmlReplacement = `                    if (pick.status === 'PENDING') {
                      return (
                        <div key={pIdx} className="w-16 h-16 sm:w-20 sm:h-20 rounded-lg border-2 border-zinc-700 bg-zinc-800/50 flex flex-col items-center justify-center shrink-0">
                          <Lock className="w-4 h-4 text-zinc-500 mb-1" />
                          <span className="text-[10px] font-bold text-zinc-500 uppercase">Pick In</span>
                        </div>
                      );
                    }

                    if (pick.status === 'CANCELLED') {
                      return (
                        <div key={pIdx} className="w-16 h-16 sm:w-20 sm:h-20 rounded-lg border-2 border-red-500/20 bg-red-500/5 flex flex-col items-center justify-center p-1 text-center shrink-0 opacity-50">
                          <div className="text-[9px] sm:text-[10px] text-zinc-500 font-bold mb-0.5 truncate w-full px-1">{pick.sport}</div>
                          <div className="text-xs sm:text-sm font-bold truncate w-full px-1 line-through text-zinc-500">{pick.name}</div>
                        </div>
                      );
                    }`;

content = content.replace(/                    if \(pick\.status === 'PENDING'\) \{[\s\S]*?<\/div>\n\s*\);\n\s*\}/m, htmlReplacement);

fs.writeFileSync('src/pages/link4/Link4Page.tsx', content, 'utf8');
