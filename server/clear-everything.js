const mongoose = require('mongoose');
const fs = require('fs');
const path = require('path');
const Project = require('./models/Project');
const Milestone = require('./models/Milestone');
const FundTransaction = require('./models/FundTransaction');
const Grievance = require('./models/Grievance');
const HashChainRecord = require('./models/HashChainRecord');
const AuditLog = require('./models/AuditLog');
const Notification = require('./models/Notification');
const Department = require('./models/Department');
require('dotenv').config();

async function clearEverything() {
    try {
        console.log('Connecting to local MongoDB...');
        await mongoose.connect(process.env.MONGO_URI || 'mongodb://127.0.0.1:27017/urbanhelix');
        console.log('✅ Connected to MongoDB.');

        // 1. Delete all transactional data
        const pResult = await Project.deleteMany({});
        console.log(`🗑️  Deleted ${pResult.deletedCount} projects.`);

        const mResult = await Milestone.deleteMany({});
        console.log(`🗑️  Deleted ${mResult.deletedCount} milestones.`);

        const fResult = await FundTransaction.deleteMany({});
        console.log(`🗑️  Deleted ${fResult.deletedCount} fund transactions.`);

        const gResult = await Grievance.deleteMany({});
        console.log(`🗑️  Deleted ${gResult.deletedCount} grievances.`);

        const hResult = await HashChainRecord.deleteMany({});
        console.log(`🗑️  Deleted ${hResult.deletedCount} hashchain records.`);

        const aResult = await AuditLog.deleteMany({});
        console.log(`🗑️  Deleted ${aResult.deletedCount} audit logs.`);

        const nResult = await Notification.deleteMany({});
        console.log(`🗑️  Deleted ${nResult.deletedCount} notifications.`);

        // 2. Reset department allocations & spending to 0
        const dResult = await Department.updateMany(
            {},
            { $set: { allocatedBudget: 0, spentBudget: 0 } }
        );
        console.log(`🏛️  Reset allocation and spending to 0 for ${dResult.modifiedCount} departments.`);

        // 3. Clear file uploads
        const uploadsDir = path.join(__dirname, 'uploads', 'projects');
        if (fs.existsSync(uploadsDir)) {
            const files = fs.readdirSync(uploadsDir);
            let count = 0;
            for (const file of files) {
                if (file !== '.gitkeep') {
                    const filePath = path.join(uploadsDir, file);
                    if (fs.statSync(filePath).isFile()) {
                        fs.unlinkSync(filePath);
                        count++;
                    }
                }
            }
            console.log(`🗑️  Deleted ${count} uploaded files/invoices locally.`);
        }

        console.log('\n✨ All data successfully cleared! The system is now a brand new project.');
        process.exit(0);
    } catch (err) {
        console.error('❌ Error during cleanup:', err.message);
        process.exit(1);
    }
}

clearEverything();
