1. **Remove overriding of `statusDesc` to "In Progress"**
   - In `src/services/espnScraper.ts`, the code overrides `finalStatusDesc` to "In Progress" when a game becomes active. This throws away the valuable information like time remaining or current period (e.g., "Bot 6th", "3rd Qtr"). We should leave `finalStatusDesc` as it comes from the API (which is `competition.status?.type?.shortDetail`) unless it's strictly upcoming.
   - I have already run a `sed` command to remove `finalStatusDesc = "In Progress";` in `src/services/espnScraper.ts`.

2. **Update `syncLeagueSchedules` to properly sync `statusDesc`**
   - In `src/services/scheduleProcessor.ts`, the background task updates `status` but does not update `statusDesc`. We need to include `statusDesc` in the change check and `updateData` so the live updates flow to Firestore.
   - I have already modified `src/services/scheduleProcessor.ts` to include `statusDesc` in both the comparison logic and the updated object.

3. **Verify the change via tests/pre-commit**
   - Ensure the scraper and sync processor compile successfully.
   - Run the pre-commit steps and test verification.

4. **Submit changes**
   - Commit and push to the codebase.
