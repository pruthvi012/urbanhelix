const mongoose = require('mongoose');
const Project = require('./server/models/Project');
require('dotenv').config({ path: './server/.env' });

async function tamper() {
    try {
        await mongoose.connect(process.env.MONGO_URI);
        console.log('✅ Connected to MongoDB');

        // Find a project with expenditures
        const project = await Project.findOne({ 'expenditures.0': { $exists: true } });

        if (!project) {
            console.log('❌ No project with expenditures found. Please log an expense first.');
            process.exit(0);
        }

        console.log(`🔍 Found Project: ${project.title} (${project._id})`);
        const originalAmount = project.expenditures[0].amount;
        const tamperedAmount = originalAmount + 5000;

        console.log(`🛠️ Tampering: Changing expenditure amount from ₹${originalAmount} to ₹${tamperedAmount}`);
        
        // Manually update the amount in the database WITHOUT updating the entryHash
        project.expenditures[0].amount = tamperedAmount;
        
        // Save the project - this will bypass our normal 'calculateEntryHash' logic because we are directly editing the field
        await project.save();

        console.log('🚨 TAMPER COMPLETE!');
        console.log('Go to the Project Details page in the UI to see the warning message.');
        
        process.exit(0);
    } catch (err) {
        console.error('❌ Error:', err);
        process.exit(1);
    }
}

tamper();
