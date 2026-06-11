1. **Create Announcements Admin Page:**
   - Create `src/pages/admin/announcements/AnnouncementsAdminPage.tsx`
   - Since the user requested "This admin page should be all one page for simplicity", this page will handle both listing and creating/editing announcements.
   - It will fetch announcements from the `announcements` Firestore collection.
   - Include a form for Title, Content, Priority/Type, and "Active" toggle.
   - Use `GenericTable` style or similar to display existing announcements and allow deletion/editing.

2. **Update Admin Dashboard Routes:**
   - Modify `src/pages/admin/AdminDashboard.tsx` to replace `GenericTable collectionName="announcements"` and `AdminPlaceholder title="Create Announcement"` with the new `AnnouncementsAdminPage`.
   - Update `ADMIN_MENU` if necessary (e.g. maybe make it just point to `/admin/announcements` instead of a dropdown, or keep the dropdown but route both to the same page, or redirect `create` to the single page). Given the "all one page" requirement, it makes sense to change the `ADMIN_MENU` to just have one link: `{ id: 'announcements', label: 'Announcements', icon: FileText, path: '/admin/announcements' }`.

3. **Update Dashboard Page:**
   - Modify `src/pages/dashboard/DashboardPage.tsx` to fetch announcements from the `announcements` collection where `active == true`, ordered by `createdAt` descending or priority.
   - Display the fetched announcements in the "Announcements" section instead of the hardcoded "Welcome to ChainLink Dashboard!..." message.

4. **Add pre-commit steps:**
   - Complete pre-commit steps to ensure proper testing, verification, review, and reflection are done.

5. **Commit and Submit.**
