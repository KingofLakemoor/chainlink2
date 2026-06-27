import * as firebaseAdmin from '../lib/firebase-admin.js';

let getAdminDb = () => firebaseAdmin.adminDb;
export function setAdminDbMock(mock: any) { getAdminDb = () => mock; }

export async function gradeBrackets(matchups: any[]) {
  const adminDb = getAdminDb();
  if (!adminDb || matchups.length === 0) return;

  const finalMatchups = matchups.filter(m => m.status === 'STATUS_FINAL');
  if (finalMatchups.length === 0) return;

  const bracketsSnap = await adminDb.collection('brackets').get();
  if (bracketsSnap.empty) return;

  for (const bracketDoc of bracketsSnap.docs) {
    const bracket = bracketDoc.data();
    let updated = false;
    const results = bracket.results || {};
    const eliminatedTeams = bracket.eliminatedTeams || [];

    for (const matchup of finalMatchups) {
      if (bracket.sport === 'World Cup 2026' && matchup.league !== 'FIFA') continue;

      const homeTeam = matchup.homeTeam?.name;
      const awayTeam = matchup.awayTeam?.name;

      const homeScore = Number(matchup.homeTeam?.score || 0);
      const awayScore = Number(matchup.awayTeam?.score || 0);

      let winner = null;
      let loser = null;

      if (homeScore > awayScore) {
          winner = homeTeam;
          loser = awayTeam;
      } else if (awayScore > homeScore) {
          winner = awayTeam;
          loser = homeTeam;
      }

      if (winner && loser) {
         if (!eliminatedTeams.includes(loser)) {
             eliminatedTeams.push(loser);
             updated = true;
         }

         const rounds = [bracket.teams || []];
         let r = 0;
         let matchFound = false;

         while (r < 5) {
             const currentRoundTeams = rounds[r];
             if (!currentRoundTeams || currentRoundTeams.length === 0) break;

             const nextRoundTeams = new Array(currentRoundTeams.length / 2).fill(null);

             for (let i = 0; i < currentRoundTeams.length / 2; i++) {
                 const t1 = currentRoundTeams[i * 2];
                 const t2 = currentRoundTeams[i * 2 + 1];

                 const mId = `r${r}-m${i}`;

                 if (t1 && t2 && ((t1 === winner && t2 === loser) || (t1 === loser && t2 === winner))) {
                     if (results[mId] !== winner) {
                         results[mId] = winner;
                         updated = true;
                     }
                     matchFound = true;
                 }

                 if (results[mId]) {
                     nextRoundTeams[i] = results[mId];
                 }
             }

             rounds.push(nextRoundTeams);
             r++;
             if (matchFound) break;
         }
      }
    }

    if (updated) {
        await adminDb.collection('brackets').doc(bracketDoc.id).update({
            results,
            eliminatedTeams
        });
    }
  }
}
