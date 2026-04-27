const fs = require('fs');

let content = fs.readFileSync('src/App.tsx', 'utf8');

// Use useMemo to compute matchup pick counts
let calculation = `
  const { totalUpcomingPicks, matchupPickCounts } = React.useMemo(() => {
    let total = 0;
    const counts: Record<string, { total: number, away: number, home: number }> = {};

    globalUpcomingPicks.forEach(p => {
      if (!counts[p.matchupId]) {
        counts[p.matchupId] = { total: 0, away: 0, home: 0 };
      }
      counts[p.matchupId].total += 1;

      const matchup = allFetchedMatchups.find(m => m.id === p.matchupId);
      if (matchup && matchup.status === 'STATUS_SCHEDULED') {
         total += 1;
      }

      if (matchup && p.pick?.id === matchup.awayTeam?.id) {
        counts[p.matchupId].away += 1;
      } else if (matchup && p.pick?.id === matchup.homeTeam?.id) {
        counts[p.matchupId].home += 1;
      }
    });

    return { totalUpcomingPicks: total, matchupPickCounts: counts };
  }, [globalUpcomingPicks, allFetchedMatchups]);

  useEffect(() => {
`;

content = content.replace(
  /  useEffect\(\(\) => \{\n    const now = Date\.now\(\);/,
  calculation + "    const now = Date.now();"
);

fs.writeFileSync('src/App.tsx', content);
