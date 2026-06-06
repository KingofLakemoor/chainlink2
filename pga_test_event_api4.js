async function test() {
  const url = `https://site.api.espn.com/apis/site/v2/sports/golf/leaderboard?league=pga`;
  try {
     const evtResponse = await fetch(url);
     const evtData = await evtResponse.json();

     if(evtData.events && evtData.events[0]) {
         const event = evtData.events[0];
         console.log(event.competitions[0].competitors[0].statistics);

         const athleteId = event.competitions[0].competitors[0].athlete.id;
         console.log("Athlete ID:", athleteId);

         // try athlete api
         const athUrl = `http://site.api.espn.com/apis/common/v3/sports/golf/pga/athletes/${athleteId}`;
         const athRes = await fetch(athUrl);
         const athData = await athRes.json();
         console.log("Athlete keys:", Object.keys(athData));
     }
  } catch(e) {
      console.log(e.message)
  }
}
test();
