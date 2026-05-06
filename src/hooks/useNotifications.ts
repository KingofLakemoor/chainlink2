import { useEffect, useRef } from 'react';
import { useAuth } from '../lib/auth-context';
import { getMessaging, getToken, onMessage } from 'firebase/messaging';
import { app, db } from '../lib/firebase';
import { doc, updateDoc, arrayUnion } from 'firebase/firestore';

export function useNotifications() {
  const { user, profile } = useAuth();
  const setupDone = useRef(false);

  useEffect(() => {
    if (!user || !profile || setupDone.current) return;

    // Only proceed if messaging is supported in the browser
    if (typeof window !== 'undefined' && 'serviceWorker' in navigator && 'PushManager' in window) {

      const setupNotifications = async () => {
        try {
          const messaging = getMessaging(app);

          // Request permission
          const permission = await Notification.requestPermission();
          if (permission !== 'granted') {
            console.log('Notification permission not granted.');
            return;
          }

          // Get FCM token
          const currentToken = await getToken(messaging, {
            vapidKey: import.meta.env.VITE_FIREBASE_VAPID_KEY
          });

          if (currentToken) {
            // Check if token already exists in profile
            const hasToken = profile.fcmTokens?.includes(currentToken);

            if (!hasToken) {
              console.log('Saving new FCM token for user');
              const userRef = doc(db, 'users', user.uid);
              await updateDoc(userRef, {
                fcmTokens: arrayUnion(currentToken)
              });
            }
          } else {
            console.log('No registration token available.');
          }

          // Listen for foreground messages
          const unsubscribe = onMessage(messaging, (payload) => {
            console.log('Message received in foreground: ', payload);
            // Optionally, we could show a toast notification here
            if (payload.notification) {
              new Notification(payload.notification.title || 'Notification', {
                body: payload.notification.body
              });
            }
          });

          setupDone.current = true;

        } catch (error) {
          console.error('Error setting up notifications:', error);
        }
      };

      setupNotifications();
    }
  }, [user, profile]); // keep dependencies, but ref prevents re-run
}
