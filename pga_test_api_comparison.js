async function test() {
  const lbUrl = 'https://site.api.espn.com/apis/site/v2/sports/golf/leaderboard?league=pga';
  const sbUrl = 'http://site.api.espn.com/apis/site/v2/sports/golf/pga/scoreboard';

  const [lbRes, sbRes] = await Promise.all([fetch(lbUrl), fetch(sbUrl)]);
  const lbData = await lbRes.json();
  const sbData = await sbRes.json();

  if (lbData.events.length > 0 && sbData.events.length > 0) {
      console.log("Leaderboard event ID:", lbData.events[0].id);
      console.log("Scoreboard event ID:", sbData.events[0].id);

      const lbComp = lbData.events[0].competitions[0].competitors[0];
      const sbComp = sbData.events[0].competitions[0].competitors.find(c => c.id === lbComp.id) || sbData.events[0].competitions[0].competitors[0];

      console.log("LB Comp keys:", Object.keys(lbComp));
      console.log("SB Comp keys:", Object.keys(sbComp));

      // I will check if I can just use scoreboard for EVERYTHING
      // Does scoreboard have tee times?
      const sbLs = sbComp.linescores[0];
      console.log("SB linescore keys:", Object.keys(sbLs));

      // We need teeTime from linescores usually
      console.log("SB has tee time in linescore?", !!sbLs.teeTime);
      console.log("LB has tee time in linescore?", !!lbComp.linescores[0].teeTime);
  }
}
test();
