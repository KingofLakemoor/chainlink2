async function test() {
  const url = 'https://site.api.espn.com/apis/site/v2/sports/golf/leaderboard?league=pga';
  const response = await fetch(url);
  const data = await response.json();

  if (data.events && data.events.length > 0) {
    const event = data.events[0];

    // Check what other info is available in the payload
    const keysToCheck = Object.keys(data).filter(k => k !== 'events');
    console.log("Root keys (excluding events):", keysToCheck);

    if (data.events[0].competitions[0].competitors[0].linescores) {
      console.log("Linescores object:", JSON.stringify(data.events[0].competitions[0].competitors[0].linescores, null, 2));
    }
  }
}
test();
