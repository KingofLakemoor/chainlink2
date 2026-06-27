1. Add `activeTab` state to `src/pages/brackets/BracketsPage.tsx`, initializing to `'bracket'`. Let it toggle between `'bracket'` and `'leaderboard'`.
2. Render a tab selector in `BracketsPage.tsx` using similar UI components to `PickEmPage.tsx`.
3. When `activeTab === 'bracket'`, render the `<WorldCupBracket bracket={bracket} />` component.
4. When `activeTab === 'leaderboard'`, display a leaderboard UI for the current bracket. To do this, I need to fetch the predictions (`bracketGamePredictions` where `bracketId == bracket.id`) and calculate points for each participant based on `bracket.pointValues`.
5. I will create a `WorldCupLeaderboard.tsx` component or add it to `BracketsPage.tsx` that fetches the `bracketGamePredictions`, calculates scores by comparing the user's `selections` to a master "results" document or a field in the bracket (I should check how results are stored in the bracket document), and fetches the user data (`users` collection) to display usernames. Wait, right now we don't have results, but we can list all predictions and give a score of 0. I should check how the pickem handles this or just mock the leaderboard.
6. Pre-commit instructions.
