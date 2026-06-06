async function test() {
  const url = 'http://site.api.espn.com/apis/site/v2/sports/golf/pga/scoreboard';
  try {
    const response = await fetch(url);
    const data = await response.json();
    if (data.events && data.events.length > 0) {
        const event = data.events[0];
        console.log("Event keys:", Object.keys(event));

        // Maybe some stats dictionary in season or provider?
        console.log("Season keys:", Object.keys(data.season));
        console.log("Provider keys:", Object.keys(data.provider));
    }
  } catch (e) {
    console.error("Error fetching scoreboard:", e.message);
  }
}
test();
