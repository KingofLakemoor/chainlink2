const fs = require('fs');

let content = fs.readFileSync('src/pages/link4/Link4Page.tsx', 'utf8');

content = content.replace(
  `  const handleMakePick = (matchup: any, team: any) => {
    if (nextPickIndex === -1 || hasSubmitted || hasLoss) return;

    const newPicks = [...picks];
    newPicks[nextPickIndex] = {
      id: \`pick-\${matchup.gameId}\`,
      name: team.name,
      sport: matchup.league,
      startTime: matchup.startTime,
    };
    setPicks(newPicks);
    setIsSelectingPick(false);
  };`,
  `  const handleMakePick = (matchup: any, team: any) => {
    if (nextPickIndex === -1 || hasSubmitted || hasLoss) return;

    const pickedHome = team.name === matchup.homeTeam.name;
    const ml = pickedHome ? matchup.metadata?.mlHome : matchup.metadata?.mlAway;

    const newPicks = [...picks];
    newPicks[nextPickIndex] = {
      id: \`pick-\${matchup.gameId}\`,
      name: team.name,
      sport: matchup.league,
      startTime: matchup.startTime,
      score: ml || 0,
    };
    setPicks(newPicks);
    setIsSelectingPick(false);
  };`
);

content = content.replace(
  `           // Calculate potential score by assuming PENDING games are WINs
           processedPicks.forEach((pick: any) => {
              if (pick.status === 'PENDING') {
                 const pickMatchup = allMatchups.find(m => m.gameId === pick.id.replace('pick-', ''));
                 if (pickMatchup) {
                    const pickedHome = pick.name === pickMatchup.homeTeam.name;
                    const ml = pickedHome ? pickMatchup.metadata?.mlHome : pickMatchup.metadata?.mlAway;
                    if (ml !== undefined && ml !== null && ml > 0) {
                       potentialScore += ml;
                    } else if (ml !== undefined && ml !== null && ml < 0) {
                       potentialScore += ml;
                    }
                 }
              }
           });`,
  `           // Calculate potential score by assuming PENDING games are WINs
           processedPicks.forEach((pick: any) => {
              if (pick.status === 'PENDING') {
                 if (pick.score !== undefined && pick.score !== null && pick.score !== 0) {
                    potentialScore += pick.score;
                 } else {
                    const pickMatchup = allMatchups.find(m => m.gameId === pick.id.replace('pick-', ''));
                    if (pickMatchup) {
                       const pickedHome = pick.name === pickMatchup.homeTeam.name;
                       const ml = pickedHome ? pickMatchup.metadata?.mlHome : pickMatchup.metadata?.mlAway;
                       if (ml !== undefined && ml !== null) {
                          potentialScore += ml;
                       }
                    }
                 }
              }
           });`
);

content = content.replace(
  `                      {isWin && (
                        <div className="mt-2 text-green-500 font-bold">{pickScore > 0 ? \`+\${pickScore}\` : pickScore}</div>
                      )}
                      {isLoss && (
                        <div className="mt-2 text-red-500 font-bold uppercase">Loss</div>
                      )}`,
  `                      {(isWin || processedStatus === 'PENDING') && pickScore !== undefined && pickScore !== null && (
                        <div className={\`mt-2 font-bold \${isWin ? 'text-green-500' : 'text-zinc-500'}\`}>
                          {pickScore > 0 ? \`+\${pickScore}\` : pickScore}
                        </div>
                      )}
                      {isLoss && (
                        <div className="mt-2 text-red-500 font-bold uppercase">Loss</div>
                      )}`
);

fs.writeFileSync('src/pages/link4/Link4Page.tsx', content);
console.log('Patched Link4Page.tsx');
