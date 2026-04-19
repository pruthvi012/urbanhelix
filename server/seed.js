const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const dotenv = require('dotenv');
const User = require('./models/User');
const Department = require('./models/Department');
const Project = require('./models/Project');
const Milestone = require('./models/Milestone');
const FundTransaction = require('./models/FundTransaction');
const Grievance = require('./models/Grievance');
const HashChainRecord = require('./models/HashChainRecord');
const AuditLog = require('./models/AuditLog');
const BlockchainService = require('./services/blockchainService');

dotenv.config();

const sleep = (ms) => new Promise(resolve => setTimeout(resolve, ms));

const seed = async () => {
    try {
        await mongoose.connect(process.env.MONGO_URI);
        console.log('✅ Connected to MongoDB');

        // Clear existing data
        await User.deleteMany();
        await Department.deleteMany();
        await Project.deleteMany();
        await Milestone.deleteMany();
        await FundTransaction.deleteMany();
        await Grievance.deleteMany();
        await HashChainRecord.deleteMany();
        await AuditLog.deleteMany();
        console.log('🗑️  Cleared existing data');

        const salt = await bcrypt.genSalt(10);
        const adminPassword = await bcrypt.hash('password123', salt);

        // 1. Create Users
        const users = await User.insertMany([
            { name: 'Admin Singh', email: 'admin@urbanhelix.gov', password: adminPassword, role: 'admin', phone: '9876543210' },
            { name: 'Rajesh Kumar', email: 'rajesh.engineer@urbanhelix.gov', password: adminPassword, role: 'engineer', phone: '9876543211' },
            { name: 'Vikram Mehta', email: 'vikram@contractor.com', password: adminPassword, role: 'contractor', phone: '9876543212' },
            { name: 'Sunita Sharma', email: 'sunita.finance@urbanhelix.gov', password: adminPassword, role: 'financial_officer', phone: '9876543213' },
            { name: 'Ananya Das', email: 'ananya@citizen.com', password: adminPassword, role: 'citizen', phone: '9876543214' }
        ]);
        console.log('👥 Created users');

        // 2. Create Departments & Blockchain Budgets
        const deptsData = [
            { name: 'K.P. Agrahara PWD', ward: '144', totalBudget: 100000000, fiscalYear: '2025-2026' },
            { name: 'Vijayanagar PWD', ward: '145', totalBudget: 150000000, fiscalYear: '2025-2026' },
            { name: 'Hosahalli PWD', ward: '146', totalBudget: 150000000, fiscalYear: '2025-2026' },
            { name: 'Hampinagar PWD', ward: '147', totalBudget: 100000000, fiscalYear: '2025-2026' },
            { name: 'New Guddadahalli PWD', ward: '148', totalBudget: 150000000, fiscalYear: '2025-2026' },
            { name: 'Gali Anjaneya PWD', ward: '149', totalBudget: 200000000, fiscalYear: '2025-2026' },
            { name: 'Attiguppe PWD', ward: '150', totalBudget: 150000000, fiscalYear: '2025-2026' },
            { name: 'Deepanjalinagar PWD', ward: '151', totalBudget: 150000000, fiscalYear: '2025-2026' },
            { name: 'Avalahalli PWD', ward: '152', totalBudget: 100000000, fiscalYear: '2025-2026' },
            { name: 'Venkateshwara Area PWD', ward: '189', totalBudget: 50000000, fiscalYear: '2025-2026' }
        ];

        const departments = [];
        for (const d of deptsData) {
            const dept = await Department.create(d);
            await sleep(1000); // Wait for nonce to settle
            console.log(`🏛️  Creating on-chain budget for ${dept.name}...`);
            try {
                const receipt = await BlockchainService.createBudget(
                    dept._id.toString(),
                    dept.name,
                    dept.totalBudget,
                    dept.fiscalYear
                );
                dept.transactionHash = receipt.hash;
                await dept.save();
            } catch (e) { console.error(`Failed to seed blockchain for ${dept.name}`); }
            departments.push(dept);
        }

        // 3. Create Projects & Blockchain Registration
        const projectData = [
            {
                title: 'Gali Anjaneya Temple Area Maintenance',
                description: 'Maintenance work for Gali Anjaneya Temple area.',
                category: 'road',
                department: departments[5]._id,
                proposedBy: users[0]._id,
                estimatedBudget: 1000000,
                status: 'in_progress',
                priority: 'medium'
            },
            {
                title: 'Deepanjalinagar Maintenance',
                description: 'Maintenance work at Deepanjalinagar.',
                category: 'road',
                department: departments[7]._id,
                proposedBy: users[0]._id,
                estimatedBudget: 700000,
                status: 'in_progress',
                priority: 'medium'
            },
            {
                title: 'Venkateshwara Area Maintenance',
                description: 'Maintenance work at Venkateshwara area.',
                category: 'road',
                department: departments[9]._id,
                proposedBy: users[0]._id,
                estimatedBudget: 1200000,
                status: 'approved',
                priority: 'high'
            },
            {
                title: 'Gali Anjaneya Additional Works',
                description: 'Additional civil works at Gali Anjaneya.',
                category: 'road',
                department: departments[5]._id,
                proposedBy: users[0]._id,
                estimatedBudget: 2500000,
                status: 'proposed',
                priority: 'high'
            },
            {
                title: 'K.P. Agrahara Comprehensive Maintenance',
                description: 'General maintenance work at K.P. Agrahara.',
                category: 'road',
                department: departments[0]._id,
                proposedBy: users[0]._id,
                estimatedBudget: 5500000,
                status: 'approved',
                priority: 'medium'
            },
            {
                title: 'Vijayanagar Major Maintenance',
                description: 'General maintenance work at Vijayanagar.',
                category: 'road',
                department: departments[1]._id,
                proposedBy: users[0]._id,
                estimatedBudget: 11000000,
                status: 'in_progress',
                priority: 'high'
            },
            {
                title: 'Hosahalli Major Maintenance',
                description: 'General maintenance work at Hosahalli.',
                category: 'road',
                department: departments[2]._id,
                proposedBy: users[0]._id,
                estimatedBudget: 11000000,
                status: 'approved',
                priority: 'high'
            },
            {
                title: 'Hampinagar Comprehensive Maintenance',
                description: 'General maintenance work at Hampinagar.',
                category: 'road',
                department: departments[3]._id,
                proposedBy: users[0]._id,
                estimatedBudget: 5500000,
                status: 'proposed',
                priority: 'medium'
            },
            {
                title: 'New Guddadahalli Major Works',
                description: 'General maintenance work at New Guddadahalli.',
                category: 'road',
                department: departments[4]._id,
                proposedBy: users[0]._id,
                estimatedBudget: 11000000,
                status: 'in_progress',
                priority: 'high'
            },
            {
                title: 'Gali Anjaneya Major Works',
                description: 'General maintenance work at Gali Anjaneya.',
                category: 'road',
                department: departments[5]._id,
                proposedBy: users[0]._id,
                estimatedBudget: 11000000,
                status: 'in_progress',
                priority: 'high'
            },
            {
                title: 'Attiguppe Major Maintenance',
                description: 'General maintenance work at Attiguppe.',
                category: 'road',
                department: departments[6]._id,
                proposedBy: users[0]._id,
                estimatedBudget: 11000000,
                status: 'approved',
                priority: 'high'
            },
            {
                title: 'Deepanjalinagar Major Works',
                description: 'General maintenance work at Deepanjalinagar.',
                category: 'road',
                department: departments[7]._id,
                proposedBy: users[0]._id,
                estimatedBudget: 11000000,
                status: 'proposed',
                priority: 'high'
            },
            {
                title: 'Avalahalli Comprehensive Maintenance',
                description: 'General maintenance work at Avalahalli.',
                category: 'road',
                department: departments[8]._id,
                proposedBy: users[0]._id,
                estimatedBudget: 5500000,
                status: 'in_progress',
                priority: 'medium'
            }
        ];

        for (const p of projectData) {
            const project = await Project.create(p);
            await sleep(1000);
            console.log(`🏗️  Registering project on-chain: ${project.title}...`);
            try {
                const receipt = await BlockchainService.createProject(
                    project._id.toString(),
                    project.title,
                    project.department.toString(),
                    project.estimatedBudget,
                    'HASH-' + project._id
                );
                project.transactionHash = receipt.hash;
                project.blockchainId = receipt.blockchainId;
                await project.save();

                if (project.status !== 'proposed' && project.blockchainId !== null) {
                    await sleep(1000);
                    console.log(`⚖️  Updating on-chain status for ${project.title} to ${project.status}...`);
                    const approveReceipt = await BlockchainService.updateProjectStatus(
                        project.blockchainId,
                        project.status === 'approved' ? 'approved' : 'in_progress',
                        'Seeded initial status'
                    );
                    project.lastTransactionHash = approveReceipt.hash;
                    await project.save();
                }
            } catch (e) { console.error(`Failed to register ${project.title} on-chain`, e); }
        }

        console.log('\n🎉 Seed completed successfully with Blockchain sync!');
        process.exit(0);
    } catch (error) {
        console.error('\n❌ Seed failed:', error);
        process.exit(1);
    }
};

seed();
