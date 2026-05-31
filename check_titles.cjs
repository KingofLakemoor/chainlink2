const fs = require('fs');

let data = fs.readFileSync('shop_items.json', 'utf8');
let items = JSON.parse(data);

const titles = items.filter(item => item.type === 'TITLE' && !item.forSale && item.cost === 0 && item.id.startsWith('title_') && !item.id.includes('v1_originator') && !item.id.includes('originator_602'));
for (let title of titles) {
    console.log(`- ${title.id}: ${title.description}`);
}
