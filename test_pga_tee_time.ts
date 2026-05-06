import { fetchScheduleData } from './src/services/espnScraper';
import * as fs from 'fs';

async function main() {
    const data = JSON.parse(fs.readFileSync('/tmp/pga_leaderboard.json', 'utf8'));
    const comp = data.events[0].competitions[0].competitors[0];
    console.log(comp.linescores);
}

main();
