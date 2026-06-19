import fs from 'fs';

let content = fs.readFileSync('src/services/espnScraper.ts', 'utf-8');

const replacement1 = `
                      if (comp.status?.type?.detail && !comp.status.type.detail.toLowerCase().match(/\\b(am|pm|edt|est|pdt|pst|cst|cdt)\\b/)) {
                          finalStatusDesc = comp.status.type.detail;
                      } else {
                          finalStatusDesc = "In Progress";
                      }

                      if (league === "CRICKET" && comp.status?.period) {
                          const currentPeriod = comp.status.period;
                          let currentOvers;
                          const homeLs = homeCompetitor.linescores?.find((ls: any) => ls.period === currentPeriod);
                          const awayLs = awayCompetitor.linescores?.find((ls: any) => ls.period === currentPeriod);
                          if (homeLs && homeLs.isBatting) {
                              currentOvers = homeLs.overs;
                          } else if (awayLs && awayLs.isBatting) {
                              currentOvers = awayLs.overs;
                          }
                          if (currentOvers !== undefined) {
                              finalStatusDesc = \`Thru \${currentOvers}\`;
                          }
                      }`;

content = content.replace(`
                      if (comp.status?.type?.detail && !comp.status.type.detail.toLowerCase().match(/\\b(am|pm|edt|est|pdt|pst|cst|cdt)\\b/)) {
                          finalStatusDesc = comp.status.type.detail;
                      } else {
                          finalStatusDesc = "In Progress";
                      }

                      if (league === "CRICKET" && comp.status?.period) {
                          finalStatusDesc = \\\`Thru \\\${comp.status.period}\\\`;
                      }`, replacement1);


const replacement2 = `
              if (league === "MLB" || league === "CBASE") {
                  const detailStr = competition.status?.type?.detail || competition.status?.type?.shortDetail;
                  if (detailStr) {
                      if (detailStr.includes("Bot ")) {
                          finalStatusDesc = detailStr.replace("Bot ", "Bottom ");
                      } else if (detailStr.includes("Mid ")) {
                          finalStatusDesc = detailStr.replace("Mid ", "Middle ");
                      } else {
                          finalStatusDesc = detailStr;
                      }
                  }
              } else if (league === "CRICKET" && competition.status?.period) {
                  const currentPeriod = competition.status.period;
                  let currentOvers;
                  const homeLs = home.linescores?.find((ls: any) => ls.period === currentPeriod);
                  const awayLs = away.linescores?.find((ls: any) => ls.period === currentPeriod);
                  if (homeLs && homeLs.isBatting) {
                      currentOvers = homeLs.overs;
                  } else if (awayLs && awayLs.isBatting) {
                      currentOvers = awayLs.overs;
                  }
                  if (currentOvers !== undefined) {
                      finalStatusDesc = \`Thru \${currentOvers}\`;
                  }
              }`;

content = content.replace(`
              if (league === "MLB" || league === "CBASE") {
                  const detailStr = competition.status?.type?.detail || competition.status?.type?.shortDetail;
                  if (detailStr) {
                      if (detailStr.includes("Bot ")) {
                          finalStatusDesc = detailStr.replace("Bot ", "Bottom ");
                      } else if (detailStr.includes("Mid ")) {
                          finalStatusDesc = detailStr.replace("Mid ", "Middle ");
                      } else {
                          finalStatusDesc = detailStr;
                      }
                  }
              } else if (league === "CRICKET" && competition.status?.period) {
                  finalStatusDesc = \\\`Thru \\\${competition.status.period}\\\`;
              }`, replacement2);

fs.writeFileSync('src/services/espnScraper.ts', content);
