const fs = require('fs');
let code = fs.readFileSync('src/services/espnScraper.ts', 'utf8');

const searchBlock = `
                  if (MATCHUP_FINAL_STATUSES.includes(rawStatus) || finalStatusDesc.toLowerCase().includes('final')) {
                      finalStatus = "STATUS_FINAL";
                  } else if (MATCHUP_POSTPONED_STATUSES.includes(rawStatus)) {
                      finalStatus = "STATUS_POSTPONED";
                  } else if (MATCHUP_DELAYED_STATUSES.includes(rawStatus)) {
                      finalStatus = "STATUS_DELAYED";
                  } else if (MATCHUP_IN_PROGRESS_STATUSES.includes(rawStatus) || (rawStatus === "STATUS_SCHEDULED" && (homeScore > 0 || awayScore > 0))) {
                      finalStatus = "STATUS_IN_PROGRESS";
                  } else {
                      finalStatus = "STATUS_SCHEDULED";
                      finalStatusDesc = "Upcoming";
                  }

                  parsedMatchups.push({
                     startTime: new Date(comp.date).getTime(),
                     active: true,
                     featured: false,
                     league,
                     type: "MONEYLINE",
                     status: finalStatus,
                     statusDesc: finalStatusDesc,
                     gameId: matchupGameId,
                     homeTeam: {
                       id: String(homeCompetitor.id),
                       name: homeCompetitor.athlete.displayName,
                       image: homeCompetitor.athlete.flag?.href || "/icons/icon-256x256.png",
                       score: homeScore
                     },
                     awayTeam: {
                       id: String(awayCompetitor.id),
                       name: awayCompetitor.athlete.displayName,
                       image: awayCompetitor.athlete.flag?.href || "/icons/icon-256x256.png",
                       score: awayScore
                     },
                     cost: 0,
                     metadata: {
                       network: comp.geoBroadcasts?.[0]?.media?.shortName || "N/A",
                       tournament: tournamentName
                     }
                  });
`;

const replaceBlock = `
                  const compState = comp.status?.type?.state || "";
                  if (MATCHUP_FINAL_STATUSES.includes(rawStatus) || finalStatusDesc.toLowerCase().includes('final') || compState === 'post') {
                      finalStatus = "STATUS_FINAL";
                  } else if (MATCHUP_POSTPONED_STATUSES.includes(rawStatus)) {
                      finalStatus = "STATUS_POSTPONED";
                  } else if (MATCHUP_DELAYED_STATUSES.includes(rawStatus)) {
                      finalStatus = "STATUS_DELAYED";
                  } else if (MATCHUP_IN_PROGRESS_STATUSES.includes(rawStatus) || compState === 'in') {
                      finalStatus = "STATUS_IN_PROGRESS";
                      if (comp.status?.type?.detail) {
                          finalStatusDesc = comp.status.type.detail;
                      }
                  } else {
                      finalStatus = "STATUS_SCHEDULED";
                      finalStatusDesc = "Upcoming";
                  }

                  const homeLinescores = homeCompetitor.linescores ? homeCompetitor.linescores.map((ls: any) => ls.value || 0) : [];
                  const awayLinescores = awayCompetitor.linescores ? awayCompetitor.linescores.map((ls: any) => ls.value || 0) : [];

                  parsedMatchups.push({
                     startTime: new Date(comp.date).getTime(),
                     active: true,
                     featured: false,
                     league,
                     type: "MONEYLINE",
                     status: finalStatus,
                     statusDesc: finalStatusDesc,
                     gameId: matchupGameId,
                     homeTeam: {
                       id: String(homeCompetitor.id),
                       name: homeCompetitor.athlete.displayName,
                       image: homeCompetitor.athlete.flag?.href || "/icons/icon-256x256.png",
                       score: homeScore
                     },
                     awayTeam: {
                       id: String(awayCompetitor.id),
                       name: awayCompetitor.athlete.displayName,
                       image: awayCompetitor.athlete.flag?.href || "/icons/icon-256x256.png",
                       score: awayScore
                     },
                     cost: 0,
                     metadata: {
                       network: comp.geoBroadcasts?.[0]?.media?.shortName || "N/A",
                       tournament: tournamentName,
                       homeLinescores,
                       awayLinescores
                     }
                  });
`;

code = code.replace(searchBlock, replaceBlock);
fs.writeFileSync('src/services/espnScraper.ts', code);
