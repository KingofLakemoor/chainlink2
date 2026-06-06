async function test() {
  const sbUrl = 'http://site.api.espn.com/apis/site/v2/sports/golf/pga/scoreboard';
  const sbRes = await fetch(sbUrl);
  const sbData = await sbRes.json();

  if (sbData.events.length > 0) {
      const sbComp = sbData.events[0].competitions[0].competitors[0];

      console.log("Does SB have status inside competitor?", !!sbComp.status);
      console.log("SB score type:", typeof sbComp.score, sbComp.score);
  }
}
test();
