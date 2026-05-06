import { fetchScheduleData, getScheduleEndpoints, scrapeLeagueSchedules } from './src/services/espnScraper';

async function main() {
    const data = await scrapeLeagueSchedules('PGA', false);
    console.log(data.data.slice(0, 5));
}
main();
