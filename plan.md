1.  **Create `Link4AdminPage.tsx`**: Create a new file `src/pages/admin/link4/Link4AdminPage.tsx`. This component will be the admin page for creating/managing "Link 4" segments. It will have a form to define a new segment with fields like name, start date, end date, maximum odds, and allowed sports. It will save this to a new `link4Segments` collection in Firestore. It will also have a table/list of existing segments.
2.  **Verify File Creation**: Read `src/pages/admin/link4/Link4AdminPage.tsx` using `cat` or similar command to verify its contents were written correctly.
3.  **Update `AdminDashboard.tsx` Menu**: Modify `src/pages/admin/AdminDashboard.tsx` to include "Link 4" in the `ADMIN_MENU` array using the `Layers` icon from `lucide-react`. I have already examined `AdminDashboard.tsx` using `sed` and confirmed `ADMIN_MENU` and `Layers` exist.
4.  **Update `AdminDashboard.tsx` Routes**: Add a route `<Route path="link4/*" element={<Link4AdminPage />} />` to the `<Routes>` list in `AdminDashboard.tsx`. Also import `Link4AdminPage` at the top of the file.
5.  **Update Firestore Rules**: Modify `firestore.rules` to add `match /link4Segments/{segmentId} { allow read: if isSignedIn(); allow write: if isAdmin(); }` so that admins can read/write the segments.
6.  **Run Build**: Run the project's build command (`npm run build`) to ensure there are no compilation errors.
7.  **Run Tests**: Run all relevant tests (e.g. `npx tsx --test`) to ensure changes are correct and have not introduced regressions.
8. Complete pre-commit steps to ensure proper testing, verification, review, and reflection are done.
9.  **Submit**: Submit the changes.
