async function run() {
  const response = await fetch("https://site.api.espn.com/apis/site/v2/sports/cricket/21266/scoreboard");
  const data = await response.json();
  // Find a match that is in progress or final
  for (const event of data.events) {
      if (event.status.type.state === "in" || event.status.type.state === "post") {
          console.log(JSON.stringify(event.status, null, 2));
      }
  }
}
run();
