1. **Fetch Achievements and User Earned Achievements**: Update `ProfilePage.tsx` to fetch the complete list of achievements and the user's earned achievements from Firestore, so we can display them. The user wants them displayed as a Medal Table. The achievements should be grouped or sorted with rarer achievements higher up, and displaying the number of times they've been earned.
2. **Update `ProfilePage` component**: Modify `src/pages/profile/ProfilePage.tsx` to include an achievements section. This section should display the user's achievements sorted by weight/rarity.
3. **Verify the implementation locally**: Run Playwright to check if the achievements are rendered correctly.
4. **Run static checks**: Run `npm run lint` and `npm run build`.
5. **Complete pre-commit steps**: Complete pre commit steps to ensure proper testing, verification, review, and reflection are done.
6. **Submit changes**: Push to a branch with a descriptive commit message.
