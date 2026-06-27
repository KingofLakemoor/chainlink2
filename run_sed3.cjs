const fs = require('fs');

const path = 'src/pages/brackets/BracketsPage.tsx';
let content = fs.readFileSync(path, 'utf8');

const oldLogic = `        const participantStats: Record<string, { points: number, uid: string }> = {};

        pSnap.docs.forEach(d => {
          const data = d.data();
          participantStats[data.userId] = { points: 0, uid: data.userId };
        });`;

const newLogic = `        const participantStats: Record<string, { points: number, potentialPoints: number, uid: string }> = {};

        const pointsMap: Record<string, number> = {
          "0": bracket.pointValues?.["Round of 32"] || 10,
          "1": bracket.pointValues?.["Round of 16"] || 20,
          "2": bracket.pointValues?.["Quarter Finals"] || 40,
          "3": bracket.pointValues?.["Semi Finals"] || 80,
          "4": bracket.pointValues?.["Finals"] || 160
        };

        const results = bracket.results || {};
        const explicitlyEliminated = bracket.eliminatedTeams || [];

        pSnap.docs.forEach(d => {
          const data = d.data();
          let pts = 0;
          let pot = 0;
          const sels = data.selections || {};
          for (const [mId, pickedTeam] of Object.entries(sels)) {
             const round = mId.split('-')[0].replace('r', '');
             const rPts = pointsMap[round] || 0;
             if (results[mId] === pickedTeam) {
                pts += rPts;
                pot += rPts;
             } else if (results[mId] && results[mId] !== pickedTeam) {
                // picked wrong, no points, no potential
             } else if (!results[mId] && !explicitlyEliminated.includes(pickedTeam)) {
                // still alive
                pot += rPts;
             }
          }
          participantStats[data.userId] = { points: pts, potentialPoints: pot, uid: data.userId };
        });`;

content = content.replace(oldLogic, newLogic);
fs.writeFileSync(path, content, 'utf8');
