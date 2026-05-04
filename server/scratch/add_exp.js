const mongoose = require('mongoose');
const path = require('path');
const Project = require('../models/Project');
const HashChainRecord = require('../models/HashChainRecord');
const crypto = require('crypto');
require('dotenv').config({ path: path.join(__dirname, '../.env') });

async function add() {
    await mongoose.connect(process.env.MONGO_URI);
    const p = await Project.findOne();
    if (!p) {
        console.log('No project found');
        process.exit(1);
    }

    const amount = 250000;
    const description = 'Purchase of Cement for foundations';
    const timestamp = new Date();
    
    // Create entry hash
    const entryHash = crypto.createHash('sha256')
        .update(JSON.stringify({ amount, description, timestamp }))
        .digest('hex');

    p.expenditures.push({
        amount,
        description,
        timestamp,
        entryHash,
        material: 'Cement',
        vendor: 'ACC Concrete Ltd',
        invoiceUrl: 'https://urbanhelix-uploads.s3.ap-south-1.amazonaws.com/demo-invoice.pdf',
        invoiceDate: new Date(),
        date: new Date()
    });
    
    p.spentBudget += amount;
    await p.save();

    console.log(`✅ Added valid expenditure to ${p.title}`);

    // Add to HashChain
    const lastRecord = await HashChainRecord.findOne().sort({ sequenceNumber: -1 });
    const previousHash = lastRecord ? lastRecord.recordHash : '0';
    const sequenceNumber = (lastRecord ? lastRecord.sequenceNumber : 0) + 1;
    
    const data = { projectId: p._id, amount, description };
    const dataHash = crypto.createHash('sha256').update(JSON.stringify(data)).digest('hex');
    
    const recordHash = crypto.createHash('sha256')
        .update(dataHash + previousHash + sequenceNumber)
        .digest('hex');

    await HashChainRecord.create({
        sequenceNumber,
        previousHash,
        dataHash,
        recordHash,
        recordType: 'payment_released',
        data
    });

    console.log('✅ Added to HashChain');
    process.exit(0);
}
add();
