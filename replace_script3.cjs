const fs = require('fs');
const path = require('path');

const filePath = path.join(__dirname, 'src/services/espnScraper.ts');
let content = fs.readFileSync(filePath, 'utf8');

const oldPgaBlock = `
              let finalStatus = competition.status?.type?.name || "STATUS_SCHEDULED";
              let finalStatusDesc = competition.status?.type?.shortDetail || "Upcoming";

              if (finalStatusDesc.toLowerCase().includes('final')) {
                finalStatus = "STATUS_FINAL";
              } else if (finalStatus === "STATUS_SCHEDULED" && (scoreA > 0 || scoreB > 0)) {
                finalStatus = "STATUS_IN_PROGRESS";

              } else if (finalStatus === "STATUS_SCHEDULED") {
                finalStatusDesc = "Upcoming";
              }
`;

const newPgaBlock = `
              let rawStatus = competition.status?.type?.name || "STATUS_SCHEDULED";
              let finalStatusDesc = competition.status?.type?.shortDetail || "Upcoming";
              let finalStatus = "STATUS_SCHEDULED";

              if (MATCHUP_FINAL_STATUSES.includes(rawStatus) || finalStatusDesc.toLowerCase().includes('final')) {
                finalStatus = "STATUS_FINAL";
              } else if (MATCHUP_IN_PROGRESS_STATUSES.includes(rawStatus) || (rawStatus === "STATUS_SCHEDULED" && (scoreA > 0 || scoreB > 0))) {
                finalStatus = "STATUS_IN_PROGRESS";
              } else if (MATCHUP_POSTPONED_STATUSES.includes(rawStatus)) {
                finalStatus = "STATUS_POSTPONED";
              } else if (MATCHUP_DELAYED_STATUSES.includes(rawStatus)) {
                finalStatus = "STATUS_DELAYED";
              } else {
                finalStatus = "STATUS_SCHEDULED";
                finalStatusDesc = "Upcoming";
              }
`;

content = content.replace(oldPgaBlock, newPgaBlock);

const oldOtherBlock = `
          let finalStatus = competition.status?.type?.name || "STATUS_SCHEDULED";
          let finalStatusDesc = competition.status?.type?.shortDetail || "Upcoming";

          if (finalStatusDesc.toLowerCase().includes('final')) {
              finalStatus = "STATUS_FINAL";
          } else if (finalStatus === "STATUS_SCHEDULED" && (homeScore > 0 || awayScore > 0)) {
              finalStatus = "STATUS_IN_PROGRESS";

          } else if (finalStatus === "STATUS_SCHEDULED") {
              finalStatusDesc = "Upcoming";
          }
`;

const newOtherBlock = `
          let rawStatus = competition.status?.type?.name || "STATUS_SCHEDULED";
          let finalStatusDesc = competition.status?.type?.shortDetail || "Upcoming";
          let finalStatus = "STATUS_SCHEDULED";

          if (MATCHUP_FINAL_STATUSES.includes(rawStatus) || finalStatusDesc.toLowerCase().includes('final')) {
              finalStatus = "STATUS_FINAL";
          } else if (MATCHUP_IN_PROGRESS_STATUSES.includes(rawStatus) || (rawStatus === "STATUS_SCHEDULED" && (homeScore > 0 || awayScore > 0))) {
              finalStatus = "STATUS_IN_PROGRESS";
          } else if (MATCHUP_POSTPONED_STATUSES.includes(rawStatus)) {
              finalStatus = "STATUS_POSTPONED";
          } else if (MATCHUP_DELAYED_STATUSES.includes(rawStatus)) {
              finalStatus = "STATUS_DELAYED";
          } else {
              finalStatus = "STATUS_SCHEDULED";
              finalStatusDesc = "Upcoming";
          }
`;

content = content.replace(oldOtherBlock, newOtherBlock);

fs.writeFileSync(filePath, content, 'utf8');
console.log('Status logic updated in espnScraper.ts');
