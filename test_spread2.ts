const homeScore = 20;
const awayScore = 24;
const spread = -5; // home spread is -5 (home favorite).  away spread is +5

const homeAdjusted = homeScore + spread; // 20 + -5 = 15
// The calculation of awayAdjusted is wrong above. Only one team's score needs adjustment,
// or you adjust the favored team's score.
// If you add spread to home, home score is adjusted. You compare with actual away score.
// Let's verify:
console.log(`Home actual: ${homeScore}, Away actual: ${awayScore}`);
console.log(`Spread: ${spread} (added to home)`);
console.log(`Home adjusted: ${homeScore + spread}`);
console.log(`Away actual: ${awayScore}`);
console.log(`Winner with spread: ${(homeScore + spread) > awayScore ? "home" : (homeScore + spread) < awayScore ? "away" : "push"}`);
