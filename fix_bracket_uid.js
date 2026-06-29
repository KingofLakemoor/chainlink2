const fs = require('fs');
let content = fs.readFileSync('src/pages/brackets/BracketsPage.tsx', 'utf8');

const search = `          participantStats[data.userId] = { points: pts, potentialPoints: pot, uid: data.userId };`;
const replace = `          const uid = data.userId || d.id.split('_')[1];
          if (uid) {
            participantStats[uid] = { points: pts, potentialPoints: pot, uid };
          }`;

if (content.includes(search)) {
  content = content.replace(search, replace);
  fs.writeFileSync('src/pages/brackets/BracketsPage.tsx', content);
  console.log('Fixed BracketsPage.tsx');
} else {
  console.log('Not found in BracketsPage.tsx');
}

let content2 = fs.readFileSync('src/services/bracketGrader.ts', 'utf8');
const search2 = `      scores.push({ uid: data.userId, score: pts });`;
const replace2 = `      const uid = data.userId || doc.id.split('_')[1];
      if (uid) {
        scores.push({ uid, score: pts });
      }`;

if (content2.includes(search2)) {
    content2 = content2.replace(search2, replace2);
    fs.writeFileSync('src/services/bracketGrader.ts', content2);
    console.log('Fixed bracketGrader.ts');
} else {
    console.log('Not found in bracketGrader.ts');
}
