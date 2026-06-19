import fs from 'fs';

let content = fs.readFileSync('src/services/scheduleProcessor.ts', 'utf8');

const replacement = `                 const isTournamentPost = scrapedMatchup.competition.status?.type?.state === 'post';
                 const isHomeWD = homeComp.status?.type?.name === 'STATUS_WITHDRAWN' || homeComp.status?.type?.name === 'STATUS_CUT' || homeComp.status?.type?.name === 'STATUS_DQ';
                 const isAwayWD = awayComp.status?.type?.name === 'STATUS_WITHDRAWN' || awayComp.status?.type?.name === 'STATUS_CUT' || awayComp.status?.type?.name === 'STATUS_DQ';

                 // If the whole tournament is post or they have finished their specific round
                 // Note: ESPN doesn't always cleanly mark individual rounds as 'post', so we rely on teeTimes and general status if needed
                 // But typically if they are on a later round, the previous round is final.
                 const currentRound = homeComp.status?.period || 1;
                 const isHomeRoundDone = isTournamentPost || isHomeWD || (currentRound === period && homeComp.status?.type?.state === 'post') || currentRound > period || (currentRound === period && homeComp.status?.type?.completed);

                 const awayCurrentRound = awayComp.status?.period || 1;
                 const isAwayRoundDone = isTournamentPost || isAwayWD || (awayCurrentRound === period && awayComp.status?.type?.state === 'post') || awayCurrentRound > period || (awayCurrentRound === period && awayComp.status?.type?.completed);`;

content = content.replace(
`                 // If the whole tournament is post or they have finished their specific round
                 // Note: ESPN doesn't always cleanly mark individual rounds as 'post', so we rely on teeTimes and general status if needed
                 // But typically if they are on a later round, the previous round is final.
                 const currentRound = homeComp.status?.period || 1;
                 const isHomeRoundDone = homeComp.status?.type?.state === 'post' || currentRound > period || (currentRound === period && homeComp.status?.type?.completed);

                 const awayCurrentRound = awayComp.status?.period || 1;
                 const isAwayRoundDone = awayComp.status?.type?.state === 'post' || awayCurrentRound > period || (awayCurrentRound === period && awayComp.status?.type?.completed);`,
replacement
);

fs.writeFileSync('src/services/scheduleProcessor.ts', content, 'utf8');
