async function run() {
  const response = await fetch("https://site.api.espn.com/apis/site/v2/sports/cricket/8039/scoreboard");
  const data = await response.json();
  const event = data.events[0];
  console.log("Period is:", event.status.period);
  console.log(JSON.stringify(event.competitions[0].competitors[1].linescores, null, 2));
}
run();
