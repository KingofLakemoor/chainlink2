import fs from 'fs';

let content = fs.readFileSync('src/pages/link4/Link4Page.tsx', 'utf8');

const badHtml = `<p className="text-zinc-400 text-lg">
            <p className="text-zinc-400 text-lg">
            Connect four to win! Play Link4 and earn links. Entry: {segmentCost} links.`;

const fixedHtml = `<p className="text-zinc-400 text-lg">
            Connect four to win! Play Link4 and earn links. Entry: {segmentCost} links.`;

content = content.replace(badHtml, fixedHtml);

fs.writeFileSync('src/pages/link4/Link4Page.tsx', content, 'utf8');
