const fs = require('fs');

let content = fs.readFileSync('src/pages/link4/Link4Page.tsx', 'utf8');

content = content.replace(
  `              const processedStatus = processedPick?.status || 'PENDING';
              const pickScore = processedPick?.score || 0;`,
  `              const processedStatus = processedPick?.status || 'PENDING';
              let pickScore = processedPick?.score;
              if (pickScore === undefined || pickScore === 0) {
                 pickScore = pick.score;
              }
              pickScore = pickScore || 0;`
);

fs.writeFileSync('src/pages/link4/Link4Page.tsx', content);
console.log('Patched local pickScore in Link4Page.tsx');
