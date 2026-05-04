const mongoose = require('mongoose');
const Project = require('./models/Project');
require('dotenv').config();

async function diag() {
    try {
        await mongoose.connect(process.env.MONGO_URI || 'mongodb://localhost:27017/urbanhelix');
        console.log('Connected to MongoDB');

        const searchCode = 'UHX-58B19B';
        const suffix = '58B19B';

        const projects = await Project.find({
            $or: [
                { projectCode: /58B19B/i },
                { title: /58B19B/i },
                { description: /58B19B/i },
                { 'location.area': /58B19B/i },
                { 'location.ward': /58B19B/i }
            ]
        });
        
        // Also check if any ID contains it
        const all = await Project.find();
        const idMatch = all.filter(p => p._id.toString().toUpperCase().includes('58B19B'));
        
        console.log(`Found ${projects.length} field matches and ${idMatch.length} ID matches for 58B19B`);

        console.log(`Found ${projects.length} projects matching ${searchCode}`);
        projects.forEach(p => {
            console.log(`ID: ${p._id}, Code: ${p.projectCode}, Title: ${p.title}, Contractor: ${p.contractor}`);
        });

        const AuditLog = require('./models/AuditLog');
        const allProjects = await Project.find();
        console.log(`Listing all ${allProjects.length} projects:`);
        allProjects.forEach(p => {
            console.log(`ID: ${p._id}, Title: ${p.title}, Code: ${p.projectCode}, Status: ${p.status}`);
        });

        process.exit(0);
    } catch (err) {
        console.error(err);
        process.exit(1);
    }
}

diag();
