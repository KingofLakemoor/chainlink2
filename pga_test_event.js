async function test() {
  const url = 'https://site.api.espn.com/apis/site/v2/sports/golf/leaderboard?league=pga';
  const response = await fetch(url);
  const data = await response.json();

  if (data.events && data.events.length > 0) {
    const event = data.events[0];
    console.log("Event keys:", Object.keys(event));
    if (event.tournaments && event.tournaments.length > 0) {
      console.log("Tournament keys:", Object.keys(event.tournaments[0]));
    }
  } else {
    console.log("No data found");
  }
}
test();
