async function run() {
  const response = await fetch("https://site.api.espn.com/apis/site/v2/sports/cricket/8039/scoreboard");
  const data = await response.json();
  const event = data.events[0];
  if (event.competitions[0].competitors[0].linescores && event.competitions[0].competitors[0].linescores.length > 0) {
      console.log(event.competitions[0].competitors[0].linescores.map(ls => `${ls.overs}`));
  }
}
run();
