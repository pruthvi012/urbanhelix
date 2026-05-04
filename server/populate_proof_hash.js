const mongoose = require('mongoose');
const Project = require('./models/Project');
const HashChainRecord = require('./models/HashChainRecord');
require('dotenv').config();

async function populate() {
    try {
        await mongoose.connect(process.env.MONGO_URI);
        console.log('Connected to MongoDB');

        const projects = await Project.find({});
        console.log(`Populating proofHash for ${projects.length} projects...`);

        for (const p of projects) {
            const latestRecord = await HashChainRecord.findById(p.hashChainRecordId);
            if (latestRecord) {
                p.proofHash = latestRecord.recordHash;
                await p.save();
                console.log(` - Updated proofHash for ${p.projectCode || p.title}`);
            }
        }

        console.log('Done.');
        process.exit(0);
    } catch (err) {
        console.error(err);
        process.exit(1);
    }
}
populate();
