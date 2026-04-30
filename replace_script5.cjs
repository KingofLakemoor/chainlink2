const fs = require('fs');
const path = require('path');

const filePath = path.join(__dirname, 'src/services/grader.ts');
let content = fs.readFileSync(filePath, 'utf8');

const oldFilter = `  const finalMatchups = matchups.filter(m => m.status === 'STATUS_FINAL');`;
const newFilter = `  const finalMatchups = matchups.filter(m => m.status === 'STATUS_FINAL' || m.status === 'STATUS_POSTPONED');`;
content = content.replace(oldFilter, newFilter);

const oldGradingLogic = `  const homeScore = matchup.homeTeam?.score || 0;
  const awayScore = matchup.awayTeam?.score || 0;
  const lowerScoreWins = matchup.metadata?.lowerScoreWins;

  let winnerId: string | null = null;
  let isTie = false;

  if (homeScore === awayScore) {
    isTie = true;
  } else if (lowerScoreWins) {
    winnerId = homeScore < awayScore ? matchup.homeTeam.id : matchup.awayTeam.id;
  } else {
    winnerId = homeScore > awayScore ? matchup.homeTeam.id : matchup.awayTeam.id;
  }`;

const newGradingLogic = `  const homeScore = matchup.homeTeam?.score || 0;
  const awayScore = matchup.awayTeam?.score || 0;
  const lowerScoreWins = matchup.metadata?.lowerScoreWins;
  const isPostponed = matchup.status === 'STATUS_POSTPONED';

  let winnerId: string | null = null;
  let isTie = false;

  if (isPostponed) {
    isTie = true; // Treats postponed as a push to refund
  } else if (homeScore === awayScore) {
    isTie = true;
  } else if (lowerScoreWins) {
    winnerId = homeScore < awayScore ? matchup.homeTeam.id : matchup.awayTeam.id;
  } else {
    winnerId = homeScore > awayScore ? matchup.homeTeam.id : matchup.awayTeam.id;
  }`;

content = content.replace(oldGradingLogic, newGradingLogic);

fs.writeFileSync(filePath, content, 'utf8');
console.log('grader.ts updated');
