const fs = require('fs');

// REVERT Link4Page.tsx loss accumulation
let content = fs.readFileSync('src/pages/link4/Link4Page.tsx', 'utf8');

content = content.replace(
  `              let pickScore = pick.score !== undefined && pick.score !== null ? pick.score : 0;
              if (status === 'WIN' || status === 'LOSS') {
                 if (pickScore !== 0) {
                    score += pickScore;`,
  `              let pickScore = pick.score !== undefined && pick.score !== null ? pick.score : 0;
              if (status === 'WIN') {
                 if (pickScore !== 0) {
                    score += pickScore;`
);
fs.writeFileSync('src/pages/link4/Link4Page.tsx', content);

// REVERT link4Grader.ts loss accumulation logic
let graderContent = fs.readFileSync('src/services/link4Grader.ts', 'utf8');
graderContent = graderContent.replace(
  `             const ml = pickedHome ? finalizedMatchup.metadata?.mlHome : finalizedMatchup.metadata?.mlAway;
             if (ml !== undefined && ml !== null) {
                 pickScore = ml;
             }
           }
        }

        if (status === 'LOSS') {`,
  `             if (won) {
                 const ml = pickedHome ? finalizedMatchup.metadata?.mlHome : finalizedMatchup.metadata?.mlAway;
                 if (ml !== undefined && ml !== null) {
                     pickScore = ml;
                 }
             }
           }
        }

        if (status === 'LOSS') {`
);

graderContent = graderContent.replace(
  `       for (const pick of rawPicks as any[]) {
          if (pick.status === 'WIN' || pick.status === 'LOSS') {
             if (pick.status === 'WIN') wins++;
             if (pick.score !== undefined && pick.score !== null && pick.score !== 0) {
                 score += pick.score;
             } else {`,
  `       for (const pick of rawPicks as any[]) {
          if (pick.status === 'WIN') {
             wins++;
             if (pick.score !== undefined && pick.score !== null && pick.score !== 0) {
                 score += pick.score;
             } else {`
);

fs.writeFileSync('src/services/link4Grader.ts', graderContent);
console.log('Reverted logic to only award score on WINs');
