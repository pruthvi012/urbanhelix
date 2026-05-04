const mongoose = require('mongoose');
const Project = require('./models/Project');
require('dotenv').config();

async function fix() {
    try {
        await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/urbanhelix');
        console.log('Connected to MongoDB');

        const projects = await Project.find({ 
            status: { $in: ['approved', 'in_progress', 'verification', 'completed'] },
            projectCode: { $exists: false }
        });

        console.log(`Found ${projects.length} projects without codes.`);

        for (const p of projects) {
            const fallbackCode = 'UHX-' + p._id.toString().substring(18).toUpperCase();
            p.projectCode = fallbackCode;
            await p.save();
            console.log(`Assigned code ${fallbackCode} to project: ${p.title}`);
        }

        process.exit(0);
    } catch (err) {
        console.error(err);
        process.exit(1);
    }
}

fix();
