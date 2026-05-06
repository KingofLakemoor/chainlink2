import * as fs from 'fs';

async function main() {
    const data = JSON.parse(fs.readFileSync('/tmp/pga_leaderboard.json', 'utf8'));
    const comp = data.events[0].competitions[0];
    const getTeeTime = (c: any, period: number) => {
       const ls = c.linescores?.find((ls: any) => ls.period === period);
       if (ls?.teeTime) {
           return new Date(ls.teeTime).getTime();
       }
       if (ls?.statistics?.categories?.[0]?.stats) {
           for (const stat of ls.statistics.categories[0].stats) {
               if (stat.displayValue && typeof stat.displayValue === 'string') {
                   const match = stat.displayValue.match(/[A-Z][a-z]{2} [A-Z][a-z]{2} \d{1,2}/);
                   if (match) {
                       let dateStr = stat.displayValue;
                       if (!/\d{4}/.test(dateStr)) {
                           const year = new Date().getFullYear();
                           dateStr = dateStr.replace(match[0], `${match[0]} ${year}`);
                       }
                       const parsed = new Date(dateStr).getTime();
                       if (!isNaN(parsed)) return parsed;
                   }
               }
           }
       }
       return null;
    };
    const c = comp.competitors[0];
    console.log(getTeeTime(c, 1));
}

main();
