async function test() {
  const url = 'http://site.api.espn.com/apis/site/v2/sports/golf/pga/scoreboard';
  try {
    const response = await fetch(url);
    const data = await response.json();
    if (data.events && data.events.length > 0) {
        console.log("Looking for dictionary or stat names...");
        // maybe it's in the event competitions?
        if (data.events[0].competitions[0].status) {
           // console.log("status", data.events[0].competitions[0].status)
        }
    }
  } catch (e) {
    console.error("Error fetching scoreboard:", e.message);
  }
}
test();
