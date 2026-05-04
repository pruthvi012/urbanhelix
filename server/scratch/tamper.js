/**
 * DEMO TAMPER SCRIPT — UrbanHelixX Anti-Corruption Demo
 * 
 * This script simulates a "corrupt official" who:
 *   1. Changes a project expenditure amount in the database (bypassing the hash)
 *   2. Corrupts a HashChain record so "Verify Integrity" on the Audit page fails
 * 
 * Run from: C:\Users\pruth\Desktop\myproject\UrabanHelixX
 * Command:  node server/scratch/tamper.js
 */

const mongoose = require('mongoose');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '../.env') });

const Project = require('../models/Project');
const HashChainRecord = require('../models/HashChainRecord');
const Notification = require('../models/Notification');
const User = require('../models/User');

async function tamper() {
    try {
        await mongoose.connect(process.env.MONGO_URI);
        console.log('\n✅ Connected to MongoDB');
        console.log('🎭 Starting Tamper Simulation...\n');

        // ── STEP 1: Tamper with Project Expenditure ──────────────────────────
        const project = await Project.findOne({ 'expenditures.0': { $exists: true } });

        if (!project) {
            console.log('❌ No project with expenditures found.');
            console.log('   Please: Log an expense as Contractor first, then run this script.');
            process.exit(0);
        }

        const exp = project.expenditures[0];
        const originalAmount = exp.amount;
        const fraudAmount = originalAmount + 50000;

        console.log(`📋 Project: "${project.title}"`);
        console.log(`💰 Original Expenditure Amount: ₹${originalAmount.toLocaleString()}`);
        console.log(`🔴 Fraudulent Amount Set To:   ₹${fraudAmount.toLocaleString()}`);
        console.log(`   (entryHash NOT updated — this breaks cryptographic integrity)\n`);

        // Directly update amount WITHOUT recalculating the hash
        await Project.updateOne(
            { _id: project._id, 'expenditures._id': exp._id },
            { $set: { 'expenditures.$.amount': fraudAmount, tamperNotified: false } }
        );

        // ── STEP 2: Corrupt a HashChain Record ───────────────────────────────
        const chainRecord = await HashChainRecord.findOne({}).sort({ sequenceNumber: -1 });

        if (chainRecord) {
            console.log(`⛓️  Corrupting HashChain Block #${chainRecord.sequenceNumber}...`);
            // Replace the recordHash with a fake one — this breaks the chain
            await HashChainRecord.updateOne(
                { _id: chainRecord._id },
                { $set: { recordHash: 'TAMPERED_FAKE_HASH_' + Date.now() } }
            );
            console.log(`   Block #${chainRecord.sequenceNumber} hash is now corrupted.\n`);
        } else {
            console.log('⚠️  No HashChain records found. Audit page may not show tamper.');
            console.log('   (The notification will still work)\n');
        }

        // ── STEP 3: Send Emergency Notification to ALL Citizens ──────────────
        const citizens = await User.find({ role: 'citizen' });

        if (citizens.length === 0) {
            console.log('⚠️  No citizen accounts found. Notification skipped.');
        } else {
            for (const citizen of citizens) {
                await Notification.create({
                    recipient: citizen._id,
                    title: '🚨 FINANCIAL FRAUD ALERT',
                    message: `A security breach has been detected on project "${project.title}"! The expenditure record was tampered — ₹${originalAmount.toLocaleString()} was changed to ₹${fraudAmount.toLocaleString()}. Cryptographic audit failed. Funds may be at risk.`,
                    type: 'fraud_alert',
                    relatedEntity: { entityType: 'Project', entityId: project._id }
                });
            }
            console.log(`🔔 Emergency notification sent to ${citizens.length} citizen(s).\n`);
        }

        console.log('═══════════════════════════════════════════════════════════');
        console.log('🚨 TAMPER COMPLETE! Here is what to show the examiner:');
        console.log('═══════════════════════════════════════════════════════════');
        console.log('');
        console.log('  1️⃣  On the CITIZEN phone/browser:');
        console.log('      → Bell icon 🔔 will show "🚨 FINANCIAL FRAUD ALERT"');
        console.log('');
        console.log('  2️⃣  Go to the Audit page (any account):');
        console.log('      → Click "Verify Integrity" button');
        console.log('      → Watch it scan block by block...');
        console.log(`      → Block #${chainRecord?.sequenceNumber || '?'} will turn RED: "TAMPERED"`);
        console.log('      → Top banner: "🚨 Tampering Detected!"');
        console.log('');
        console.log('  3️⃣  On the Project Details page:');
        console.log('      → Refresh and see "🚨 TAMPER DETECTED: AUDIT FAILED" banner');
        console.log('');
        console.log('═══════════════════════════════════════════════════════════');

        process.exit(0);
    } catch (err) {
        console.error('❌ Error:', err.message);
        process.exit(1);
    }
}

tamper();
