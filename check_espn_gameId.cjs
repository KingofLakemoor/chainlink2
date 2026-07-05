const https = require('https');
https.get('https://site.api.espn.com/apis/site/v2/sports/soccer/fifa.world/summary?event=760502', (res) => {
  let data = '';
  res.on('data', chunk => data += chunk);
  res.on('end', () => {
    try {
      const json = JSON.parse(data);
      console.log("Game ID:", json.header.id, "Competitions:", json.header.competitions.map(c => c.id));
    } catch(e) { console.log(e); }
  });
});
