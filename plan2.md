When grading standard matchups in `syncLeagueSchedules`, we can also trigger `gradePickemMatchups` for any PickEm matchups corresponding to the standard matchups that have concluded.

Steps:
1. Import `gradePickemMatchups` from `./pickemGrader.js`.
2. Find PickEm matchups corresponding to the graded regular matchups using `gameId`. Wait, we have the `matchupsToGrade` list, which contains standard matchups.
3. We need to query `pickemMatchups` where `gameId` is in the `matchupsToGrade` list.
   However, `where('gameId', 'in', ...)` limits to 10 at a time.
   Instead of just grading pickem matchups, we also need to sync their final scores, right? Yes, because `scheduleProcessor` only syncs `matchups` directly. `PickEmCampaignDetail` shows that `pickemMatchups` have the same `gameId`. We could sync their scores and statuses in `scheduleProcessor.ts`!

Actually, a simpler approach:
Loop over `matchupsToGrade`. For each standard matchup:
```ts
const pickemSnaps = await adminDb.collection('pickemMatchups').where('gameId', '==', matchup.gameId).get();
for (const doc of pickemSnaps.docs) {
    await doc.ref.update({
        status: matchup.status,
        statusDesc: matchup.statusDesc,
        homeTeam: matchup.homeTeam,
        awayTeam: matchup.awayTeam,
        updatedAt: Date.now()
    });
    pickemMatchupsToGrade.push({ ...doc.data(), ...matchup, id: doc.id });
}
```
Then call `await gradePickemMatchups(pickemMatchupsToGrade);`
