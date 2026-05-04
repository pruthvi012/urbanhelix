// Scripts for firebase and firebase messaging - v2.3-ULTRA-FORCE
// FORCE_UPDATE_TIMESTAMP: 2026-05-04T12:20:00Z
importScripts('https://www.gstatic.com/firebasejs/9.0.0/firebase-app-compat.js');
importScripts('https://www.gstatic.com/firebasejs/9.0.0/firebase-messaging-compat.js');

// Initialize the Firebase app in the service worker by passing in
// your app's Firebase config object.
// https://firebase.google.com/docs/web/setup#config-object
firebase.initializeApp({
  apiKey: "AIzaSyBz5krp4urJol-c4k0iubVdj03Im_M6t74",
  authDomain: "urbanhelix-2bfdf.firebaseapp.com",
  projectId: "urbanhelix-2bfdf",
  storageBucket: "urbanhelix-2bfdf.firebasestorage.app",
  messagingSenderId: "740161213228",
  appId: "1:740161213228:web:6601449aa26aca57745289",
  measurementId: "G-6FVE3BTJZ7"
});

// Retrieve an instance of Firebase Messaging so that it can handle background
// messages.
const messaging = firebase.messaging();

messaging.onBackgroundMessage((payload) => {
  console.log('[firebase-messaging-sw.js] Received background message ', payload);
  // Customize notification here
  const notificationTitle = payload.notification.title;
  const notificationOptions = {
    body: payload.notification.body,
    icon: '/favicon.svg'
  };

  self.registration.showNotification(notificationTitle, notificationOptions);
});

// PWA: Add fetch listener to satisfy "Install" requirements
self.addEventListener('install', (event) => {
  self.skipWaiting();
});

self.addEventListener('fetch', (event) => {
  // Simple pass-through for now
});
