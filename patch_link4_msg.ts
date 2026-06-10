import fs from 'fs';

let content = fs.readFileSync('src/pages/link4/Link4Page.tsx', 'utf8');

const msgHtml = `
          {savedPicksCount > 0 && savedPicksCount < 4 && !hasLoss && unsavedPicksCount === 0 && (
            <div className="mt-8 p-4 bg-blue-500/10 border border-blue-500/30 rounded-xl text-center">
              <h3 className="text-lg font-bold text-white mb-2">Picks Saved!</h3>
              <p className="text-blue-400">You can make the rest of your picks now, or come back any time before the segment ends.</p>
            </div>
          )}

          {unsavedPicksCount > 0 && !hasLoss && (`;

content = content.replace(/          \{unsavedPicksCount > 0 && !hasLoss && \(/m, msgHtml);

fs.writeFileSync('src/pages/link4/Link4Page.tsx', content, 'utf8');
