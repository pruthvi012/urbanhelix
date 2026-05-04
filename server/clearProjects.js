const mongoose = require('mongoose');
const Project = require('./models/Project');
const AuditLog = require('./models/AuditLog');
const HashChainRecord = require('./models/HashChainRecord');
const Notification = require('./models/Notification');
require('dotenv').config();

async function clearAll() {
    try {
        console.log('Connecting to MongoDB...');
        await mongoose.connect(process.env.MONGO_URI || 'mongodb://localhost:27017/urbanhelix');
        console.log('✅ Connected.');

        // 1. Delete all projects
        const pResult = await Project.deleteMany({});
        console.log(`🗑️  Deleted ${pResult.deletedCount} projects.`);

        // 2. Clean up related data (optional but recommended)
        const aResult = await AuditLog.deleteMany({ resourceType: 'project' });
        console.log(`🗑️  Deleted ${aResult.deletedCount} project-related audit logs.`);

        const hResult = await HashChainRecord.deleteMany({ 'metadata.entityType': 'project' });
        console.log(`🗑️  Deleted ${hResult.deletedCount} project-related hashchain records.`);

        const nResult = await Notification.deleteMany({ 'relatedEntity.entityType': 'Project' });
        console.log(`🗑️  Deleted ${nResult.deletedCount} project-related notifications.`);

        console.log('\n✨ Database is now clean of projects. You can start fresh!');
        process.exit(0);
    } catch (err) {
        console.error('❌ Error during cleanup:', err);
        process.exit(1);
    }
}

clearAll();
