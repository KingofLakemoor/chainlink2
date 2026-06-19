import fs from 'fs';

let content = fs.readFileSync('src/services/scheduleProcessor.ts', 'utf8');

const replacement = `                 const isTournamentPost = scrapedMatchup.competition?.status?.type?.state === 'post';
                 const isHomeWD = homeComp?.status?.type?.name === 'STATUS_WITHDRAWN' || homeComp?.status?.type?.name === 'STATUS_CUT' || homeComp?.status?.type?.name === 'STATUS_DQ';
                 const isAwayWD = awayComp?.status?.type?.name === 'STATUS_WITHDRAWN' || awayComp?.status?.type?.name === 'STATUS_CUT' || awayComp?.status?.type?.name === 'STATUS_DQ';`;

content = content.replace(
`                 const isTournamentPost = scrapedMatchup.competition.status?.type?.state === 'post';
                 const isHomeWD = homeComp.status?.type?.name === 'STATUS_WITHDRAWN' || homeComp.status?.type?.name === 'STATUS_CUT' || homeComp.status?.type?.name === 'STATUS_DQ';
                 const isAwayWD = awayComp.status?.type?.name === 'STATUS_WITHDRAWN' || awayComp.status?.type?.name === 'STATUS_CUT' || awayComp.status?.type?.name === 'STATUS_DQ';`,
replacement
);

fs.writeFileSync('src/services/scheduleProcessor.ts', content, 'utf8');
