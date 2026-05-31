const fs = require('fs');

let data = fs.readFileSync('shop_items.json', 'utf8');
let items = JSON.parse(data);

items = items.map(item => {
    if (item.type === 'TITLE' && !item.forSale && item.cost === 0 && item.id.startsWith('title_') && !item.id.includes('v1_originator') && !item.id.includes('originator_602')) {
        // Look at the descriptions of earned titles and fix them if needed.
    }
    return item;
});
