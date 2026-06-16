# Implementation Plan for Pick Queuing (ChainLink Pro)

This feature allows premium "ChainLink Pro" users to select up to two active picks simultaneously: one active `PENDING` pick and one `QUEUED` pick. The queued pick is automatically promoted to `PENDING` when their active pick resolves (either by being graded or if the user cancels it).

If a queued pick's matchup begins before it can be promoted, it must be automatically marked as `CANCELED` and refunded (this prevents users from bypassing the "one live game at a time" rule).

## 1. Modify `src/apiRouter.ts` (Pick Creation & Cancellation)
*   **`/picks/make-pick`**:
    *   Query the `picks` collection for `['PENDING', 'QUEUED']` instead of just `PENDING`.
    *   If active picks exist:
        *   If the user is NOT premium, throw an error prompting them to upgrade to ChainLink Pro.
        *   If the user has 2 active picks, throw an error.
        *   If the user is premium and has exactly 1 active pick, assign the new pick's status as `QUEUED`.
    *   If no active picks exist, assign the new pick's status as `PENDING`.
*   **`/picks/cancel-pick`**:
    *   Allow users to cancel picks with either `PENDING` or `QUEUED` status.
    *   If a `PENDING` pick is canceled, search for an existing `QUEUED` pick.
    *   If a `QUEUED` pick is found, check its associated matchup document.
    *   If the matchup is still `STATUS_SCHEDULED`, promote the pick to `PENDING`.
    *   If the matchup has already started/ended (e.g., `STATUS_IN_PROGRESS` or `STATUS_FINAL`), mark the queued pick as `CANCELED` and correctly refund its `coins/links` to the user.

## 2. Modify `src/services/grader.ts` (Grading Promotion)
*   Update `gradeSingleMatchup`. After grading a `PENDING` pick (as a WIN, LOSS, or PUSH), search for a `QUEUED` pick belonging to that user.
*   Like the cancellation logic, check the queued pick's matchup status:
    *   If the matchup is `STATUS_SCHEDULED`, promote the pick to `PENDING`.
    *   If the matchup has started, mark the queued pick as `CANCELED` and refund the user in the same transaction block.

## 3. Modify `src/services/scheduleProcessor.ts` (Prevent Abandonment)
*   When syncing the schedules, the system normally "abandons" scheduled games that fall out of the data feed if they have no active `PENDING` picks.
*   Update the two queries targeting `picks` in `scheduleProcessor.ts` to check `where('status', 'in', ['PENDING', 'QUEUED'])` so games with only queued picks are not prematurely abandoned.

## 4. Modify Frontend (`src/App.tsx` & `src/components/ui/MatchupCard.tsx`)
*   **`App.tsx`**:
    *   Modify `hasActivePickAnywhere` to evaluate both `PENDING` and `QUEUED` picks.
    *   Isolate the `activePick` and `queuedPick` locally.
    *   Display both picks at the top of the screen in the "My Picks" section.
    *   When constructing a local optimistic mock pick in `handleMakePick`, calculate its status (if `activePicks.length > 0`, it's `QUEUED`).
    *   Handle local cancellation optimally by upgrading a queued pick to pending.
*   **`MatchupCard.tsx`**:
    *   Add a visual indicator (`<span className="...">Queued</span>`) next to the cancel button for queued picks.
    *   Add `profile` to `MatchupCardProps` to allow the button logic to disable picking if `activePicks.length >= (profile?.premium ? 2 : 1)`.

## 5. Verification
*   Run unit tests via `npx vitest run`.
*   Spin up the local dev server and test frontend functionality (including bypassing auth to ensure the UI behaves with mock matchups correctly).
