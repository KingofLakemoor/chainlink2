const https = require('https');

const date = '20260628';
https.get(`https://site.api.espn.com/apis/site/v2/sports/soccer/fifa.world/scoreboard?dates=${date}&limit=300`, (resp) => {
  let data = '';
  resp.on('data', (chunk) => { data += chunk; });
  resp.on('end', () => {
    try {
      const parsed = JSON.parse(data);
      const events = parsed.events || [];
      const matches = events.filter(e => JSON.stringify(e).includes("Canada"));
      if(matches.length > 0) {
        console.log(JSON.stringify(matches.map(e => e.competitions[0].competitors.map(c => c.team.displayName)), null, 2));
      }
    } catch(e) {
    }
  });
});
