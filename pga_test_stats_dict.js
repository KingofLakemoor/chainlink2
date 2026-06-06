async function test() {
  const url = 'http://site.api.espn.com/apis/site/v2/sports/golf/pga/scoreboard';
  try {
    const response = await fetch(url);
    const data = await response.json();
    if (data.events && data.events.length > 0) {
        // Are there dictionaries in competitions or competitors?
        const comp = data.events[0].competitions[0];
        console.log("Competition keys:", Object.keys(comp));

        if (comp.competitors && comp.competitors.length > 0) {
            const firstCompetitor = comp.competitors[0];
            const linescores = firstCompetitor.linescores;
            if (linescores && linescores.length > 0) {
                 const firstPeriod = linescores[0];
                 console.log("First period linescore keys:", Object.keys(firstPeriod));
                 if (firstPeriod.statistics) {
                     console.log("Period statistics structure:", JSON.stringify(firstPeriod.statistics, null, 2));
                 }
            }
        }
    }
  } catch (e) {
    console.error("Error fetching scoreboard:", e.message);
  }
}
test();
