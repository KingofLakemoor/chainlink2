import fs from 'fs';

let content = fs.readFileSync('src/services/scheduleProcessor.ts', 'utf8');

const importReplacement = `import { gradeMatchups } from './grader.js';
import { gradePickemMatchups } from './pickemGrader.js';
import { gradeLink4Matchups, processCompletedLink4Segments } from './link4Grader.js';`;

content = content.replace("import { gradeMatchups } from './grader.js';\nimport { gradePickemMatchups } from './pickemGrader.js';\nimport { gradeLink4Matchups } from './link4Grader.js';", importReplacement);

const newCall = `      response.scoreMatchupsCreated = newCount;
      response.matchupsUpdated = updateCount;

      // Check for Link4 payouts
      await processCompletedLink4Segments();

    } catch (e: any) {`;

content = content.replace(/      response\.scoreMatchupsCreated = newCount;\n      response\.matchupsUpdated = updateCount;\n    \} catch \(e: any\) \{/m, newCall);

fs.writeFileSync('src/services/scheduleProcessor.ts', content, 'utf8');
