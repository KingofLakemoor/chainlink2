1. **Create the PGA Matchups Builder Component (`src/pages/admin/pga/PGABuilderPage.tsx`)**
    - Needs a UI for fetching the current PGA leaderboard (calling the `PGA` ESPN API endpoint directly or via a new backend helper).
    - Allow selecting Golfer A and Golfer B from the leaderboard.
    - Matchup types: "Tournament Finish" (who places higher overall, lower score wins) or "Round Score" (lower score wins).
    - Save this customized matchup to the database with appropriate metadata (`metadata: { golf: true, lowerScoreWins: true, pgaBuilder: true, ... }`).
2. **Add the PGA Builder route in `AdminDashboard.tsx`**
    - Add a link in the Admin sidebar for "PGA Builder".
    - Add the route `/admin/pga-builder` pointing to `PGABuilderPage`.
3. **Update `espnScraper.ts` for PGA**
    - Refactor the automated matchup generation for PGA. We can either remove the automatic generation completely and rely only on the builder, OR we keep the automated generation as an option but flag it somehow. Since the user wants a builder, it might be better to *only* update existing PGA matchups (like those created by the builder) with their scores, rather than auto-creating random pairs. Let's update `espnScraper.ts` to update golfers' scores based on their ESPN IDs, rather than auto-generating pairs. Wait, the user said: "Instead of using it to create matchups, we just use it to fetch the leaderboard?league=pga endpoint to populate a dropdown list of golfers in your Builder. Hybrid Grading: Once you manually pair Golfer A and Golfer B, we can still use the automated background scraper to update their scores and auto-grade the matchup when the round/tournament ends".
    - Thus, in `espnScraper.ts`, if `league === "PGA"`, we should *stop* auto-creating matchups. Instead, we just fetch the leaderboard and maybe return it as raw data if called from the frontend builder, OR we iterate through *existing* PGA matchups in our DB, find those golfers in the leaderboard payload, update their scores, and return those updated matchups to be synced.
    - Actually, the easiest way is: when `scrapeLeagueSchedules` runs for PGA, it should fetch all existing PGA matchups from the DB that are active/not final. Then it uses the `leaderboard` data to update the `score` and `status` of those specific matchups, instead of creating new ones.
4. **Complete pre commit steps**
    - Ensure proper testing, verification, review, and reflection are done.
5. **Submit the change**
    - Commit with branch name `pga-builder`.
