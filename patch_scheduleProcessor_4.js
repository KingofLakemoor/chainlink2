import fs from 'fs';

let content = fs.readFileSync('src/services/scheduleProcessor.ts', 'utf8');

const replacement = `              const parseGolfStatCount = (lsHoles: any[], targetHoles: number, statType: string) => {
                 if (!lsHoles || lsHoles.length === 0) return 0;
                 let count = 0;
                 let holesProcessed = 0;
                 for (const h of lsHoles) {
                    if (holesProcessed >= targetHoles) break;
                    if (h && h.scoreType && h.scoreType.displayValue) {
                        const val = h.scoreType.displayValue;
                        if (statType === 'BIRDIES_THRU_HOLES') {
                            if (val === '-1' || val === '-2' || val === '-3') count++; // Birdie or better
                        } else if (statType === 'EAGLES_THRU_HOLES') {
                            if (val === '-2' || val === '-3') count++; // Eagle or better
                        } else if (statType === 'PARS_THRU_HOLES') {
                            if (val === 'E') count++; // Pars
                        } else if (statType === 'BOGEYS_THRU_HOLES') {
                            if (val === '+1' || val === '+2' || val === '+3' || val === '+4') count++; // Bogey or worse
                        }
                    }
                    holesProcessed++;
                 }
                 return count;
              };

              const isTournamentPost = scrapedMatchup.competition?.status?.type?.state === 'post';
              const isHomeWD = homeComp?.status?.type?.name === 'STATUS_WITHDRAWN' || homeComp?.status?.type?.name === 'STATUS_CUT' || homeComp?.status?.type?.name === 'STATUS_DQ';
              const isAwayWD = awayComp?.status?.type?.name === 'STATUS_WITHDRAWN' || awayComp?.status?.type?.name === 'STATUS_CUT' || awayComp?.status?.type?.name === 'STATUS_DQ';

              if (isRoundScore || isThruHolesMatchup) {`;

content = content.replace(
`              const parseGolfStatCount = (lsHoles: any[], targetHoles: number, statType: string) => {
                 if (!lsHoles || lsHoles.length === 0) return 0;
                 let count = 0;
                 let holesProcessed = 0;
                 for (const h of lsHoles) {
                    if (holesProcessed >= targetHoles) break;
                    if (h && h.scoreType && h.scoreType.displayValue) {
                        const val = h.scoreType.displayValue;
                        if (statType === 'BIRDIES_THRU_HOLES') {
                            if (val === '-1' || val === '-2' || val === '-3') count++; // Birdie or better
                        } else if (statType === 'EAGLES_THRU_HOLES') {
                            if (val === '-2' || val === '-3') count++; // Eagle or better
                        } else if (statType === 'PARS_THRU_HOLES') {
                            if (val === 'E') count++; // Pars
                        } else if (statType === 'BOGEYS_THRU_HOLES') {
                            if (val === '+1' || val === '+2' || val === '+3' || val === '+4') count++; // Bogey or worse
                        }
                    }
                    holesProcessed++;
                 }
                 return count;
              };

              if (isRoundScore || isThruHolesMatchup) {`,
replacement
);

content = content.replace(
`                 const isTournamentPost = scrapedMatchup.competition?.status?.type?.state === 'post';
                 const isHomeWD = homeComp?.status?.type?.name === 'STATUS_WITHDRAWN' || homeComp?.status?.type?.name === 'STATUS_CUT' || homeComp?.status?.type?.name === 'STATUS_DQ';
                 const isAwayWD = awayComp?.status?.type?.name === 'STATUS_WITHDRAWN' || awayComp?.status?.type?.name === 'STATUS_CUT' || awayComp?.status?.type?.name === 'STATUS_DQ';

                 // If the whole tournament is post or they have finished their specific round`,
`                 // If the whole tournament is post or they have finished their specific round`
);

fs.writeFileSync('src/services/scheduleProcessor.ts', content, 'utf8');
