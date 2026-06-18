1. **Fix `espnScraper.ts` timezone bug for schedule endpoints**:
   - The current code uses `Date.toISOString().split('T')[0]` to determine "today" for schedule endpoints.
   - Because `toISOString()` returns UTC time, after 8:00 PM EST (or 4:00 PM PST) it rolls over to the next day.
   - When the scraper fetches the "scoreboardOnly" schedule endpoints with `dates=20260618` (tomorrow) but today is locally `20260617`, it gets tomorrow's schedule and misses today's active games.
   - To fix this, change the `formatDate` helper in `getScheduleEndpoints` to output the date in the "America/New_York" timezone instead of UTC.
2. **Fix `espnScraper.ts` in-progress status logic**:
   - The `fetchScheduleData` parses the game status from ESPN's API correctly for most leagues, but for `SCORE` based endpoints (like MLB) it was missing a condition to identify `IN_PROGRESS` statuses if `hasLinescores` was not immediately populated.
   - Adding `competition.status?.type?.state === 'in'` and ensuring `competition.status?.period > 0` are evaluated makes the scraper properly flag MLB games in progress.
3. **Pre-commit checks**:
   - Complete pre-commit steps to ensure proper testing, verification, review, and reflection are done.
4. **Submit changes**.
