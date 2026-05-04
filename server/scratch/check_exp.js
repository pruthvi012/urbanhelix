const mongoose = require('mongoose');
const path = require('path');
const Project = require('../models/Project');
require('dotenv').config({ path: path.join(__dirname, '../.env') });

async function check() {
    console.log('Connecting to:', process.env.MONGO_URI);
    await mongoose.connect(process.env.MONGO_URI);
    const p = await Project.findOne({ 'expenditures.0': { $exists: true } });
    if (p) {
        console.log('EXISTS: ' + p.title);
    } else {
        console.log('NONE');
    }
    process.exit(0);
}
check();
