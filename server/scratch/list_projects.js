const mongoose = require('mongoose');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '../.env') });

const projectSchema = new mongoose.Schema({}, { strict: false, collection: 'projects' });
const Project = mongoose.model('ProjectList', projectSchema);

async function listProjects() {
    try {
        await mongoose.connect(process.env.MONGO_URI);
        const projects = await Project.find().sort({ createdAt: -1 }).limit(10);
        console.log('Recent Projects:');
        projects.forEach(p => console.log(`- ${p.title} (ID: ${p._id}, Created: ${p.createdAt})`));
        await mongoose.disconnect();
    } catch (err) { console.error(err); }
}

listProjects();
