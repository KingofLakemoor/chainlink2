async function run() {
  const response = await fetch("https://site.api.espn.com/apis/site/v2/sports/cricket/8039/scoreboard"); // T20 World Cup
  const data = await response.json();
  console.log(JSON.stringify(data.events[0], null, 2));
}
run();
