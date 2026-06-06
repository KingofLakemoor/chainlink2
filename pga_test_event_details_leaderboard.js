async function test() {
  const url = 'https://site.api.espn.com/apis/site/v2/sports/golf/leaderboard?league=pga';
  const response = await fetch(url);
  const data = await response.json();

  console.log(JSON.stringify(data.events[0].competitions[0].competitors[0].statistics, null, 2));
}
test();
