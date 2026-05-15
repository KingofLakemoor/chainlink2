1.  **Analyze the Issue:** The user wants the PGA matchups to display the current hole they are on (e.g., "Thru 2") instead of "In Progress" when a match is ongoing.
2.  **Locate Data Source:** The "Thru" data can be found in the `pga_leaderboard.json` payload at `competitor.status.displayThru` or `competitor.status.thru`. I will need to extract this information for both the home and away golfer.
3.  **Determine Logic for Paired Golfers:** If both golfers are "In Progress", I should grab their respective `thru` values. The instructions state: "The golfers should usually be paired, but the lower Thru number should be used if there is a discrepancy".
    *   If `newStatus === 'STATUS_IN_PROGRESS'`, calculate the `thru` value.
    *   `homeThru` = `homeComp.status?.thru`
    *   `awayThru` = `awayComp.status?.thru`
    *   Determine the minimum valid "thru" value.
    *   If a minimum "thru" value > 0 exists, set `statusDesc` to `Thru X` or `Thru 18` (if they are at the end, although that might be 'Final').
    *   If we can't find a valid thru, fallback to "In Progress".
4.  **Implement in `scheduleProcessor.ts`:**
    *   Update the section where `newStatus` is calculated around line 102.
    *   Add variables to capture `homeThru` and `awayThru`.
    *   Calculate `minThru = Math.min(homeThru, awayThru)`. (Handle cases where one might be 0, null, or undefined appropriately).
    *   Set `statusDesc` to `Thru ${minThru}` if `newStatus === 'STATUS_IN_PROGRESS'` and a valid `minThru` is found.
5.  **Pre-commit checks:**
    *   Run `pre_commit_instructions` and follow the provided steps to ensure code quality and verify functionality before submitting.
