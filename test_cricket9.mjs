async function run() {
  const response = await fetch("https://site.api.espn.com/apis/site/v2/sports/cricket/8039/scoreboard?dates=20240608");
  const data = await response.json();
  console.log(data.events[0].competitions[0].competitors[0].linescores);
}
run();
