const mongoose = require('mongoose');
const dotenv = require('dotenv');
const User = require('./models/User');
const Project = require('./models/Project');
const Milestone = require('./models/Milestone');
const notificationService = require('./services/notificationService');

dotenv.config();

const triggerDemo = async () => {
    try {
        await mongoose.connect(process.env.MONGO_URI);
        console.log('✅ Connected to MongoDB');

        // 1. Find the Engineer and Contractor from seed
        const engineer = await User.findOne({ email: 'rajesh.engineer@urbanhelix.gov' });
        const contractor = await User.findOne({ email: 'vikram@contractor.com' });
        const citizen = await User.findOne({ email: 'ananya@citizen.com' });

        if (!engineer || !contractor) {
            console.log('❌ Seed users not found. Please run npm run seed first.');
            process.exit(1);
        }

        // 2. Find a project
        const project = await Project.findOne();
        if (!project) {
            console.log('❌ No projects found.');
            process.exit(1);
        }

        console.log(`\n🔔 TRIGGERING DEMO NOTIFICATIONS...\n`);

        // DEMO 1: Contractor submits milestone -> Engineer gets notified
        console.log(`1. Simulating Milestone Submission for project: ${project.title}`);
        const tempMilestone = { project: project._id, milestoneNumber: 1, title: 'Initial Excavation', amount: 50000 };
        await notificationService.notifyMilestoneSubmission(tempMilestone, project.title, engineer._id);
        console.log(`✅ Notification sent to Engineer (${engineer.name})`);

        // DEMO 2: Engineer reviews milestone -> Contractor gets notified
        console.log(`2. Simulating Milestone Approval`);
        await notificationService.notifyMilestoneUpdate({ ...tempMilestone, submittedBy: contractor._id }, project.title, 'approved');
        console.log(`✅ Notification sent to Contractor (${contractor.name})`);

        // DEMO 3: Admin revises budget -> Citizen gets notified
        console.log(`3. Simulating Budget Revision`);
        await notificationService.notifyBudgetChange(project._id, project.title, 1000000, 1200000, citizen._id, true);
        console.log(`✅ Notification sent to Citizen (${citizen.name})`);

        console.log(`\n🎉 ALL DEMO NOTIFICATIONS TRIGGERED SUCCESSFULLY!`);
        console.log(`Check the Notification Bell in the UI for these users.`);
        
        process.exit(0);
    } catch (error) {
        console.error('❌ Demo failed:', error);
        process.exit(1);
    }
};

triggerDemo();
