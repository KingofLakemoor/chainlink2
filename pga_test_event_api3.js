async function test() {
  const url = `https://site.web.api.espn.com/apis/site/v2/sports/golf/pga/leaderboard?region=us&lang=en&event=401811950`;
  try {
     const evtResponse = await fetch(url);
     const evtData = await evtResponse.json();
     console.log("Leaderboard event specific keys:", Object.keys(evtData));
  } catch(e) {
      console.log(e.message)
  }
}
test();
