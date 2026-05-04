const mongoose = require('mongoose');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '../.env') });

const hashSchema = new mongoose.Schema({}, { strict: false, collection: 'hashchainrecords' });
const HashChainRecord = mongoose.model('HashFinder', hashSchema);

async function findTodaysHashes() {
    try {
        await mongoose.connect(process.env.MONGO_URI);
        
        console.log('--- ALL HASH RECORDS IN DATABASE ---');
        const records = await HashChainRecord.find().sort({ sequenceNumber: 1 });

        if (records.length === 0) {
            console.log('No records found for today.');
            // Let's check the very last 5 records regardless of date
            const lastAny = await HashChainRecord.find().sort({ createdAt: -1 }).limit(5);
            console.log('\nLast 5 records in total:');
            lastAny.forEach(r => {
                console.log(`- Seq ${r.sequenceNumber} | Type: ${r.recordType} | Created: ${r.createdAt}`);
                console.log(`  Hash: ${r.recordHash}`);
            });
        } else {
            records.forEach(r => {
                console.log(`\n[BLOCK #${r.sequenceNumber}]`);
                console.log(`Type: ${r.recordType}`);
                console.log(`Record Hash: ${r.recordHash}`);
                console.log(`Data Hash: ${r.dataHash}`);
                if (r.recordType === 'expenditure_logged') {
                    console.log(`Amount: ₹${r.data.amount}`);
                    console.log(`Material: ${r.data.material}`);
                }
                if (r.recordType === 'project_created') {
                    console.log(`Project: ${r.data.title}`);
                }
            });
        }

        await mongoose.disconnect();
    } catch (err) { console.error(err); }
}

findTodaysHashes();
