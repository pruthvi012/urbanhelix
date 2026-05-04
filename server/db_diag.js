const mongoose = require('mongoose');
require('dotenv').config();

async function check() {
    try {
        console.log('--- DB DIAGNOSTIC START ---');
        console.log('Connecting to URI from .env...');
        const conn = await mongoose.connect(process.env.MONGO_URI);
        
        console.log('CONNECTION INFO:');
        console.log(' - Host:', conn.connection.host);
        console.log(' - Port:', conn.connection.port);
        console.log(' - DB Name:', conn.connection.name);
        
        const collections = await conn.connection.db.listCollections().toArray();
        console.log('\nCOLLECTIONS IN THIS DATABASE:');
        
        for (const col of collections) {
            const count = await conn.connection.db.collection(col.name).countDocuments();
            console.log(` - ${col.name.padEnd(20)}: ${count} documents`);
        }
        
        console.log('\n--- DB DIAGNOSTIC END ---');
        process.exit(0);
    } catch (err) {
        console.error('DIAGNOSTIC FAILED:', err.message);
        process.exit(1);
    }
}

check();
