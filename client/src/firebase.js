import { initializeApp } from "firebase/app";
import { getMessaging, getToken, onMessage } from "firebase/messaging";
import { getAnalytics } from "firebase/analytics";
import axios from 'axios';

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

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const analytics = getAnalytics(app);
const messaging = getMessaging(app);

export const requestForToken = async () => {
  try {
    console.log('Requesting notification permission...');
    const permission = await Notification.requestPermission();
    
    if (permission === 'granted') {
      const currentToken = await getToken(messaging, {
        vapidKey: "BFc2NhjfUyThm7CQLByaSFHQW4-dKltyAYa7PKFGcnqUbd6AtgKuVefIW39JeRWyZPA_stzzLzuYxFNoQ5Dyfv0" // Get this from Firebase Console Settings > Cloud Messaging
      });
      
      if (currentToken) {
        console.log("Push token:", currentToken);
        // Send token to server
        const token = localStorage.getItem('urbanhelix_token');
        if (token) {
          await axios.post('/api/notifications/subscribe', 
            { token: currentToken },
            { headers: { Authorization: `Bearer ${token}` } }
          );
        }
        return currentToken;
      } else {
        console.log('No registration token available. Request permission to generate one.');
      }
    } else {
      console.log('Notification permission denied or dismissed.');
    }
  } catch (err) {
    console.log('An error occurred while retrieving token. ', err);
  }
};

export const onMessageListener = () =>
  new Promise((resolve) => {
    onMessage(messaging, (payload) => {
      console.log("Message received. ", payload);
      resolve(payload);
    });
  });
