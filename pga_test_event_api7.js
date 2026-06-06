async function test() {
  const url = `http://site.api.espn.com/apis/site/v2/sports/golf/pga/scoreboard`;
  try {
     const athRes = await fetch(url);
     const athData = await athRes.json();

     const comp = athData.events[0].competitions[0];
     // what is scoreType format?
     const hole = comp.competitors[0].linescores[0].linescores[0];
     console.log("Hole:", JSON.stringify(hole, null, 2));
  } catch(e) {
      console.log(e.message)
  }
}
test();
