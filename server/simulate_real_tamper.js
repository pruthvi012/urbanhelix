const mongoose = require('mongoose');
const Project = require('./models/Project');
require('dotenv').config();

async function tamper() {
    try {
        await mongoose.connect(process.env.MONGO_URI);
        console.log('Connected to MongoDB');

        const project = await Project.findOne({projectCode: 'UHX-C616B6'});
        if (!project) {
            console.log('Project UHX-C616B6 not found!');
            process.exit(1);
        }

        const oldBudget = project.allocatedBudget || project.estimatedBudget;
        const newBudget = oldBudget + 500000;

        console.log(`Tampering with project budget: ₹${oldBudget.toLocaleString()} -> ₹${newBudget.toLocaleString()}`);
        console.log('NOTE: This change is being made directly to the Project document WITHOUT updating the Hash Chain Ledger.');

        project.allocatedBudget = newBudget;
        await project.save();

        console.log('TAMPER COMPLETE.');
        console.log('Now go to the Project Detail page and click "Verify against Ledger" to see the detection in action.');
        process.exit(0);
    } catch (err) {
        console.error(err);
        process.exit(1);
    }
}

tamper();
