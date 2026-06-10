import fs from 'fs';

let content = fs.readFileSync('src/services/scheduleProcessor.ts', 'utf8');

const importStatement = `import { gradeMatchups } from './grader.js';
import { gradePickemMatchups } from './pickemGrader.js';
import { gradeLink4Matchups } from './link4Grader.js';`;

content = content.replace("import { gradeMatchups } from './grader.js';\nimport { gradePickemMatchups } from './pickemGrader.js';", importStatement);

const gradeCall = `        await gradeMatchups(matchupsToGrade);
        await gradeLink4Matchups(matchupsToGrade);`;

content = content.replace('        await gradeMatchups(matchupsToGrade);', gradeCall);

fs.writeFileSync('src/services/scheduleProcessor.ts', content, 'utf8');
