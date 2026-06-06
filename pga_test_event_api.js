async function test() {
  // Try to find the event ID from earlier
  const url = 'http://site.api.espn.com/apis/site/v2/sports/golf/pga/scoreboard';
  const response = await fetch(url);
  const data = await response.json();
  const eventId = data.events[0].id;

  // Try to query the event endpoint specifically
  const eventUrl = `http://site.api.espn.com/apis/site/v2/sports/golf/pga/summary?event=${eventId}`;
  const evtResponse = await fetch(eventUrl);
  const evtData = await evtResponse.json();
  console.log("Summary keys:", Object.keys(evtData));

  if (evtData.tournaments) {
     console.log("Tournaments", evtData.tournaments.length);
  }
}
test();
