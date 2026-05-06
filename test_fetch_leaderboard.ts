import { fetchScheduleData } from './src/services/espnScraper';

async function main() {
    const endpoint = 'https://site.api.espn.com/apis/site/v2/sports/golf/leaderboard?league=pga';
    const data = await fetchScheduleData(endpoint, 'PGA', false);
    console.log(Object.keys(data));
    const firstDate = Object.keys(data)[0];
    console.log(data[firstDate].games[0].id);
    const comp = data[firstDate].games[0].competitions[0];
    console.log('competitors length:', comp.competitors.length);
    console.log('first competitor linescores:', comp.competitors[0].linescores);
}

main();
