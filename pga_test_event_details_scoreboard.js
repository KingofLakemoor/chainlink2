async function test() {
  const url = 'http://site.api.espn.com/apis/site/v2/sports/golf/pga/scoreboard';
  try {
    const response = await fetch(url);
    const data = await response.json();
    if (data.events && data.events.length > 0) {
        const comp = data.events[0].competitions[0];
        if (comp.competitors && comp.competitors.length > 0) {
            console.log(JSON.stringify(comp.competitors[0], null, 2));
        }
    }
  } catch (e) {
    console.error("Error fetching scoreboard:", e.message);
  }
}
test();
