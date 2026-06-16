import fs from 'fs';

let content = fs.readFileSync('src/pages/mypicks/MyPicksPage.tsx', 'utf8');

const oldStatusColor = `            } else if (pick.status === 'PENDING') {
              statusColorClass = 'bg-blue-950/20 border-blue-900/50';
              statusTextColor = 'text-blue-400';
              statusText = 'In Progress';
            }`;

const newStatusColor = `            } else if (pick.status === 'PENDING') {
              statusColorClass = 'bg-blue-950/20 border-blue-900/50';
              statusTextColor = 'text-blue-400';
              statusText = 'In Progress';
            } else if (pick.status === 'QUEUED') {
              statusColorClass = 'bg-cyan-950/20 border-cyan-900/50';
              statusTextColor = 'text-cyan-400';
              statusText = 'Queued';
            }`;

content = content.replace(oldStatusColor, newStatusColor);
fs.writeFileSync('src/pages/mypicks/MyPicksPage.tsx', content);
