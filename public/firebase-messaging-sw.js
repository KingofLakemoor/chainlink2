importScripts('https://www.gstatic.com/firebasejs/10.9.0/firebase-app-compat.js');
importScripts('https://www.gstatic.com/firebasejs/10.9.0/firebase-messaging-compat.js');

const firebaseConfig = {
  projectId: "chainlink-2-72590",
  appId: "1:772092872335:web:f98783f86a00c2e9bc12fa",
  authDomain: "chainlink-2-72590.firebaseapp.com",
  messagingSenderId: "772092872335",
  apiKey: "ignored-but-required-for-sw-compat"
};

firebase.initializeApp(firebaseConfig);

const messaging = firebase.messaging();

messaging.onBackgroundMessage((payload) => {
  console.log('[firebase-messaging-sw.js] Received background message ', payload);
});
