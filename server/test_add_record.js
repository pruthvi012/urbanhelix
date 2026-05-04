const mongoose = require('mongoose');
const HashChainService = require('./services/hashChainService');
const Project = require('./models/Project');
require('dotenv').config();

async function test() {
    try {
        await mongoose.connect(process.env.MONGO_URI);
        console.log('Connected to MongoDB');

        const project = await Project.findOne({projectCode: 'UHX-C616B6'});
        
        console.log('Testing addRecord for expenditure...');
        const hr = await HashChainService.addRecord(
            'expenditure_logged',
            { projectId: project._id, projectCode: project.projectCode, amount: 1000, material: 'Sand', vendor: 'Test', entryHash: 'testhash', loggedBy: 'Tester' },
            { entityType: 'project', entityId: project._id },
            project.proposedBy
        );

        console.log('Record created successfully:', hr._id);
        process.exit(0);
    } catch (err) {
        console.error('Record creation failed!');
        console.error(err);
        process.exit(1);
    }
}

test();
