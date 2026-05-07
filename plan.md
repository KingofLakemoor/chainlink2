1. **Update `App.tsx` (`renderMatchupCard` function)**
   - Check if `m.type === 'OVER_UNDER'`.
   - If it is:
     - Use `OVER` for the away team side and `/images/over.png` for its image.
     - Use `UNDER` for the home team side and `/images/under.png` for its image.
   - Adjust the `handleMakePick` calls to pass the modified team details or just keep it simple by replacing the display elements. Wait, if `handleMakePick(m, m.awayTeam)` is called, but we are faking it to be 'OVER', we need to check how picks are stored.
   - From grep results: `winnerId` is set to `'OVER'` or `'UNDER'` for `OVER_UNDER` matchups (in `grader.ts` and `pickemGrader.ts`).
   - If `m.type === 'OVER_UNDER'`, we should probably pass `{ id: 'OVER', name: 'Over', image: '/images/over.png' }` to `handleMakePick` for the "away" (top) pick, and similarly `{ id: 'UNDER', name: 'Under', image: '/images/under.png' }` for the "home" (bottom) pick.

2. **Update `src/components/dashboard/dashboard-pick.tsx` (`DashboardPick`)**
   - In `DashboardPick`, check if `activeMatchup.type === 'OVER_UNDER'`.
   - If so, update the image, name, and pick ID logic similar to `App.tsx`.
   - Ensure the pick status logic (`activePick?.pick?.id === ...`) still works with `'OVER'` and `'UNDER'`.

3. **Update `src/pages/pickem/PickEmPage.tsx`**
   - When rendering the matchup buttons, check `m.type === 'OVER_UNDER'`.
   - Replace the team images and names with 'OVER' / 'UNDER' and their respective images `/images/over.png` / `/images/under.png`.
   - The pick IDs should be `'OVER'` and `'UNDER'`. Update `handlePick(m, m.awayTeam.id)` to `handlePick(m, 'OVER')` etc.

4. **Add the images**
   - `cp "/tmp/file_attachments/Over Under ChainLink-1-Over.png" public/images/over.png`
   - `cp "/tmp/file_attachments/Over Under ChainLink-2-Under.png" public/images/under.png`
   (Already done, need to make sure they are tracked). Wait, I just need to make sure I don't need to rename them.

5. **Pre-commit Instructions & Review**
   - Check the code using `pre_commit_instructions` tool and run pre-commit tests.
