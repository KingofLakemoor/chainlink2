import { fetchScheduleData, getScheduleEndpoints } from './src/services/espnScraper';

async function main() {
    const endpoints = getScheduleEndpoints('PGA', false);
    console.log(endpoints);
}
main();
