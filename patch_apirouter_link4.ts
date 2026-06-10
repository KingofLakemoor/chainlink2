import fs from 'fs';

let content = fs.readFileSync('src/apiRouter.ts', 'utf8');

const importStatement = `import { gradeMatchups } from './services/grader.js';
import { gradeLink4Matchups } from './services/link4Grader.js';`;

content = content.replace("import { gradeMatchups } from './services/grader.js';", importStatement);

const gradeCall = `    await gradeMatchups([{ ...matchup, status: 'STATUS_FINAL' }]); // Force grade
    await gradeLink4Matchups([{ ...matchup, status: 'STATUS_FINAL' }]);`;

content = content.replace("    await gradeMatchups([{ ...matchup, status: 'STATUS_FINAL' }]); // Force grade", gradeCall);

const gradeCall2 = `      await gradeMatchups([matchupData]);
      await gradeLink4Matchups([matchupData]);`;

content = content.replace("      await gradeMatchups([matchupData]);", gradeCall2);

fs.writeFileSync('src/apiRouter.ts', content, 'utf8');
