import fs from 'fs';

let content = fs.readFileSync('src/services/scheduleProcessor.ts', 'utf8');

const replacement = `                 if (isTournamentPost || isHomeWD) homeFinal = true;
                 if (isTournamentPost || isAwayWD) awayFinal = true;`;

content = content.replace(
`                 if (homeComp.status?.type?.state === 'post') homeFinal = true;
                 if (awayComp.status?.type?.state === 'post') awayFinal = true;`,
replacement
);

fs.writeFileSync('src/services/scheduleProcessor.ts', content, 'utf8');
