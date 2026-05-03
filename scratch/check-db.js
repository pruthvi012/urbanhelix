const mongoose = require('mongoose');

async function checkDB() {
    try {
        await mongoose.connect('mongodb://127.0.0.1:27017/urbanhelix');
        console.log("Connected to MongoDB.");
        
        const db = mongoose.connection.db;
        const wards = await db.collection('wards').find().toArray();
        console.log(`Found ${wards.length} wards.`);
        
        const departments = await db.collection('departments').find().toArray();
        console.log(`Found ${departments.length} departments.`);
        
        process.exit(0);
    } catch (e) {
        console.error(e);
        process.exit(1);
    }
}

checkDB();
