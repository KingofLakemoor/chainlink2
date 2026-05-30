const fs = require('fs');

const data = JSON.parse(fs.readFileSync('shop_items.json', 'utf8'));

// Update collection ID for banner
const banner = data.find(item => item.id === 'banner_zero_zero_zero');
if (banner) {
  banner.collectionId = 'zero_zero';
}

// Check if ring exists
if (!data.find(item => item.id === 'ring_zero_zero_zero')) {
  // Find order for rings to place at end of rings
  const rings = data.filter(item => item.type === 'AVATAR_RING');
  const maxRingOrder = Math.max(...rings.map(r => r.order));

  data.splice(rings.length, 0, {
    id: "ring_zero_zero_zero",
    name: "The 0:00 Ring",
    description: "Arena blackout halo + LED pulse + buzzer flash.",
    cost: 4500,
    type: "AVATAR_RING",
    active: true,
    forSale: true,
    image: "ZeroZeroAvatarRing",
    featured: true,
    preview: "ZeroZeroAvatarRing",
    order: maxRingOrder + 1,
    collectionId: "zero_zero"
  });
}

// Check if title exists
if (!data.find(item => item.id === 'title_zero_zero_zero')) {
  const titles = data.filter(item => item.type === 'TITLE');
  const maxTitleOrder = Math.max(...titles.map(t => t.order));

  data.push({
    id: "title_zero_zero_zero",
    name: "The 0:00",
    description: "Digital LED. Glitching. Frozen in time.",
    cost: 4500,
    type: "TITLE",
    active: true,
    forSale: true,
    image: "ZeroZeroTitle",
    featured: true,
    preview: "ZeroZeroTitle",
    order: maxTitleOrder + 1,
    collectionId: "zero_zero"
  });
}

fs.writeFileSync('shop_items.json', JSON.stringify(data, null, 2) + '\n');
console.log('Done patching shop_items.json');
