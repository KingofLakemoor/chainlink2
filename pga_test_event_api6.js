async function test() {
  const url = `http://site.api.espn.com/apis/site/v2/sports/golf/pga/scoreboard`;
  try {
     const athRes = await fetch(url);
     const athData = await athRes.json();

     const comp = athData.events[0].competitions[0];
     const firstLineScore = comp.competitors[0].linescores[0];
     console.log("Linescores period 1:", firstLineScore.linescores.map(l => l.scoreType.displayValue));

     // let's grab all available stat keys we can compute from holes
  } catch(e) {
      console.log(e.message)
  }
}
test();
