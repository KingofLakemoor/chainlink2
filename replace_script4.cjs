const fs = require('fs');
const path = require('path');

const filePath = path.join(__dirname, 'src/services/scheduleProcessor.ts');
let content = fs.readFileSync(filePath, 'utf8');

const oldGradingCondition = `            if (scrapedMatchup.status === 'STATUS_FINAL' && existingData.status !== 'STATUS_FINAL') {
              matchupsToGrade.push({ ...existingData, ...updateData, gameId: scrapedMatchup.gameId, id: gameId });
            }`;

const newGradingCondition = `            if ((scrapedMatchup.status === 'STATUS_FINAL' && existingData.status !== 'STATUS_FINAL') ||
                (scrapedMatchup.status === 'STATUS_POSTPONED' && existingData.status !== 'STATUS_POSTPONED')) {
              matchupsToGrade.push({ ...existingData, ...updateData, gameId: scrapedMatchup.gameId, id: gameId });
            }`;

content = content.replace(oldGradingCondition, newGradingCondition);

fs.writeFileSync(filePath, content, 'utf8');
console.log('scheduleProcessor.ts updated');
