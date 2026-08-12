const https = require('https');

const d = new Date();
const dates = [
  new Date(d.getTime() - 24 * 60 * 60 * 1000),
  d,
  new Date(d.getTime() + 24 * 60 * 60 * 1000),
].map(date => {
  const str = date.toLocaleString("en-US", { timeZone: "America/New_York", year: "numeric", month: "2-digit", day: "2-digit" });
  return `${str.substring(6,10)}${str.substring(0,2)}${str.substring(3,5)}`;
});

dates.forEach(date => {
  https.get(`https://site.api.espn.com/apis/site/v2/sports/soccer/fifa.world/scoreboard?dates=${date}&limit=300`, (resp) => {
    let data = '';
    resp.on('data', (chunk) => { data += chunk; });
    resp.on('end', () => {
      try {
        const parsed = JSON.parse(data);
        const events = parsed.events || [];
        const matches = events.filter(e => JSON.stringify(e).includes("Canada"));
        if(matches.length > 0) {
          console.log(`Date: ${date}`);
          console.log(JSON.stringify(matches.map(e => e.name), null, 2));
        }
      } catch(e) {
      }
    });
  });
});
