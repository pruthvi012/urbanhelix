require('dotenv').config();
try {
    const sa = JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT);
    console.log('JSON parsed successfully');
    console.log('Private key preview:', sa.private_key.substring(0, 50));
    const admin = require('firebase-admin');
    admin.initializeApp({
        credential: admin.credential.cert(sa)
    });
    console.log('Firebase initialized successfully');
} catch (e) {
    console.error('Error:', e.message);
    console.log('Raw ENV:', process.env.FIREBASE_SERVICE_ACCOUNT);
}
