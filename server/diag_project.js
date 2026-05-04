const mongoose = require('mongoose');
const Project = require('./models/Project');
const HashChainRecord = require('./models/HashChainRecord');
const AuditLog = require('./models/AuditLog');
require('dotenv').config();

async function diag() {
    try {
        await mongoose.connect(process.env.MONGO_URI);
        console.log('Connected to MongoDB');

        const projectCode = 'UHX-C616B6';
        const project = await Project.findOne({ projectCode: projectCode });

        if (!project) {
            console.log(`Project with code ${projectCode} not found.`);
            const allProjects = await Project.find({}, 'projectCode title');
            console.log('Available project codes:', allProjects.map(p => p.projectCode).filter(Boolean));
            process.exit(0);
        }

        console.log('Project found:', JSON.stringify(project, null, 2));

        const records = await HashChainRecord.find({
            $or: [
                { 'data.projectId': project._id.toString() },
                { 'data.projectId': project._id },
                { 'relatedEntity.entityId': project._id }
            ]
        });
        console.log(`Found ${records.length} HashChainRecords for this project.`);
        records.forEach(r => console.log(` - [${r.sequenceNumber}] ${r.recordType}`));

        const logs = await AuditLog.find({
            resourceId: project._id
        });
        console.log(`Found ${logs.length} AuditLogs for this project.`);
        logs.forEach(l => console.log(` - ${l.action}: ${l.details}`));

        process.exit(0);
    } catch (err) {
        console.error(err);
        process.exit(1);
    }
}

diag();
