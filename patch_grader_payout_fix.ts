import fs from 'fs';

let content = fs.readFileSync('src/services/link4Grader.ts', 'utf8');

const oldScoreCode = `             const matchupDoc = await transaction.get(adminDb.collection('matchups').doc(pick.id.replace('pick-', '')));
             if (matchupDoc.exists) {
               const matchup = matchupDoc.data();
               const pickedHome = pick.name === matchup.homeTeam?.name;
               const ml = pickedHome ? matchup.metadata?.mlHome : matchup.metadata?.mlAway;
               if (ml !== undefined && ml !== null) {
                  score += ml;
               }
             }`;

const newScoreCode = `             const matchupSnaps = await transaction.get(adminDb.collection('matchups').where('gameId', '==', pick.id.replace('pick-', '')).limit(1));
             if (!matchupSnaps.empty) {
               const matchup = matchupSnaps.docs[0].data();
               const pickedHome = pick.name === matchup.homeTeam?.name;
               const ml = pickedHome ? matchup.metadata?.mlHome : matchup.metadata?.mlAway;
               if (ml !== undefined && ml !== null) {
                  score += ml;
               }
             }`;

content = content.replace(oldScoreCode, newScoreCode);

fs.writeFileSync('src/services/link4Grader.ts', content, 'utf8');
