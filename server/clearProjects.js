const mongoose = require('mongoose');
const fs = require('fs');
const path = require('path');
const dns = require('dns');
const { Resolver } = dns.promises;
const Project = require('./models/Project');
const AuditLog = require('./models/AuditLog');
const HashChainRecord = require('./models/HashChainRecord');
const Notification = require('./models/Notification');
require('dotenv').config();

async function getDirectUri(srvUri) {
    if (!srvUri.startsWith('mongodb+srv://')) return srvUri;
    
    // Parse the SRV URI
    const match = srvUri.match(/mongodb\+srv:\/\/([^:]+):([^@]+)@([^\/]+)(.*)/);
    if (!match) return srvUri;
    
    const [_, user, pass, host, options] = match;
    const resolver = new Resolver();
    resolver.setServers(['8.8.8.8']); // Force Google DNS to bypass local DNS blocks
    
    console.log('Resolving DNS for MongoDB Atlas...');
    const srvRecords = await resolver.resolveSrv(`_mongodb._tcp.${host}`);
    const hosts = srvRecords.map(record => `${record.name}:${record.port}`).join(',');
    
    return `mongodb://${user}:${pass}@${hosts}${options}`;
}

async function clearAll() {
    try {
        const uri = await getDirectUri(process.env.MONGO_URI);
        console.log('Connecting to MongoDB...');
        
        await mongoose.connect(uri);
        console.log('✅ Connected.');

        // 1. Delete all projects
        const pResult = await Project.deleteMany({});
        console.log(`🗑️  Deleted ${pResult.deletedCount} projects.`);

        // 2. Clean up related data
        const aResult = await AuditLog.deleteMany({ resourceType: 'project' });
        console.log(`🗑️  Deleted ${aResult.deletedCount} project-related audit logs.`);

        const hResult = await HashChainRecord.deleteMany({ 'metadata.entityType': 'project' });
        console.log(`🗑️  Deleted ${hResult.deletedCount} project-related hashchain records.`);

        const nResult = await Notification.deleteMany({ 'relatedEntity.entityType': 'Project' });
        console.log(`🗑️  Deleted ${nResult.deletedCount} project-related notifications.`);

        // 3. Clear invoices/uploads
        const uploadsDir = path.join(__dirname, 'uploads', 'projects');
        if (fs.existsSync(uploadsDir)) {
            const files = fs.readdirSync(uploadsDir);
            let count = 0;
            for (const file of files) {
                if (file !== '.gitkeep') {
                    fs.unlinkSync(path.join(uploadsDir, file));
                    count++;
                }
            }
            console.log(`🗑️  Deleted ${count} uploaded files/invoices locally.`);
        }

        console.log('\n✨ Database and files are now clean of projects. You can start fresh!');
        process.exit(0);
    } catch (err) {
        console.error('❌ Error during cleanup:', err.message);
        process.exit(1);
    }
}

clearAll();
