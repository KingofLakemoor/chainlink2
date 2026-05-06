const matchup = {
  homeTeam: { id: "home", score: 20 },
  awayTeam: { id: "away", score: 24 },
  type: "SPREAD",
  metadata: { spread: -3 }
};

const homeScore = matchup.homeTeam.score;
const awayScore = matchup.awayTeam.score;
const spread = matchup.metadata.spread; // home team spread

const pickTeamId = "home";

// home team -3
// home = 20
// away = 24
// home adjusted = 20 + (-3) = 17
// away = 24

const homeAdjustedScore = homeScore + spread;
const awayAdjustedScore = awayScore - spread;

console.log({homeAdjustedScore, awayAdjustedScore})
