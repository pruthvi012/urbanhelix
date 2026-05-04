const mongoose = require('mongoose');
const Project = require('../server/models/Project');
require('dotenv').config({ path: '../server/.env' });

async function check() {
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
