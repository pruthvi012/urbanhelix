const mongoose = require('mongoose');
const crypto = require('crypto');
const mongoURI = 'mongodb+srv://Pruthvish:pruthvishgowda@cluster0.3vhcidv.mongodb.net/urbanhelix?retryWrites=true&w=majority';

const hashChainRecordSchema = new mongoose.Schema({
    sequenceNumber: { type: Number, required: true },
    recordType: { type: String, required: true },
    data: { type: Object, required: true },
    dataHash: { type: String, required: true },
    previousHash: { type: String, required: true },
    recordHash: { type: String, required: true }
}, { collection: 'hashchainrecords' });

const HashChainRecord = mongoose.model('HashChainRecord', hashChainRecordSchema);

function computeHash(data) {
    return crypto.createHash('sha256').update(data).digest('hex');
}

async function verify() {
    try {
        console.log('Connecting to MongoDB...');
        await mongoose.connect(mongoURI);
        console.log('Connected.');
        
        const records = await HashChainRecord.find().sort({ sequenceNumber: 1 });
        console.log('Total records in hashchainrecords:', records.length);
        
        if (records.length === 0) {
            console.log('Collection might be empty or named differently. Checking all collection names...');
            const collections = await mongoose.connection.db.listCollections().toArray();
            console.log('Available collections:', collections.map(c => c.name));
            process.exit(0);
        }

        for (let i = 0; i < records.length; i++) {
            const record = records[i];
            const dataString = JSON.stringify(record.data);
            const expectedDataHash = computeHash(dataString);
            
            console.log(`\nBlock #${record.sequenceNumber} (${record.recordType})`);
            console.log(`  Stored dataHash:   ${record.dataHash}`);
            console.log(`  Expected dataHash: ${expectedDataHash}`);
            
            if (expectedDataHash !== record.dataHash) {
                console.log('  [TAMPERED] Data hash mismatch!');
            }
            
            const expectedRecordHash = computeHash(`${record.dataHash}${record.previousHash}${record.sequenceNumber}`);
            console.log(`  Stored recordHash:   ${record.recordHash}`);
            console.log(`  Expected recordHash: ${expectedRecordHash}`);
            
            if (expectedRecordHash !== record.recordHash) {
                console.log('  [TAMPERED] Record hash mismatch!');
            }
            
            if (i > 0) {
                if (records[i-1].recordHash !== record.previousHash) {
                    console.log(`  [TAMPERED] Chain link broken! Previous hash mismatch.`);
                }
            }
        }
    } catch (err) {
        console.error('Error:', err);
    } finally {
        await mongoose.disconnect();
        process.exit(0);
    }
}

verify();
