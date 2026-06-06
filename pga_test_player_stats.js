async function test() {
  const url = 'https://site.api.espn.com/apis/site/v2/sports/golf/leaderboard?league=pga';
  const response = await fetch(url);
  const data = await response.json();

  if (data.events && data.events.length > 0) {
    const event = data.events[0];
    const playerStatsObj = event.hasPlayerStats;
    console.log("hasPlayerStats:", playerStatsObj);

    // Check if there are other endpoints for PGA stats
    console.log("Event links:", JSON.stringify(event.links, null, 2));

    // Let's check a player's link
    const comp = event.competitions[0];
    if (comp && comp.competitors && comp.competitors.length > 0) {
        console.log("Player links:", JSON.stringify(comp.competitors[0].athlete.links, null, 2));
    }
  }
}
test();
