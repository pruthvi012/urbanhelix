const mongoose = require('mongoose');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '../.env') });

const Project = require('../models/Project');
const Grievance = require('../models/Grievance');
const AuditLog = require('../models/AuditLog');
const FundTransaction = require('../models/FundTransaction');
const HashChainRecord = require('../models/HashChainRecord');
const Milestone = require('../models/Milestone');
const Notification = require('../models/Notification');
const Department = require('../models/Department');

async function cleanup() {
    try {
        console.log('🔗 Connecting to:', process.env.MONGO_URI);
        await mongoose.connect(process.env.MONGO_URI);
        console.log('✅ Connected to MongoDB');

        console.log('🧹 Starting deep cleanup for fresh demo...');

        const results = await Promise.all([
            Project.deleteMany({}),
            Grievance.deleteMany({}),
            AuditLog.deleteMany({}),
            FundTransaction.deleteMany({}),
            HashChainRecord.deleteMany({}),
            Milestone.deleteMany({}),
            Notification.deleteMany({})
        ]);

        console.log(`🗑️ Projects Deleted: ${results[0].deletedCount}`);
        console.log(`🗑️ Grievances Deleted: ${results[1].deletedCount}`);
        console.log(`🗑️ Audit Logs Deleted: ${results[2].deletedCount}`);
        console.log(`🗑️ Transactions Deleted: ${results[3].deletedCount}`);
        console.log(`🗑️ Hash Chain Records Deleted: ${results[4].deletedCount}`);
        console.log(`🗑️ Milestones Deleted: ${results[5].deletedCount}`);
        console.log(`🗑️ Notifications Deleted: ${results[6].deletedCount}`);

        await Department.updateMany({}, { $set: { allocatedBudget: 0, spentBudget: 0, isLocked: false } });
        console.log('📉 Reset all Ward/Department budgets to ₹0');

        console.log('\n✨ CLEANUP COMPLETE! Your platform is now a blank slate for the demo.');
        process.exit(0);
    } catch (err) {
        console.error('❌ Error during cleanup:', err);
        process.exit(1);
    }
}

cleanup();
