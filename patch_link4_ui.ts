import fs from 'fs';

let content = fs.readFileSync('src/pages/link4/Link4Page.tsx', 'utf8');

const importReplacement = `import React, { useState, useEffect } from 'react';
import { Grid, Clock, Trophy, Lock, X } from 'lucide-react';`;

content = content.replace(/import React, { useState, useEffect } from 'react';\nimport { Grid, Clock, Trophy, Lock } from 'lucide-react';/m, importReplacement);

const htmlReplacement = `            {leaderboardData.map((entry, index) => (
              <div key={entry.userId} className={\`flex flex-col sm:flex-row items-center gap-4 p-4 rounded-xl border \${entry.hasLoss ? 'bg-[#121212] border-zinc-900 opacity-50 grayscale' : 'bg-[#121212] border-zinc-800'}\`}>

                {/* Rank & User Info */}
                <div className="flex items-center gap-4 min-w-[200px] w-full sm:w-auto">
                  <div className="text-xl font-black text-zinc-500 w-8 text-center">#{index + 1}</div>
                  <div className="w-10 h-10 rounded-full bg-zinc-800 border-2 border-zinc-700 overflow-hidden shrink-0 relative">
                    <img src={entry.avatarUrl} alt={entry.username} className="w-full h-full object-cover" loading="lazy" />
                    {entry.hasLoss && (
                      <div className="absolute inset-0 bg-red-900/50 flex items-center justify-center backdrop-blur-[1px]">
                        <X className="w-8 h-8 text-red-500" strokeWidth={3} />
                      </div>
                    )}
                  </div>`;

content = content.replace(/            \{leaderboardData\.map\(\(entry, index\) => \(\n              <div key=\{entry\.userId\} className="flex flex-col sm:flex-row items-center gap-4 p-4 rounded-xl bg-\[#121212\] border border-zinc-800">\n\n                \{\/\* Rank & User Info \*\/}\n                <div className="flex items-center gap-4 min-w-\[200px\] w-full sm:w-auto">\n                  <div className="text-xl font-black text-zinc-500 w-8 text-center">#\{index \+ 1\}<\/div>\n                  <div className="w-10 h-10 rounded-full bg-zinc-800 border-2 border-zinc-700 overflow-hidden shrink-0">\n                    <img src=\{entry\.avatarUrl\} alt=\{entry\.username\} className="w-full h-full object-cover" loading="lazy" \/>\n                  <\/div>/m, htmlReplacement);

fs.writeFileSync('src/pages/link4/Link4Page.tsx', content, 'utf8');
