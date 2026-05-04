const mongoose = require('mongoose');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '../.env') });

// Define schemas locally to avoid import issues
const projectSchema = new mongoose.Schema({}, { strict: false, collection: 'projects' });
const Project = mongoose.model('ProjectLookup', projectSchema);

const hashSchema = new mongoose.Schema({}, { strict: false, collection: 'hashchainrecords' });
const HashChainRecord = mongoose.model('HashLookup', hashSchema);

async function findProjectHash() {
    try {
        console.log('Connecting to:', process.env.MONGO_URI.split('@')[1]); // Log host only for safety
        await mongoose.connect(process.env.MONGO_URI);
        
        // Find the most recent road project
        const project = await Project.findOne({ title: /road/i }).sort({ createdAt: -1 });
        
        if (!project) {
            console.log('No project found with "Ejipura" in the title.');
            return;
        }

        console.log('\n--- Project Details ---');
        console.log('Title:', project.title);
        console.log('ID:', project._id);
        console.log('Created At:', project.createdAt);

        // Find the corresponding hash record
        const hashRecord = await HashChainRecord.findOne({ 
            $or: [
                { 'data.projectId': project._id.toString() },
                { 'data.projectId': project._id },
                { 'data.title': project.title }
            ],
            recordType: 'project_created'
        }).sort({ createdAt: -1 });

        if (hashRecord) {
            console.log('\n--- Hash Chain Record ---');
            console.log('Sequence Number:', hashRecord.sequenceNumber);
            console.log('Record Hash:', hashRecord.recordHash);
            console.log('Data Hash (Internal):', hashRecord.dataHash);
            console.log('Previous Hash:', hashRecord.previousHash);
        } else {
            console.log('\nNo HashChain record found for this project.');
            // List last 5 records to help diagnose
            const lastRecords = await HashChainRecord.find().sort({ sequenceNumber: -1 }).limit(5);
            console.log('\nLast 5 records in HashChain:');
            lastRecords.forEach(r => console.log(`Seq ${r.sequenceNumber}: ${r.recordType} (${r.recordHash.substring(0,10)}...)`));
        }

        await mongoose.disconnect();
    } catch (err) {
        console.error('Error:', err);
    }
}

findProjectHash();
