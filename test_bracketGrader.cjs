const normalizeTeamName = (name) => {
  if (!name) return name;
  const n = name.trim();
  if (n === 'Ivory Coast') return "Côte d'Ivoire";
  if (n === 'Congo DR') return "DR Congo";
  if (n === 'Cape Verde') return "Cabo Verde";
  return n;
};

const bracket = {
  teams: [
    "Canada", "Morocco",
    "Paraguay", "France",
    "Brazil", "Norway",
    "Mexico", "England",
    "Portugal", "Spain",
    "United States", "Belgium",
    "Argentina", "Egypt",
    "Switzerland", "Colombia"
  ],
  matchIds: {
    'r0-m0': '760502',
    'r0-m1': '760503'
  }
};

const finalMatchups = [
  { gameId: '760502', homeTeam: { name: 'Canada', score: 0 }, awayTeam: { name: 'Morocco', score: 3 }, league: 'FIFA', status: 'STATUS_FINAL' },
  { gameId: '760503', homeTeam: { name: 'Paraguay', score: 0 }, awayTeam: { name: 'France', score: 1 }, league: 'FIFA', status: 'STATUS_FINAL' }
];

const results = {};

for (const matchup of finalMatchups) {
      const homeTeam = normalizeTeamName(matchup.homeTeam?.name);
      const awayTeam = normalizeTeamName(matchup.awayTeam?.name);

      const homeScore = Number(matchup.homeTeam?.score || 0);
      const awayScore = Number(matchup.awayTeam?.score || 0);

      let winner = null;
      let loser = null;

      if (homeScore > awayScore) {
          winner = homeTeam;
          loser = awayTeam;
      } else if (awayScore > homeScore) {
          winner = awayTeam;
          loser = homeTeam;
      }

      console.log(`Matchup ${matchup.gameId}: ${homeTeam} ${homeScore} - ${awayTeam} ${awayScore}. Winner: ${winner}`);

      if (winner && loser) {
         const rounds = [bracket.teams || []];
         let r = 0;
         let matchFound = false;

         while (r < 5) {
             const currentRoundTeams = rounds[r];
             if (!currentRoundTeams || currentRoundTeams.length < 2) break;

             const nextRoundTeams = new Array(currentRoundTeams.length / 2).fill(null);

             for (let i = 0; i < currentRoundTeams.length / 2; i++) {
                 const t1 = currentRoundTeams[i * 2];
                 const t2 = currentRoundTeams[i * 2 + 1];

                 const mId = `r${r}-m${i}`;

                 const isMatchById = bracket.matchIds && bracket.matchIds[mId] === matchup.gameId;
                 const isMatchByTeams = t1 && t2 && ((t1 === winner && t2 === loser) || (t1 === loser && t2 === winner));

                 console.log(`  Evaluating slot ${mId}: t1=${t1}, t2=${t2}. MatchByTeams=${isMatchByTeams}, MatchById=${isMatchById}`);

                 if (isMatchById || isMatchByTeams) {
                     if (results[mId] !== winner) {
                         results[mId] = winner;
                     }
                     matchFound = true;
                     console.log(`    -> Slot ${mId} winner set to ${winner}`);
                 }

                 if (results[mId]) {
                     nextRoundTeams[i] = results[mId];
                 }
             }

             rounds.push(nextRoundTeams);
             r++;
             if (matchFound) break;
         }
      }
}

console.log("Final results:", results);
