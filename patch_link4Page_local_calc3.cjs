const fs = require('fs');

let content = fs.readFileSync('src/pages/link4/Link4Page.tsx', 'utf8');

content = content.replace(
  `              let pickScore = pick.score !== undefined && pick.score !== null ? pick.score : 0;
              if (status === 'WIN' || status === 'LOSS') {
                 if (pickScore !== 0) {
                    score += pickScore;
                 } else if (pickMatchup) {
                    // Fallback to recalculating if we still have the matchup locally but grader hasn't set score
                    const pickedHome = pick.name === pickMatchup.homeTeam.name;
                    const ml = pickedHome ? pickMatchup.metadata?.mlHome : pickMatchup.metadata?.mlAway;
                    if (ml !== undefined && ml !== null) {
                       score += ml;
                       pickScore = ml;
                    }
                 }
              }`,
  `              let pickScore = pick.score !== undefined && pick.score !== null ? pick.score : 0;
              if (status === 'WIN' || status === 'LOSS') {
                 if (pickScore !== 0) {
                    score += pickScore;
                 } else if (pickMatchup) {
                    // Fallback to recalculating if we still have the matchup locally but grader hasn't set score
                    const pickedHome = pick.name === pickMatchup.homeTeam.name;
                    const ml = pickedHome ? pickMatchup.metadata?.mlHome : pickMatchup.metadata?.mlAway;
                    if (ml !== undefined && ml !== null) {
                       score += ml;
                       pickScore = ml;
                    }
                 }
              } else if (status === 'PENDING') {
                 if (pickScore !== 0) {
                 } else if (pickMatchup) {
                    const pickedHome = pick.name === pickMatchup.homeTeam.name;
                    const ml = pickedHome ? pickMatchup.metadata?.mlHome : pickMatchup.metadata?.mlAway;
                    if (ml !== undefined && ml !== null) {
                       pickScore = ml;
                    }
                 }
              }`
);

fs.writeFileSync('src/pages/link4/Link4Page.tsx', content);
console.log('Patched local pickScore in Link4Page.tsx');
