async function run() {
  const response = await fetch("https://site.api.espn.com/apis/site/v2/sports/cricket/8039/scoreboard");
  const data = await response.json();
  const event = data.events[0];

  const competition = event.competitions[0];
  const awayLinescores = competition.competitors[1].linescores;
  const homeLinescores = competition.competitors[0].linescores;

  const currentPeriod = event.status.period;

  let overs = undefined;

  const homeLs = homeLinescores.find(ls => ls.period === currentPeriod);
  const awayLs = awayLinescores.find(ls => ls.period === currentPeriod);

  if (homeLs && homeLs.isBatting) {
      overs = homeLs.overs;
  } else if (awayLs && awayLs.isBatting) {
      overs = awayLs.overs;
  }

  console.log("Current Period:", currentPeriod);
  console.log("Overs in current period:", overs);
}
run();
