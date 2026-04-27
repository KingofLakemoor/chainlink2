const fs = require('fs');

let content = fs.readFileSync('src/App.tsx', 'utf8');

const footerReplacement = `               <button className="text-xs text-zinc-400 hover:text-zinc-200 transition-colors flex items-center gap-1">
                 <span className="text-[10px]">↓</span> Share Matchup
               </button>

               <div className="flex flex-col items-center">
                 {m.cost > 0 && (
                   <span className="text-xs text-zinc-400 flex items-center gap-1 font-medium">
                     Wager: <Link2 className="w-3.5 h-3.5 text-cyan-400 ml-0.5" /> <span className="text-cyan-400 font-mono tracking-wide">{m.cost}</span>
                   </span>
                 )}
                 <span className="text-xs text-zinc-400 flex items-center gap-1 font-medium">
                   Reward: <Link2 className="w-3.5 h-3.5 text-cyan-400 ml-0.5" /> <span className="text-cyan-400 font-mono tracking-wide">{m.cost > 0 ? m.cost * 2 : (m.reward || 10)}</span>
                 </span>
               </div>`;

content = content.replace(
  /               <button className="text-xs text-zinc-400 hover:text-zinc-200 transition-colors flex items-center gap-1">\n                 <span className="text-\[10px\]">↓<\/span> Share Matchup\n               <\/button>\n\n               <span className="text-xs text-zinc-400 flex items-center gap-1 font-medium">\n                 Reward: <Link2 className="w-3\.5 h-3\.5 text-cyan-400 ml-0\.5" \/> <span className="text-cyan-400 font-mono tracking-wide">\{m\.cost\}<\/span>\n               <\/span>/,
  footerReplacement
);

fs.writeFileSync('src/App.tsx', content);
