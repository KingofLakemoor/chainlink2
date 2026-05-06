import * as fs from 'fs';
import { getScheduleEndpoints, scrapeLeagueSchedules } from './src/services/espnScraper';

const oldEndpoints = getScheduleEndpoints('PGA', false);
console.log('Old endpoint:', oldEndpoints);

async function main() {
  console.log("If PGA uses leaderboard endpoint, we could use teeTime");
}
main();
