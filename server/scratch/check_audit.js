const mongoose = require('mongoose');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '../.env') });

const auditSchema = new mongoose.Schema({}, { strict: false, collection: 'auditlogs' });
const AuditLog = mongoose.model('AuditListAll', auditSchema);

async function checkAudit() {
    try {
        await mongoose.connect(process.env.MONGO_URI);
        const r = await AuditLog.find().sort({ createdAt: -1 }).limit(10);
        console.log('Recent Audit Logs:');
        r.forEach(x => console.log(`- Action: ${x.action} | Date: ${x.createdAt} | Details: ${x.details}`));
        await mongoose.disconnect();
    } catch (err) { console.error(err); }
}

checkAudit();
