const fs = require('fs');
let code = fs.readFileSync('src/App.tsx', 'utf8');

const searchBlock = `
                    <div className="flex flex-col items-center justify-start min-w-[40px] pt-1">
                      {m.status === 'STATUS_IN_PROGRESS' && (
                        <>
                          <span className="relative flex h-2.5 w-2.5 mb-1">
                            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-500 opacity-75"></span>
                            <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-red-500"></span>
                          </span>
                          <span className="text-[9px] font-bold text-red-500 tracking-wider">LIVE</span>
                        </>
                      )}
                    </div>
`;

const replaceBlock = `
                    <div className="flex flex-col items-center justify-start min-w-[40px] pt-1">
                      {m.status === 'STATUS_IN_PROGRESS' && (
                        <>
                          <span className="relative flex h-2.5 w-2.5 mb-1">
                            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-500 opacity-75"></span>
                            <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-red-500"></span>
                          </span>
                          { (m.league === 'ATP' || m.league === 'WTA') && m.statusDesc ? (
                            <span className="text-[9px] font-bold text-red-500 tracking-wider whitespace-nowrap">{m.statusDesc.toUpperCase()}</span>
                          ) : (
                            <span className="text-[9px] font-bold text-red-500 tracking-wider">LIVE</span>
                          )}
                        </>
                      )}
                    </div>
`;

code = code.replace(searchBlock, replaceBlock);

const searchBlock2 = `
                  <div className="flex items-start gap-2">
                    <div className="flex flex-col items-center gap-1.5 w-12 sm:w-16">
                      <div className={cn("w-full h-10 rounded flex items-center justify-center font-mono font-bold text-lg shadow-inner relative overflow-hidden",
                        m.status === 'STATUS_IN_PROGRESS' ? "bg-[#27272a] text-white ring-1 ring-zinc-700" : "bg-[#1a1a1a]",
                        (m.metadata?.lowerScoreWins ? m.awayTeam.score < m.homeTeam.score : m.awayTeam.score > m.homeTeam.score) ? "text-zinc-100" : (m.status === 'STATUS_IN_PROGRESS' ? "text-zinc-200" : "text-zinc-500")
                      )}>
                         {(m.metadata?.lowerScoreWins ? m.awayTeam.score < m.homeTeam.score : m.awayTeam.score > m.homeTeam.score) && <div className="absolute bottom-0 left-0 right-0 h-1 bg-gradient-to-r from-orange-500 to-yellow-300"></div>}
                         {m.awayTeam.score ?? 0}
                      </div>

                      {/* Away Hot Bar */}
`;

const replaceBlock2 = `
                  <div className="flex items-start gap-2">
                    <div className="flex flex-col items-center gap-1.5 w-auto min-w-[3rem] sm:min-w-[4rem]">
                      <div className={cn("w-full h-10 px-2 rounded flex items-center justify-center font-mono font-bold text-lg shadow-inner relative overflow-hidden gap-2",
                        m.status === 'STATUS_IN_PROGRESS' ? "bg-[#27272a] text-white ring-1 ring-zinc-700" : "bg-[#1a1a1a]",
                        (m.metadata?.lowerScoreWins ? m.awayTeam.score < m.homeTeam.score : m.awayTeam.score > m.homeTeam.score) ? "text-zinc-100" : (m.status === 'STATUS_IN_PROGRESS' ? "text-zinc-200" : "text-zinc-500")
                      )}>
                         {(m.metadata?.lowerScoreWins ? m.awayTeam.score < m.homeTeam.score : m.awayTeam.score > m.homeTeam.score) && <div className="absolute bottom-0 left-0 right-0 h-1 bg-gradient-to-r from-orange-500 to-yellow-300"></div>}
                         {(m.league === 'ATP' || m.league === 'WTA') && m.metadata?.awayLinescores ? (
                           m.metadata.awayLinescores.map((score: number, i: number) => (
                             <span key={i}>{score}</span>
                           ))
                         ) : (
                           m.awayTeam.score ?? 0
                         )}
                      </div>

                      {/* Away Hot Bar */}
`;

code = code.replace(searchBlock2, replaceBlock2);

const searchBlock3 = `
                    <div className="flex flex-col items-center gap-1.5 w-12 sm:w-16">
                      <div className={cn("w-full h-10 rounded flex items-center justify-center font-mono font-bold text-lg shadow-inner relative overflow-hidden",
                        m.status === 'STATUS_IN_PROGRESS' ? "bg-[#27272a] text-white ring-1 ring-zinc-700" : "bg-[#1a1a1a]",
                        (m.metadata?.lowerScoreWins ? m.homeTeam.score < m.awayTeam.score : m.homeTeam.score > m.awayTeam.score) ? "text-zinc-100" : (m.status === 'STATUS_IN_PROGRESS' ? "text-zinc-200" : "text-zinc-500")
                      )}>
                         {(m.metadata?.lowerScoreWins ? m.homeTeam.score < m.awayTeam.score : m.homeTeam.score > m.awayTeam.score) && <div className="absolute bottom-0 left-0 right-0 h-1 bg-gradient-to-r from-orange-500 to-yellow-300"></div>}
                         {m.homeTeam.score ?? 0}
                      </div>

                      {/* Home Hot Bar */}
`;

const replaceBlock3 = `
                    <div className="flex flex-col items-center gap-1.5 w-auto min-w-[3rem] sm:min-w-[4rem]">
                      <div className={cn("w-full h-10 px-2 rounded flex items-center justify-center font-mono font-bold text-lg shadow-inner relative overflow-hidden gap-2",
                        m.status === 'STATUS_IN_PROGRESS' ? "bg-[#27272a] text-white ring-1 ring-zinc-700" : "bg-[#1a1a1a]",
                        (m.metadata?.lowerScoreWins ? m.homeTeam.score < m.awayTeam.score : m.homeTeam.score > m.awayTeam.score) ? "text-zinc-100" : (m.status === 'STATUS_IN_PROGRESS' ? "text-zinc-200" : "text-zinc-500")
                      )}>
                         {(m.metadata?.lowerScoreWins ? m.homeTeam.score < m.awayTeam.score : m.homeTeam.score > m.awayTeam.score) && <div className="absolute bottom-0 left-0 right-0 h-1 bg-gradient-to-r from-orange-500 to-yellow-300"></div>}
                         {(m.league === 'ATP' || m.league === 'WTA') && m.metadata?.homeLinescores ? (
                           m.metadata.homeLinescores.map((score: number, i: number) => (
                             <span key={i}>{score}</span>
                           ))
                         ) : (
                           m.homeTeam.score ?? 0
                         )}
                      </div>

                      {/* Home Hot Bar */}
`;

code = code.replace(searchBlock3, replaceBlock3);

fs.writeFileSync('src/App.tsx', code);
