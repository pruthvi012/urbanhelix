const mongoose = require('mongoose');
const Project = require('./models/Project');
const HashChainRecord = require('./models/HashChainRecord');
require('dotenv').config();

async function fixLinks() {
    try {
        await mongoose.connect(process.env.MONGO_URI);
        console.log('Connected to MongoDB');

        const projects = await Project.find({});
        console.log(`Checking ${projects.length} projects...`);

        for (const p of projects) {
            // Find the latest record for this project
            const latestRecord = await HashChainRecord.findOne({
                $or: [
                    { 'data.projectId': p._id.toString() },
                    { 'data.projectId': p._id },
                    { 'relatedEntity.entityId': p._id }
                ]
            }).sort({ sequenceNumber: -1 });

            if (latestRecord) {
                if (!p.hashChainRecordId || p.hashChainRecordId.toString() !== latestRecord._id.toString()) {
                    console.log(`Updating hashChainRecordId for ${p.projectCode || p.title} -> Block #${latestRecord.sequenceNumber}`);
                    p.hashChainRecordId = latestRecord._id;
                    await p.save();
                } else {
                    console.log(`Project ${p.projectCode || p.title} is already linked to its latest block #${latestRecord.sequenceNumber}`);
                }
            } else {
                console.log(`No hash records found for project ${p.projectCode || p.title}`);
            }
        }

        console.log('Finished fixing links.');
        process.exit(0);
    } catch (err) {
        console.error(err);
        process.exit(1);
    }
}

fixLinks();
