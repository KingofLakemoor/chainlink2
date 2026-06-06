async function test() {
  const lbUrl = 'https://site.api.espn.com/apis/site/v2/sports/golf/leaderboard?league=pga';
  const sbUrl = 'http://site.api.espn.com/apis/site/v2/sports/golf/pga/scoreboard';

  const [lbRes, sbRes] = await Promise.all([fetch(lbUrl), fetch(sbUrl)]);
  const lbData = await lbRes.json();
  const sbData = await sbRes.json();

  if (lbData.events.length > 0 && sbData.events.length > 0) {
      const lbEvent = lbData.events[0];
      const sbEvent = sbData.events[0];

      const lbCompetitors = lbEvent.competitions[0].competitors;
      const sbCompetitors = sbEvent.competitions[0].competitors;

      const sbMap = new Map();
      for (const c of sbCompetitors) {
          sbMap.set(c.id, c);
      }

      // Merge
      for (const c of lbCompetitors) {
          const sbC = sbMap.get(c.id);
          if (sbC && sbC.linescores) {
              for (const lbLs of c.linescores) {
                  const sbLs = sbC.linescores.find(s => s.period === lbLs.period);
                  if (sbLs && sbLs.linescores) {
                      lbLs.holes = sbLs.linescores;
                  }
              }
          }
      }

      console.log("Merged hole linescore keys:", Object.keys(lbCompetitors[0].linescores[0].holes[0]));
  }
}
test();
