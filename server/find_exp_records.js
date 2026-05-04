const mongoose = require('mongoose');
const HashChainRecord = require('./models/HashChainRecord');
require('dotenv').config();

async function find() {
    try {
        await mongoose.connect(process.env.MONGO_URI);
        const records = await HashChainRecord.find({recordType: 'expenditure_logged'});
        console.log(JSON.stringify(records, null, 2));
        process.exit(0);
    } catch (err) {
        console.error(err);
        process.exit(1);
    }
}
find();
