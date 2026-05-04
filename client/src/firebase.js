import { initializeApp } from "firebase/app";

let messaging = null;
let analytics = null;

// Your web app's Firebase configuration
const firebaseConfig = {
  apiKey: "AIzaSyBz5krp4urJol-c4k0iubVdj03Im_M6t74",
  authDomain: "urbanhelix-2bfdf.firebaseapp.com",
  projectId: "urbanhelix-2bfdf",
  storageBucket: "urbanhelix-2bfdf.firebasestorage.app",
  messagingSenderId: "740161213228",
  appId: "1:740161213228:web:6601449aa26aca57745289",
  measurementId: "G-6FVE3BTJZ7"
};

// Initialize Firebase — wrapped in try/catch so the app never crashes
let app;
try {
  app = initializeApp(firebaseConfig);
} catch (err) {
  console.warn('Firebase init failed:', err);
}

// Lazy-init messaging only when needed and supported
const getMessagingSafe = async () => {
  if (messaging) return messaging;
  try {
    if (typeof window !== 'undefined' && 'Notification' in window && 'serviceWorker' in navigator) {
      const { getMessaging } = await import("firebase/messaging");
      messaging = getMessaging(app);
      return messaging;
    }
  } catch (err) {
    console.warn('Firebase Messaging not supported in this browser:', err);
  }
  return null;
};

// Lazy-init analytics
try {
  if (app && typeof window !== 'undefined') {
    import("firebase/analytics").then(({ getAnalytics }) => {
      analytics = getAnalytics(app);
    }).catch(() => {});
  }
} catch (err) {
  // Analytics not critical
}

export const requestForToken = async () => {
  try {
    const msg = await getMessagingSafe();
    if (!msg) return null;

    console.log('Requesting notification permission...');
    const permission = await Notification.requestPermission();
    
    if (permission === 'granted') {
      const { getToken } = await import("firebase/messaging");
      const currentToken = await getToken(msg, {
        vapidKey: "BFc2NhjfUyThm7CQLByaSFHQW4-dKltyAYa7PKFGcnqUbd6AtgKuVefIW39JeRWyZPA_stzzLzuYxFNoQ5Dyfv0"
      });
      
      if (currentToken) {
        console.log("Push token:", currentToken);
        // Send token to server
        const token = localStorage.getItem('urbanhelix_token');
        if (token) {
          const api = (await import('./services/api')).default;
          await api.post('/notifications/subscribe', { token: currentToken });
        }
        return currentToken;
      } else {
        console.log('No registration token available.');
      }
    } else {
      console.log('Notification permission denied or dismissed.');
    }
  } catch (err) {
    console.warn('Push token request failed (non-critical):', err);
  }
  return null;
};

export const onMessageListener = (callback) => {
  // Return a no-op unsubscribe if messaging is not available
  getMessagingSafe().then((msg) => {
    if (!msg) return;
    try {
      import("firebase/messaging").then(({ onMessage }) => {
        onMessage(msg, (payload) => {
          console.log("Message received. ", payload);
          if (callback) callback(payload);
        });
      });
    } catch (err) {
      console.warn('onMessage setup failed:', err);
    }
  });
  // Return cleanup function
  return () => {};
};
