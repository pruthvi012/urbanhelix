const mongoose = require('mongoose');
require('dotenv').config({ path: './server/.env' });

// We only need the connection to drop collections, but we list models for clarity
const Project = require('./server/models/Project');
const Grievance = require('./server/models/Grievance');
const AuditLog = require('./server/models/AuditLog');
const FundTransaction = require('./server/models/FundTransaction');
const HashChainRecord = require('./server/models/HashChainRecord');
const Milestone = require('./server/models/Milestone');
const Notification = require('./server/models/Notification');

async function cleanup() {
    try {
        await mongoose.connect(process.env.MONGO_URI);
        console.log('✅ Connected to MongoDB');

        console.log('🧹 Starting deep cleanup for fresh demo...');

        // Delete all operational data
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

        // Reset Department spending/allocation to zero (optional but recommended for clean stats)
        const Department = require('./server/models/Department');
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
