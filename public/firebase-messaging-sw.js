importScripts('https://www.gstatic.com/firebasejs/10.9.0/firebase-app-compat.js');
importScripts('https://www.gstatic.com/firebasejs/10.9.0/firebase-messaging-compat.js');

// Dynamically parse Firebase config from URL query parameters
// which will be injected during Service Worker registration in the frontend.
const urlParams = new URLSearchParams(self.location.search);
let firebaseConfig = null;

try {
  const configParam = urlParams.get('config');
  if (configParam) {
    firebaseConfig = JSON.parse(decodeURIComponent(configParam));
  }
} catch (e) {
  console.error('[firebase-messaging-sw.js] Failed to parse dynamic config', e);
}

// Fallback configuration if none provided via URL
if (!firebaseConfig) {
  console.warn('[firebase-messaging-sw.js] Missing dynamic config. Ensure the frontend passes app.options during registration. Using a dummy config.');
  firebaseConfig = {
    projectId: "chainlink-fallback",
    appId: "1:1234567890:web:1234567890",
    authDomain: "chainlink-fallback.firebaseapp.com",
    messagingSenderId: "1234567890",
    apiKey: "ignored-but-required-for-sw-compat"
  };
}

firebase.initializeApp(firebaseConfig);

const messaging = firebase.messaging();

messaging.onBackgroundMessage((payload) => {
  console.log('[firebase-messaging-sw.js] Received background message ', payload);
});
