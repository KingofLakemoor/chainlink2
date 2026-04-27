const fs = require('fs');

let content = fs.readFileSync('src/App.tsx', 'utf8');

const updatedScoreDisplay = `                 <div className="flex items-center gap-2">
                    {isScheduled ? (
                      <div className="flex items-center justify-center gap-2 w-[140px]">
                        <div className="flex-1 flex justify-end">
                           <div className="w-12 h-1.5 bg-zinc-800 rounded-full overflow-hidden flex justify-end">
                             <div className="h-full bg-blue-500 rounded-full" style={{ width: \`\${awayHotPct}%\` }}></div>
                           </div>
                        </div>
                        <div className="flex-1 flex justify-start">
                           <div className="w-12 h-1.5 bg-zinc-800 rounded-full overflow-hidden">
                             <div className="h-full bg-blue-500 rounded-full" style={{ width: \`\${homeHotPct}%\` }}></div>
                           </div>
                        </div>
                      </div>
                    ) : (`;

content = content.replace(
  /                 <div className="flex items-center gap-2">\n                    \{isScheduled \? \([\s\S]*?                      <\/>\n                    \) : \(/,
  updatedScoreDisplay
);

fs.writeFileSync('src/App.tsx', content);
