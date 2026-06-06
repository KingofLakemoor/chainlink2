async function test() {
  const url = 'http://site.api.espn.com/apis/site/v2/sports/golf/pga/scoreboard';
  try {
    const response = await fetch(url);
    const data = await response.json();
    console.log(data);
  } catch (e) {
    console.error("Error fetching scoreboard:", e.message);
  }
}
test();
