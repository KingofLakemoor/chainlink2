const https = require('https');
https.get('https://site.api.espn.com/apis/site/v2/sports/soccer/fifa.world/summary?event=760502', (res) => {
  let data = '';
  res.on('data', chunk => data += chunk);
  res.on('end', () => {
    try {
      const json = JSON.parse(data);
      const teams = json.boxscore?.teams || json.header?.competitions[0]?.competitors;
      console.log("Game 760502 Teams:");
      teams?.forEach(t => console.log(t.team?.name || t.team?.displayName));
    } catch(e) { console.log(e); }
  });
});
https.get('https://site.api.espn.com/apis/site/v2/sports/soccer/fifa.world/summary?event=760503', (res) => {
  let data = '';
  res.on('data', chunk => data += chunk);
  res.on('end', () => {
    try {
      const json = JSON.parse(data);
      const teams = json.boxscore?.teams || json.header?.competitions[0]?.competitors;
      console.log("Game 760503 Teams:");
      teams?.forEach(t => console.log(t.team?.name || t.team?.displayName));
    } catch(e) { console.log(e); }
  });
});
