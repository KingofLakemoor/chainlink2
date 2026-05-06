import { scrapeLeagueSchedules } from './src/services/espnScraper';

async function main() {
    const data = await scrapeLeagueSchedules('PGA', false);
    console.log(data.data.slice(0, 3).map(x => ({title: x.title, startTime: new Date(x.startTime).toString(), cost: x.cost})));
}

main();
