const mongoose = require('mongoose');
const Project = require('../models/Project');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '../.env') });

async function check() {
    await mongoose.connect(process.env.MONGO_URI);
    const project = await Project.findOne();
    console.log(JSON.stringify(project, null, 2));
    process.exit(0);
}
check();
