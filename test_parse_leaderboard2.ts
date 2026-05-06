import { fetchScheduleData } from './src/services/espnScraper';

async function main() {
    const endpoint = 'https://site.api.espn.com/apis/site/v2/sports/golf/leaderboard?league=pga';
    const data = await fetchScheduleData(endpoint, 'PGA', false);
    const firstDate = Object.keys(data)[0];
    const comp = data[firstDate].games[0].competitions[0];
    const c = comp.competitors[0];
    console.log(c.linescores);
}

main();
