const fs = require('fs');

let content = fs.readFileSync('src/services/link4Grader.ts', 'utf8');

content = content.replace(
  `             if (won) {
                 const ml = pickedHome ? finalizedMatchup.metadata?.mlHome : finalizedMatchup.metadata?.mlAway;
                 if (ml !== undefined && ml !== null) {
                     pickScore = ml;
                 }
             }`,
  `             const ml = pickedHome ? finalizedMatchup.metadata?.mlHome : finalizedMatchup.metadata?.mlAway;
             if (ml !== undefined && ml !== null) {
                 pickScore = ml;
             }`
);

fs.writeFileSync('src/services/link4Grader.ts', content);
console.log('Patched Link4Grader.ts');
