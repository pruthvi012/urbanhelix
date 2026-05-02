const mongoose = require('mongoose');
const Project = require('./models/Project');
const Department = require('./models/Department');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '.env') });

const refreshSection = async () => {
    try {
        if (!process.env.MONGO_URI) {
            console.error('MONGO_URI not found in .env');
            process.exit(1);
        }
        await mongoose.connect(process.env.MONGO_URI);
        console.log('Connected to MongoDB');

        // 1. Clear all projects
        const projResult = await Project.deleteMany({});
        console.log(`✅ Cleared ${projResult.deletedCount} projects.`);

        // 2. Reset Department budgets and locks
        // Note: totalBudget remains, but allocated and spent are reset to 0
        const deptResult = await Department.updateMany(
            {},
            {
                $set: {
                    allocatedBudget: 0,
                    spentBudget: 0,
                    isLocked: false
                }
            }
        );
        console.log(`✅ Reset budget and locks for ${deptResult.modifiedCount} wards.`);

        process.exit(0);
    } catch (err) {
        console.error('❌ Refresh failed:', err);
        process.exit(1);
    }
};

refreshSection();
