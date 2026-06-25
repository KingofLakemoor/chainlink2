const fs = require('fs');

let content = fs.readFileSync('src/pages/link4/Link4Page.tsx', 'utf8');

content = content.replace(
  `                      {(isWin || processedStatus === 'PENDING') && pickScore !== undefined && pickScore !== null && (
                        <div className={\`mt-2 font-bold \${isWin ? 'text-green-500' : 'text-zinc-500'}\`}>
                          {pickScore > 0 ? \`+\${pickScore}\` : pickScore}
                        </div>
                      )}
                      {isLoss && (
                        <div className="mt-2 text-red-500 font-bold uppercase">Loss</div>
                      )}`,
  `                      {(isWin || processedStatus === 'PENDING' || isLoss) && pickScore !== undefined && pickScore !== null && (
                        <div className={\`mt-2 font-bold \${isWin ? 'text-green-500' : isLoss ? 'text-red-500 line-through' : 'text-zinc-500'}\`}>
                          {pickScore > 0 ? \`+\${pickScore}\` : pickScore}
                        </div>
                      )}
                      {isLoss && (
                        <div className="mt-1 text-red-500 font-bold uppercase text-sm">Loss</div>
                      )}`
);

fs.writeFileSync('src/pages/link4/Link4Page.tsx', content);
console.log('Patched Link4Page UI rendering of scores');
