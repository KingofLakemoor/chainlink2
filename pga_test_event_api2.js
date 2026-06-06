async function test() {
  const eventUrl = `http://site.api.espn.com/apis/site/v2/sports/golf/pga/events/401811950`;
  try {
     const evtResponse = await fetch(eventUrl);
     const evtData = await evtResponse.json();
     console.log("Event details keys:", Object.keys(evtData));
  } catch(e) {
      console.log("Not found")
  }
}
test();
