const mongoose = require('mongoose');
const HashChainRecord = require('./models/HashChainRecord');
require('dotenv').config();

async function show() {
    try {
        await mongoose.connect(process.env.MONGO_URI);
        const record = await HashChainRecord.findOne({sequenceNumber: 7});
        console.log('BLOCK #7 IN MONGODB:');
        console.log(JSON.stringify(record, null, 2));
        process.exit(0);
    } catch (err) {
        console.error(err);
        process.exit(1);
    }
}
show();
