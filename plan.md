1. **Add `usernameLower` to user model:** In `src/lib/firebase.ts`, update `ensureUserProfile` to generate and save `usernameLower` automatically.
2. **Update `check-username` API endpoint:** In `src/apiRouter.ts`, modify the `/users/check-username` endpoint to query by `usernameLower` instead of `username`.
3. **Update Profile Updates:** In `src/pages/profile/ProfilePage.tsx`, update the save profile handler so that when it updates the `username`, it also updates `usernameLower`.
4. **Update Indexes:** Check if a composite index is needed. Single field query doesn't need an index.
5. **Add tests:** Ensure test cases in `src/apiRouter.test.ts` pass and handle `usernameLower`.
6. **Complete pre commit steps:** Complete pre commit steps to make sure proper testing, verifications, reviews and reflections are done.
7. **Submit the change.** Once all tests pass, I will submit the change with a descriptive commit message.
