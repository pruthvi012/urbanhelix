const mongoose = require('mongoose');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '../.env') });

const projectSchema = new mongoose.Schema({}, { strict: false, collection: 'projects' });
const Project = mongoose.model('ProjectCheck', projectSchema);

async function checkProject() {
    try {
        await mongoose.connect(process.env.MONGO_URI);
        const p = await Project.findOne({ title: /road/i });
        if (p) {
            console.log('Project: ', p.title);
            console.log('Expenditures: ', JSON.stringify(p.expenditures, null, 2));
        } else {
            console.log('Project not found');
        }
        await mongoose.disconnect();
    } catch (err) { console.error(err); }
}

checkProject();
