async function test() {
  const url = 'https://site.api.espn.com/apis/site/v2/sports/golf/leaderboard?league=pga';
  const response = await fetch(url);
  const data = await response.json();

  if (data.events && data.events.length > 0 && data.events[0].competitions && data.events[0].competitions.length > 0) {
    const comp = data.events[0].competitions[0];
    if (comp.competitors && comp.competitors.length > 0) {
      console.log(JSON.stringify(comp.competitors[0], null, 2));
    }
  } else {
    console.log("No data found");
  }
}
test();
