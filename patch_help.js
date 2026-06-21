import fs from 'fs';

const content = fs.readFileSync('src/pages/help/HelpPage.tsx', 'utf8');

let updatedContent = content.replace(
  '<li><strong>Daily Links:</strong> Receive 10 bonus Links every single day.</li>',
  '<li><strong>Daily Links:</strong> Claim 10 bonus Links every single day in the Shop.</li>'
);

updatedContent = updatedContent.replace(
  'logging in daily',
  'claiming your daily Pro links in the Shop'
);

fs.writeFileSync('src/pages/help/HelpPage.tsx', updatedContent);
console.log("Patched src/pages/help/HelpPage.tsx");
