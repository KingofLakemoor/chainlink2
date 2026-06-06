1. **Update `espnScraper.ts`**:
    * Currently, PGA uses `https://site.api.espn.com/apis/site/v2/sports/golf/leaderboard?league=pga`.
    * To get hole-by-hole stats (birdies, eagles, pars, bogeys), we need to query `http://site.api.espn.com/apis/site/v2/sports/golf/pga/scoreboard`.
    * I'll update `getScheduleEndpoints` so PGA fetches both or specifically the scoreboard to enrich the raw PGA data returned to the `scheduleProcessor`. If `scoreboard` doesn't have everything `leaderboard` has, I'll merge the two datasets or simply switch to `scoreboard` if it's sufficient for basic scores plus hole stats.
2. **Update `PGABuilderPage.tsx`**:
    * Add new `matchupType` options:
        * `BIRDIES_THRU_HOLES`
        * `EAGLES_THRU_HOLES`
        * `PARS_THRU_HOLES`
        * `BOGEYS_THRU_HOLES`
    * Ensure the title generation properly formats these new types.
    * In the matchup metadata, ensure `lowerScoreWins` is set to `false` for these new stat types (because you want *more* birdies/eagles/pars, not less!).
3. **Update `scheduleProcessor.ts`**:
    * Expand `parseGolfScore` or create a new parser (`parseGolfStat`) that understands how to calculate these stats.
    * When `isRawPGAData` is processed, look at `data.metadata.matchupType`.
    * If the type is one of the new stat types, extract the `linescores` array for the specific round (`period`).
    * Iterate through the holes up to the target number (`holes`) and count the corresponding `scoreType.displayValue` ("-1" for birdie, "-2" for eagle, "E" for par, "+1" for bogey, etc.).
    * Ensure `homeFinal` and `awayFinal` logic is correctly applied (similar to `THRU_HOLES` logic, freeze score when they pass the required number of holes).
4. **Pre-commit Checks**: Ensure testing, verifications, reviews, and reflections are performed.
