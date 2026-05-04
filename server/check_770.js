const mongoose = require('mongoose');
const Project = require('./models/Project');
require('dotenv').config();

async function check() {
    try {
        await mongoose.connect(process.env.MONGO_URI);
        const projects = await Project.find();
        console.log(`Listing ${projects.length} projects in Atlas:`);
        projects.forEach(p => {
            console.log(`ID: ${p._id}, Code: ${p.projectCode}, Suffix: ${p._id.toString().substring(18).toUpperCase()}, Title: ${p.title}`);
        });
        process.exit(0);
    } catch (e) {
        console.error(e);
        process.exit(1);
    }
}
check();
