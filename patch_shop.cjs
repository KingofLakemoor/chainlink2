const fs = require('fs');

let shopData = JSON.parse(fs.readFileSync('shop_items.json', 'utf8'));

shopData.push({
    "id": "banner_genesis_syndicate",
    "name": "Genesis Syndicate",
    "description": "Before streaks, boosts, and polished UI, there was a black screen, a green glow, and a handful of players wiring picks into the dark.",
    "cost": 5000,
    "type": "PROFILE_BANNER",
    "active": true,
    "forSale": true,
    "image": "GenesisSyndicate",
    "featured": true,
    "preview": "GenesisSyndicate",
    "order": 50
});

shopData.push({
    "id": "title_v1_originator",
    "name": "V1 Originator",
    "description": "I was here before the algorithm had a UI.",
    "cost": 5000,
    "type": "TITLE",
    "active": true,
    "forSale": true,
    "image": "font-bold text-white border-[#00FF9C] shadow-[inset_0_2px_4px_rgba(0,0,0,0.4)]",
    "featured": true,
    "preview": "font-bold text-white border-[#00FF9C] shadow-[inset_0_2px_4px_rgba(0,0,0,0.4)]",
    "order": 51
});

shopData.push({
    "id": "title_chainlink_originator",
    "name": "Chainlink Originator",
    "description": "I was here before the algorithm had a UI.",
    "cost": 5000,
    "type": "TITLE",
    "active": true,
    "forSale": true,
    "image": "font-bold text-white border-[#00FF9C] shadow-[inset_0_2px_4px_rgba(0,0,0,0.4)]",
    "featured": false,
    "preview": "font-bold text-white border-[#00FF9C] shadow-[inset_0_2px_4px_rgba(0,0,0,0.4)]",
    "order": 52
});

shopData.push({
    "id": "title_originator_602",
    "name": "Originator — 602",
    "description": "I was here before the algorithm had a UI.",
    "cost": 5000,
    "type": "TITLE",
    "active": true,
    "forSale": true,
    "image": "font-bold text-white border-[#00FF9C] shadow-[inset_0_2px_4px_rgba(0,0,0,0.4)]",
    "featured": false,
    "preview": "font-bold text-white border-[#00FF9C] shadow-[inset_0_2px_4px_rgba(0,0,0,0.4)]",
    "order": 53
});

shopData.push({
    "id": "ring_prime_circuit",
    "name": "Prime Circuit Ring",
    "description": "A prestige ring that says 'I was here before the algorithm had a UI.'",
    "cost": 5000,
    "type": "AVATAR_RING",
    "active": true,
    "forSale": true,
    "image": "PrimeCircuitRing",
    "featured": true,
    "preview": "PrimeCircuitRing",
    "order": 54
});

fs.writeFileSync('shop_items.json', JSON.stringify(shopData, null, 2));
