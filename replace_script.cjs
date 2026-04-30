const fs = require('fs');
const path = require('path');

const filePath = path.join(__dirname, 'src/services/espnScraper.ts');
let content = fs.readFileSync(filePath, 'utf8');

const constants = `
export const MATCHUP_FINAL_STATUSES = [
  "STATUS_FINAL",
  "STATUS_FULL_TIME",
  "STATUS_FULL_PEN",
  "STATUS_FINAL_AET",
  "STATUS_FINAL_ET",
  "STATUS_FINAL_OT",
  "STATUS_FORFEIT",
];

export const MATCHUP_IN_PROGRESS_STATUSES = [
  "STATUS_IN_PROGRESS",
  "STATUS_FIRST_HALF",
  "STATUS_SECOND_HALF",
  "STATUS_HALFTIME",
  "STATUS_END_PERIOD",
  "STATUS_SHOOTOUT",
  "STATUS_END_OF_EXTRATIME",
  "STATUS_IN_PROGRESS_PEN",
  "STATUS_IN_PROGRESS_ET",
  "STATUS_OVERTIME",
  "STATUS_IN_PROGRESS_PEN_ET",
];

export const MATCHUP_DELAYED_STATUSES = [
  "STATUS_DELAYED",
  "STATUS_RAIN_DELAY",
  "STATUS_DELAY",
];

export const MATCHUP_POSTPONED_STATUSES = [
  "STATUS_POSTPONED",
  "STATUS_CANCELED",
  "STATUS_SUSPENDED",
  "STATUS_ABANDONDED",
];

export const MATCHUP_SCHEDULED_STATUSES = ["STATUS_SCHEDULED"];

export const MATCHUP_UNKNOWN_STATUSES = ["STATUS_UNKNOWN"];

`;

content = content.replace(
  `export type League = "NFL" | "NBA" | "MLB" | "NHL" | "PGA" | "COLLEGE-FOOTBALL" | "MBB" | "WBB" | "WNBA" | "MLS" | "EPL" | "NWSL";`,
  `export type League = "NFL" | "NBA" | "MLB" | "NHL" | "PGA" | "COLLEGE-FOOTBALL" | "MBB" | "WBB" | "WNBA" | "MLS" | "EPL" | "NWSL";\n` + constants
);

fs.writeFileSync(filePath, content, 'utf8');
console.log('Constants added to espnScraper.ts');
