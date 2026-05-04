const mongoose = require('mongoose');
const Project = require('./models/Project');
const HashChainService = require('./services/hashChainService');
const AuditLog = require('./models/AuditLog');
const User = require('./models/User');
require('dotenv').config();

async function syncExpenses() {
    try {
        await mongoose.connect(process.env.MONGO_URI);
        console.log('Connected to MongoDB');

        const projects = await Project.find({ 'expenditures.0': { $exists: true } });
        console.log(`Checking ${projects.length} projects with expenditures...`);

        for (const p of projects) {
            for (const exp of p.expenditures) {
                // Check if this expenditure has a HashChain record
                const hasRecord = await mongoose.model('HashChainRecord').findOne({
                    recordType: 'expenditure_logged',
                    'data.entryHash': exp.entryHash
                });

                if (!hasRecord) {
                    console.log(`Syncing missing expenditure log for ${p.projectCode}: ${exp.material} (₹${exp.amount})`);
                    
                    const hr = await HashChainService.addRecord(
                        'expenditure_logged',
                        { 
                            projectId: p._id, 
                            projectCode: p.projectCode, 
                            amount: exp.amount, 
                            material: exp.material, 
                            vendor: exp.vendor, 
                            entryHash: exp.entryHash, 
                            loggedBy: 'System Sync' 
                        },
                        { entityType: 'project', entityId: p._id },
                        exp.recordedBy
                    );

                    // Update project's latest hash record link
                    p.hashChainRecordId = hr._id;
                    await p.save();
                    
                    console.log(` - Created Block #${hr.sequenceNumber} for expenditure`);
                }
            }
        }

        console.log('Sync complete.');
        process.exit(0);
    } catch (err) {
        console.error(err);
        process.exit(1);
    }
}

syncExpenses();
