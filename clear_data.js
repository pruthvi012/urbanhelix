require('dotenv').config({ path: 'server/.env' });
const mongoose = require('mongoose');

// Import models
const Project = require('./server/models/Project');
const AuditLog = require('./server/models/AuditLog');
const Notification = require('./server/models/Notification');
const HashChainRecord = require('./server/models/HashChainRecord');
const FundTransaction = require('./server/models/FundTransaction');
const Grievance = require('./server/models/Grievance');
const Milestone = require('./server/models/Milestone');
const BlockchainQueue = require('./server/models/BlockchainQueue');

async function cleanData() {
    try {
        console.log('Connecting to MongoDB...');
        await mongoose.connect(process.env.MONGO_URI);
        console.log('Connected ✅\n');

        console.log('Clearing old test data...');
        
        await Project.deleteMany({});
        console.log('🗑️  Projects & Expenditures cleared');
        
        await AuditLog.deleteMany({});
        console.log('🗑️  Audit Logs cleared');
        
        await Notification.deleteMany({});
        console.log('🗑️  Notifications cleared');
        
        await HashChainRecord.deleteMany({});
        console.log('🗑️  HashChain records cleared');
        
        await FundTransaction.deleteMany({});
        console.log('🗑️  Fund Transactions cleared');
        
        await Grievance.deleteMany({});
        console.log('🗑️  Grievances cleared');
        
        await Milestone.deleteMany({});
        console.log('🗑️  Milestones cleared');
        
        await BlockchainQueue.deleteMany({});
        console.log('🗑️  BlockchainQueue cleared');

        console.log('\n✅ Cleanup complete! Your system is now completely fresh for the demo.');
        console.log('⚠️  User accounts were NOT deleted. You can still login normally.');
        
        process.exit(0);
    } catch (error) {
        console.error('Error during cleanup:', error);
        process.exit(1);
    }
}

cleanData();
