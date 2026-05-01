1.  **Analyze the Issue:**
    *   The Cubs vs. Diamondbacks game is displayed on the user dashboard despite being "abandoned".
    *   The memory rule states: "Matchups that transition to or are initially inserted as 'STATUS_IN_PROGRESS', 'STATUS_FINAL', or 'STATUS_POSTPONED' without any active ('PENDING') user picks are marked as `abandoned: true` and `active: false` in Firestore, removing them from the game board and designating them for cleanup."
    *   The game is stuck at "Top 6th" ("In Progress") because the `syncLeagueSchedules` function explicitly skips updates for documents where `abandoned` is true:
        ```typescript
        // in src/services/scheduleProcessor.ts
        if (existingData.abandoned) {
          continue;
        }
        ```
    *   The user sees this game because `src/App.tsx` does *not* filter out matchups where `abandoned` is true when setting state for `allFetchedMatchups` or `filteredMatchups`.

2.  **Required Changes:**
    *   In `src/App.tsx`, inside the `useEffect` that filters `filteredMatchups`, we must add a condition to exclude abandoned matchups: `if (m.abandoned) return false;`.
    *   Let's check if the admin view (`src/pages/admin/AdminDashboard.tsx`) should also filter abandoned matchups. Given they are "designating them for cleanup," they probably shouldn't show in the active board either. But maybe we can just do it in `filteredMatchups` in `src/App.tsx` where the user sees them. Wait, memory rule states: "hidden from both the user pick dashboard and the forward-facing Admin Matchups view." So let's filter them out in the Admin Matchups view as well.

3.  **Plan:**
    *   Update `src/App.tsx`:
        *   In `filteredMatchups = allFetchedMatchups.filter((m: any) => {` add `if (m.abandoned) return false;`.
    *   Update `src/pages/admin/AdminDashboard.tsx`:
        *   In the Admin Matchups view, when generating the list of matchups, add `if (m.abandoned) return false;` or filter `data` where `!m.abandoned`. Wait, let's look at `AdminDashboard.tsx`.
        *   In `AdminDashboard.tsx`, there's `const filteredData = data.filter(m => { ... });`. Add `if (m.abandoned) return false;` to it.

4.  **Verification:**
    *   Make changes.
    *   Run lint and build.
    *   Run tests.
