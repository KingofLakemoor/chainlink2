const fs = require('fs');

let content = fs.readFileSync('src/App.tsx', 'utf8');

const matchPicksCalculation = `
          const hasPicked = !!userPicks[m.id];
          const pickData = userPicks[m.id];
          const isPickDisabled = hasPicked || hasActivePickAnywhere;

          const mCounts = matchupPickCounts[m.id] || { total: 0, away: 0, home: 0 };
          const awayHotPct = mCounts.total > 0 ? Math.round((mCounts.away / mCounts.total) * 100) : 0;
          const homeHotPct = mCounts.total > 0 ? Math.round((mCounts.home / mCounts.total) * 100) : 0;
          const isScheduled = m.status === 'STATUS_SCHEDULED';
`;

content = content.replace(
  /          const hasPicked = !!userPicks\[m\.id\];\n          const pickData = userPicks\[m\.id\];\n          const isPickDisabled = hasPicked \|\| hasActivePickAnywhere;/,
  matchPicksCalculation
);

const scoreDisplayReplacement = `                 <div className="flex items-center gap-2">
                    {isScheduled ? (
                      <>
                        <div className="w-16 h-10 flex items-center justify-center relative">
                          <div className="w-12 h-1 bg-zinc-800 rounded-full overflow-hidden">
                            <div className="h-full bg-blue-500 rounded-full" style={{ width: \`\${awayHotPct}%\` }}></div>
                          </div>
                        </div>
                        <div className="w-16 h-10 flex items-center justify-center relative">
                          <div className="w-12 h-1 bg-zinc-800 rounded-full overflow-hidden">
                            <div className="h-full bg-blue-500 rounded-full" style={{ width: \`\${homeHotPct}%\` }}></div>
                          </div>
                        </div>
                      </>
                    ) : (
                      <>
                        <div className={cn("w-16 h-10 bg-[#1a1a1a] rounded flex items-center justify-center font-mono font-bold text-lg shadow-inner relative overflow-hidden",
                          (m.metadata?.lowerScoreWins ? m.awayTeam.score < m.homeTeam.score : m.awayTeam.score > m.homeTeam.score) ? "text-zinc-100" : "text-zinc-500"
                        )}>
                           {(m.metadata?.lowerScoreWins ? m.awayTeam.score < m.homeTeam.score : m.awayTeam.score > m.homeTeam.score) && <div className="absolute bottom-0 left-0 right-0 h-1 bg-gradient-to-r from-orange-500 to-yellow-300"></div>}
                           {m.awayTeam.score ?? 0}
                        </div>
                        <div className={cn("w-16 h-10 bg-[#1a1a1a] rounded flex items-center justify-center font-mono font-bold text-lg shadow-inner relative overflow-hidden",
                          (m.metadata?.lowerScoreWins ? m.homeTeam.score < m.awayTeam.score : m.homeTeam.score > m.awayTeam.score) ? "text-zinc-100" : "text-zinc-500"
                        )}>
                           {(m.metadata?.lowerScoreWins ? m.homeTeam.score < m.awayTeam.score : m.homeTeam.score > m.awayTeam.score) && <div className="absolute bottom-0 left-0 right-0 h-1 bg-gradient-to-r from-orange-500 to-yellow-300"></div>}
                           {m.homeTeam.score ?? 0}
                        </div>
                      </>
                    )}
                 </div>`;

content = content.replace(
  /                 <div className="flex items-center gap-2">\n                    <div className=\{cn\("w-16 h-10 bg-\[#1a1a1a\] rounded flex items-center justify-center font-mono font-bold text-lg shadow-inner relative overflow-hidden",\n                      \(m\.metadata\?\.lowerScoreWins \? m\.awayTeam\.score < m\.homeTeam\.score : m\.awayTeam\.score > m\.homeTeam\.score\) \? "text-zinc-100" : "text-zinc-500"\n                    \)\}>\n                       \{\(m\.metadata\?\.lowerScoreWins \? m\.awayTeam\.score < m\.homeTeam\.score : m\.awayTeam\.score > m\.homeTeam\.score\) && <div className="absolute bottom-0 left-0 right-0 h-1 bg-gradient-to-r from-orange-500 to-yellow-300"><\/div>\}\n                       \{m\.awayTeam\.score \?\? 0\}\n                    <\/div>\n                    <div className=\{cn\("w-16 h-10 bg-\[#1a1a1a\] rounded flex items-center justify-center font-mono font-bold text-lg shadow-inner relative overflow-hidden",\n                      \(m\.metadata\?\.lowerScoreWins \? m\.homeTeam\.score < m\.awayTeam\.score : m\.homeTeam\.score > m\.awayTeam\.score\) \? "text-zinc-100" : "text-zinc-500"\n                    \)\}>\n                       \{\(m\.metadata\?\.lowerScoreWins \? m\.homeTeam\.score < m\.awayTeam\.score : m\.homeTeam\.score > m\.awayTeam\.score\) && <div className="absolute bottom-0 left-0 right-0 h-1 bg-gradient-to-r from-orange-500 to-yellow-300"><\/div>\}\n                       \{m\.homeTeam\.score \?\? 0\}\n                    <\/div>\n                 <\/div>/,
  scoreDisplayReplacement
);

fs.writeFileSync('src/App.tsx', content);
