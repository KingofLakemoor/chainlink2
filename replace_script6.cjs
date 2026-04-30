const fs = require('fs');
const path = require('path');

const filePath = path.join(__dirname, 'server.ts');
let content = fs.readFileSync(filePath, 'utf8');

const oldInterval = `const SYNC_INTERVAL = 10 * 60 * 1000; // 10 minutes`;
const newInterval = `const SYNC_INTERVAL = 2 * 60 * 1000; // 2 minutes`;

content = content.replace(oldInterval, newInterval);

fs.writeFileSync(filePath, content, 'utf8');
console.log('server.ts cron interval updated');
