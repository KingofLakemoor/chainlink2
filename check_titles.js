const fs = require('fs');

let data = fs.readFileSync('shop_items.json', 'utf8');
let items = JSON.parse(data);

const earnedTitles = items.filter(item => item.type === 'TITLE' && !item.forSale && item.cost === 0);

console.log('Got ' + earnedTitles.length + ' titles');
