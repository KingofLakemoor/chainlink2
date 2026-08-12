const https = require('https');
https.get('https://site.api.espn.com/apis/site/v2/sports/soccer/fifa.world/scoreboard', (resp) => {
  let data = '';
  resp.on('data', (chunk) => { data += chunk; });
  resp.on('end', () => {
    try {
      const parsed = JSON.parse(data);
      const events = parsed.events || [];
      const canadaGames = events.filter(e => JSON.stringify(e).includes("Canada"));
      console.log(JSON.stringify(canadaGames.map(e => e.name), null, 2));
    } catch(e) {
      console.log(e);
    }
  });
}).on("error", (err) => {
  console.log("Error: " + err.message);
});
