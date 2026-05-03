const mongoose = require('mongoose');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '../.env') });
const Project = require('../models/Project');
const User = require('../models/User');

async function assign() {
    try {
        await mongoose.connect(process.env.MONGO_URI);
        console.log('✅ Connected to MongoDB');

        const contractor = await User.findOne({ role: 'contractor' });
        if (!contractor) {
            console.log('❌ No contractor found in database.');
            process.exit(0);
        }

        const projects = await Project.find({});
        console.log(`🔍 Found ${projects.length} projects total.`);

        const result = await Project.updateMany(
            {}, 
            { $set: { contractor: contractor._id, status: 'approved' } }
        );

        console.log(`✅ Forced contractor (${contractor.name}) assignment to ${result.modifiedCount} projects.`);
        process.exit(0);
    } catch (err) {
        console.error('❌ Error:', err);
        process.exit(1);
    }
}

assign();
