const fetch = require('node-fetch');

async function test() {
  const url = 'https://site.api.espn.com/apis/site/v2/sports/golf/leaderboard?league=pga';
  const response = await fetch(url);
  const data = await response.json();

  if (data.events && data.events.length > 0 && data.events[0].competitions && data.events[0].competitions.length > 0) {
    const comp = data.events[0].competitions[0];
    if (comp.competitors && comp.competitors.length > 0) {
      console.log("Competitor example keys:", Object.keys(comp.competitors[0]));
      console.log("Linescores keys:", comp.competitors[0].linescores ? Object.keys(comp.competitors[0].linescores[0] || {}) : 'no linescores');
      console.log("Statistics:", JSON.stringify(comp.competitors[0].statistics, null, 2));
      console.log("Score:", comp.competitors[0].score);
    }
  } else {
    console.log("No data found");
  }
}
test();
