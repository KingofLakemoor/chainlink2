async function test() {
  const url = 'http://site.api.espn.com/apis/site/v2/sports/golf/pga/scoreboard';
  try {
    const response = await fetch(url);
    const data = await response.json();
    if (data.events && data.events.length > 0) {
        const comp = data.events[0].competitions[0];
        if (comp.competitors && comp.competitors.length > 0) {
             const firstCompetitor = comp.competitors[0];
             // The period statistics had an array with 7 items earlier.
             // [3, 1, 0.0, 0, 0, 14, "Thu Jun 04..."]
             // Let's look for a different endpoint or deeper info that names these stats.
        }
    }
  } catch (e) {
    console.error(e.message);
  }
}
test();
