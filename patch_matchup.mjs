import fs from 'fs';

let content = fs.readFileSync('src/components/ui/MatchupCard.tsx', 'utf8');

content = content.replace(
  '  onCancelPick: (matchup: any) => void;',
  '  onCancelPick: (matchup: any) => void;\n  onForfeitPick?: (matchup: any) => void;'
);

content = content.replace(
  '  onCancelPick,',
  '  onCancelPick,\n  onForfeitPick,'
);

// We want to add a Forfeit button right where it currently has Locked.
const replaceBlock = `                isScheduled || (m.league === 'PGA' && m.status === 'STATUS_IN_PROGRESS' && (m.statusDesc === 'In Progress' || m.statusDesc === 'Delayed')) ? (
                  <button onClick={() => onCancelPick(m)} className="text-xs font-bold text-red-500 uppercase tracking-wide flex items-center gap-1 hover:text-red-400">
                     <X className="w-3 h-3" /> Cancel
                  </button>
                ) : (
                  <span className="text-xs font-bold text-red-500 uppercase tracking-wide">Locked</span>
                )`;

const newBlock = `                isScheduled || (m.league === 'PGA' && m.status === 'STATUS_IN_PROGRESS' && (m.statusDesc === 'In Progress' || m.statusDesc === 'Delayed')) ? (
                  <button onClick={() => onCancelPick(m)} className="text-xs font-bold text-red-500 uppercase tracking-wide flex items-center gap-1 hover:text-red-400">
                     <X className="w-3 h-3" /> Cancel
                  </button>
                ) : profile?.premium && onForfeitPick && m.status !== 'STATUS_FINAL' && m.status !== 'STATUS_CANCELED' && m.status !== 'STATUS_POSTPONED' && !m.statusDesc?.toLowerCase().includes('final') ? (
                  <button onClick={() => onForfeitPick(m)} className="text-xs font-bold text-orange-500 uppercase tracking-wide flex items-center gap-1 hover:text-orange-400">
                     <X className="w-3 h-3" /> Forfeit
                  </button>
                ) : (
                  <span className="text-xs font-bold text-red-500 uppercase tracking-wide">Locked</span>
                )`;

content = content.replace(replaceBlock, newBlock);

fs.writeFileSync('src/components/ui/MatchupCard.tsx', content, 'utf8');
