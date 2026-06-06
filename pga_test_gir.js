async function test() {
  // Let's do one more check to see if we can find GIR/Driving Accuracy inside athlete stats
  const url = `http://site.api.espn.com/apis/common/v3/sports/golf/pga/athletes/10054`;
  try {
     const athRes = await fetch(url);
     const athData = await athRes.json();
     if(athData.athlete && athData.athlete.statsSummary && athData.athlete.statsSummary.statistics) {
         console.log("Stats summary keys:", athData.athlete.statsSummary.statistics.map(s => s.name));
     }
  } catch(e) {
      console.log(e.message)
  }
}
test();
