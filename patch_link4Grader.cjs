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

content = content.replace(
  `                   const pickedHome = pick.name === matchup.homeTeam?.name;
                   const ml = pickedHome ? matchup.metadata?.mlHome : matchup.metadata?.mlAway;
                   if (ml !== undefined && ml !== null) {
                      score += ml;
                   }`,
  `                   const pickedHome = pick.name === matchup.homeTeam?.name;
                   const ml = pickedHome ? matchup.metadata?.mlHome : matchup.metadata?.mlAway;
                   if (ml !== undefined && ml !== null) {
                      score += won ? ml : -Math.abs(ml);
                   }` // Wait, moneyline is only for wins/losses. Let's rethink. If they lost, do they lose moneyline?
);

console.log('We should check the exact scoring rule. "Positive odds add to your score, negative odds subtract from it." Wait, the help page says: "Your score in Link4 is determined by the Moneyline (ML) odds of your picks. Positive odds add to your score, negative odds subtract from it. (e.g., +150 adds 150 points, -110 subtracts 110 points)."');
