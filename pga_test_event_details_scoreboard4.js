async function test() {
  const url = 'http://site.api.espn.com/apis/site/v2/sports/golf/pga/scoreboard';
  try {
    const response = await fetch(url);
    const data = await response.json();
    console.log("Root keys:", Object.keys(data));

    // check if there's any dictionary
    if (data.leagues && data.leagues.length > 0) {
        console.log("League keys:", Object.keys(data.leagues[0]));
    }
  } catch (e) {
    console.error("Error fetching scoreboard:", e.message);
  }
}
test();
