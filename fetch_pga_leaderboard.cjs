const fs = require('fs');
fetch('https://site.api.espn.com/apis/site/v2/sports/golf/leaderboard?league=pga')
  .then(res => res.json())
  .then(data => {
      fs.writeFileSync('pga_leaderboard.json', JSON.stringify(data, null, 2));
      console.log('done');
  });
