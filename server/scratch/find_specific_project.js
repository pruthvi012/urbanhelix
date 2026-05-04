const mongoose = require('mongoose');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '../.env') });

const projectSchema = new mongoose.Schema({}, { strict: false, collection: 'projects' });
const Project = mongoose.model('ProjectFinder', projectSchema);

const hashSchema = new mongoose.Schema({}, { strict: false, collection: 'hashchainrecords' });
const HashChainRecord = mongoose.model('HashFinder', hashSchema);

async function findProject() {
    try {
        await mongoose.connect(process.env.MONGO_URI);
        
        const projectCode = 'UHX-F35216';
        console.log(`Searching for Project Code: ${projectCode}`);
        
        const p = await Project.findOne({ projectCode: projectCode });
        if (p) {
            console.log('Project Found:');
            console.log(`Title: ${p.title}`);
            console.log(`_id: ${p._id}`);
            
            // Check if there are hash records for this project ID or the _id
            const records = await HashChainRecord.find({
                $or: [
                    { 'data.projectId': p._id },
                    { 'relatedEntity.entityId': p._id }
                ]
            });
            
            console.log(`\nFound ${records.length} hash chain records for this project.`);
            records.forEach(r => {
                console.log(`- Block #${r.sequenceNumber} | Type: ${r.recordType} | Hash: ${r.recordHash}`);
            });
        } else {
            console.log('Project not found in Projects collection.');
            // Search by title just in case
            const allProjects = await Project.find().limit(10);
            console.log('\nLast 10 Projects in DB:');
            allProjects.forEach(x => console.log(`- ${x.projectId} | ${x.title}`));
        }

        await mongoose.disconnect();
    } catch (err) { console.error(err); }
}

findProject();
