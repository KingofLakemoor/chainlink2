I propose the following plan to implement the notifications admin panel and the sample notifications using Firebase Cloud Messaging (FCM) for web push notifications:

1. **Firestore Schema Updates**
   - Add a `notifications` collection to store created/scheduled notifications (`title`, `body`, `audience`, `targetUserId`, `scheduledTime`, `status`, `createdAt`).
   - Update the `users` collection schema to include an `fcmTokens` array (to store push notification device tokens).

2. **Client-Side FCM Setup**
   - Initialize `getMessaging` in `src/lib/firebase.ts`.
   - Create a utility/hook to request user permission for web push notifications and save the generated FCM token to the user's document in Firestore.
   - Listen for incoming messages when the app is open (foreground notifications).

3. **Notifications Admin Panel UI**
   - Build a dashboard at `/admin/notifications` to list notifications.
   - Create a form to **create, edit, and delete** notifications. Admins can choose an audience (Global vs. Specific User) and either send immediately or schedule for a future date/time.

4. **Cloud Functions for Sending & Automation**
   - **Scheduled Sender**: Create a background scheduled function (running every minute) to query `PENDING` notifications that have reached their `scheduledTime` and dispatch them via Firebase Admin Messaging, then mark them as `SENT`.
   - **Win/Loss Notification**: Update the pick grader (`src/services/grader.ts`) to immediately send a push notification to a user when their pick is resolved as a WIN or LOSS.
   - **W10 Chain Global Notification**: Update the pick grader so that when a user's win streak hits exactly 10, it automatically inserts a GLOBAL notification into the system to broadcast to everyone.
   - **Daily Reminder**: Create a new scheduled function (e.g., running at 10:00 AM daily) that finds users who haven't made a pick for the day and sends them a reminder push notification.
   - Complete pre-commit steps to make sure proper testing, verifications, reviews and reflections are done.

Let me know if this looks good to you, or if you'd rather do simple in-app notifications (like a bell icon with a dropdown) instead of actual Web Push Notifications via FCM!
