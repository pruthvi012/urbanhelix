const mongoose = require('mongoose');
const HashChainRecord = require('./models/HashChainRecord');
require('dotenv').config();

async function count() {
    try {
        await mongoose.connect(process.env.MONGO_URI);
        const total = await HashChainRecord.countDocuments();
        console.log('TOTAL RECORDS IN HASHCHAINRECORDS COLLECTION:', total);
        process.exit(0);
    } catch (err) {
        console.error(err);
        process.exit(1);
    }
}
count();
