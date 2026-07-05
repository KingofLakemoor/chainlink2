const https = require('https');
https.get('https://site.api.espn.com/apis/site/v2/sports/soccer/fifa.world/scoreboard?dates=2026', (res) => {
  let data = '';
  res.on('data', chunk => data += chunk);
  res.on('end', () => {
    try {
      const json = JSON.parse(data);
      console.log("Game 760502 from scoreboard:");
      const game2 = json.events.find(e => e.id === '760502');
      game2.competitions[0].competitors.forEach(c => console.log(c.team.name, "Score:", c.score, "Winner:", c.winner));
      console.log("Game 760503 from scoreboard:");
      const game3 = json.events.find(e => e.id === '760503');
      game3.competitions[0].competitors.forEach(c => console.log(c.team.name, "Score:", c.score, "Winner:", c.winner));
    } catch(e) { console.log(e); }
  });
});
