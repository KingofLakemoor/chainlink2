async function run() {
  const url = "https://site.api.espn.com/apis/site/v2/sports/cricket/21266/scoreboard";
  const res = await fetch(url);
  const data = await res.json();

  const competitors = data.events?.[0]?.competitions?.[0]?.competitors;
  if (!competitors) { console.log("No competitors found"); return; }

  for (const competitor of competitors) {
    console.log(competitor.team.name);
    console.log(JSON.stringify(competitor.linescores, null, 2));
  }
}

run();
