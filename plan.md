1. **Understand Issue**: The bug is that we don't factor in `metadata?.spread` for "SPREAD" matchups when determining `winnerId` and `isTie` inside `src/services/grader.ts`.
2. **Current implementation**:
   ```javascript
   if (isPostponed) {
     isTie = true; // Treats postponed as a push to refund
   } else if (homeScore === awayScore) {
     isTie = true;
   } else if (lowerScoreWins) {
     winnerId = homeScore < awayScore ? matchup.homeTeam.id : matchup.awayTeam.id;
   } else {
     winnerId = homeScore > awayScore ? matchup.homeTeam.id : matchup.awayTeam.id;
   }
   ```
3. **Change to**:
   ```javascript
   let adjustedHomeScore = homeScore;
   if (matchup.type === 'SPREAD' && typeof matchup.metadata?.spread === 'number') {
     adjustedHomeScore += matchup.metadata.spread;
   }

   if (isPostponed) {
     isTie = true; // Treats postponed as a push to refund
   } else if (adjustedHomeScore === awayScore) {
     isTie = true;
   } else if (lowerScoreWins) {
     winnerId = adjustedHomeScore < awayScore ? matchup.homeTeam.id : matchup.awayTeam.id;
   } else {
     winnerId = adjustedHomeScore > awayScore ? matchup.homeTeam.id : matchup.awayTeam.id;
   }
   ```
4. **Where to make the change**:
   `src/services/grader.ts` handles the standard `picks`.

   Wait, does pick'em also use the same grader?
   No, pick'em picks (`pickemPicks`) are in a separate collection, but there doesn't seem to be a separate pickem grader yet (at least one that we found). We checked `functions.ts`, `server.ts` and `src/services` and there are no instances of `pickemPicks` grading. PickEm may be manually graded by admins, or not implemented yet. Let me double check if `src/services/grader.ts` also grades pickem picks. It queries `adminDb.collection('picks')`, not `pickemPicks`.

   Let me check if the PickEmAdminPage does manual grading or has a button to trigger grading for Pick Em.
