async function test() {
  const url = 'http://site.api.espn.com/apis/site/v2/sports/golf/pga/scoreboard';
  try {
    const response = await fetch(url);
    const data = await response.json();
    if (data.events && data.events.length > 0) {
        const comp = data.events[0].competitions[0];
        if (comp.competitors && comp.competitors.length > 0) {
             const linescores = comp.competitors[0].linescores;
             for (let period of linescores) {
                 if (period.linescores) {
                    // period is a round, linescores inside period are holes
                    let birdies = 0;
                    let eagles = 0;
                    let bogeys = 0;
                    let pars = 0;

                    for (let hole of period.linescores) {
                        if (hole.scoreType && hole.scoreType.displayValue) {
                           const val = hole.scoreType.displayValue;
                           if (val === '-1') birdies++;
                           else if (val === '-2') eagles++;
                           else if (val === 'E') pars++;
                           else if (val === '+1') bogeys++;
                           else console.log("Other hole score:", val);
                        }
                    }
                    console.log(`Round ${period.period}: ${birdies} birdies, ${eagles} eagles, ${pars} pars, ${bogeys} bogeys`);
                 }
             }
        }
    }
  } catch (e) {
    console.error("Error fetching scoreboard:", e.message);
  }
}
test();
