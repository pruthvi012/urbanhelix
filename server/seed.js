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
            { name: 'Kempapura Agrahara PWD', ward: 'Kempapura Agrahara', wardNo: 156, totalBudget: 100000000, fiscalYear: '2025-2026' },
            { name: 'Vijayanagar Water Supply', ward: 'Vijayanagar', wardNo: 157, totalBudget: 150000000, fiscalYear: '2025-2026' },
            { name: 'Hosahalli Sanitation', ward: 'Hosahalli', wardNo: 158, totalBudget: 150000000, fiscalYear: '2025-2026' },
            { name: 'Hampi Nagar Parks', ward: 'Hampi Nagar', wardNo: 159, totalBudget: 100000000, fiscalYear: '2025-2026' },
            { name: 'Bapuji Nagar Public Works', ward: 'Bapuji Nagar', wardNo: 160, totalBudget: 150000000, fiscalYear: '2025-2026' },
            { name: 'Gali Anjenaya Temple Roads', ward: 'Gali Anjenaya Temple Ward', wardNo: 162, totalBudget: 200000000, fiscalYear: '2025-2026' },
            { name: 'Attiguppe Electricity', ward: 'Attiguppe', wardNo: 161, totalBudget: 150000000, fiscalYear: '2025-2026' },
            { name: 'Veerabhadranagar Water Supply', ward: 'Veerabhadranagar', wardNo: 163, totalBudget: 150000000, fiscalYear: '2025-2026' },
            { name: 'Avalahalli Sanitation', ward: 'Avalahalli', wardNo: 164, totalBudget: 100000000, fiscalYear: '2025-2026' },
            { name: 'Sudham Nagara PWD', ward: 'Sudham Nagara', wardNo: 171, totalBudget: 80000000, fiscalYear: '2025-2026' },
            { name: 'Koramangala Smart City', ward: 'Koramangala', wardNo: 186, totalBudget: 300000000, fiscalYear: '2025-2026' },
            { name: 'BTM Layout Roads', ward: 'BTM Layout', wardNo: 192, totalBudget: 120000000, fiscalYear: '2025-2026' }
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
                title: 'Gali Anjenaya Temple Road Repair',
                description: 'Urgent road repairs near Gali Anjenaya Temple.',
                category: 'road',
                department: departments[6]._id,
                proposedBy: users[0]._id,
                estimatedBudget: 1000000,
                status: 'in_progress',
                priority: 'medium',
                location: { ward: 'Gali Anjenaya Temple Ward', wardNo: 162, area: 'Gali Anjaneya Temple area', address: 'Mysore Road' }
            },
            {
                title: 'Veerabhadranagar Maintenance',
                description: 'Maintenance work at Veerabhadranagar.',
                category: 'road',
                department: departments[7]._id,
                proposedBy: users[0]._id,
                estimatedBudget: 700000,
                status: 'in_progress',
                priority: 'medium',
                location: { ward: 'Veerabhadranagar', wardNo: 163, area: 'Veerabhadranagar', address: 'Main Road' }
            },
            {
                title: 'Suddagunte Palya Maintenance',
                description: 'Maintenance work at Suddagunte Palya area.',
                category: 'road',
                department: departments[9]._id,
                proposedBy: users[0]._id,
                estimatedBudget: 1200000,
                status: 'approved',
                priority: 'high',
                location: { ward: 'Suddagunte Palya', wardNo: 189, area: 'S G Palya', address: 'Tavarekere' }
            },
            {
                title: 'Gali Anjenaya Temple Ward Additional Works',
                description: 'Additional civil works at Gali Anjenaya Temple Ward.',
                category: 'road',
                department: departments[5]._id,
                proposedBy: users[0]._id,
                estimatedBudget: 2500000,
                status: 'proposed',
                priority: 'high',
                location: { ward: 'Gali Anjenaya Temple Ward', wardNo: 162, area: 'Mysore Road', address: 'Back Road' }
            },
            {
                title: 'Kempapura Agrahara Comprehensive Maintenance',
                description: 'General maintenance work at Kempapura Agrahara.',
                category: 'road',
                department: departments[0]._id,
                proposedBy: users[0]._id,
                estimatedBudget: 5500000,
                status: 'approved',
                priority: 'medium',
                location: { ward: 'Kempapura Agrahara', wardNo: 156, area: 'RPC Layout', address: 'Hosahalli Main Road' }
            },
            {
                title: 'Vijayanagar Major Maintenance',
                description: 'General maintenance work at Vijayanagar.',
                category: 'road',
                department: departments[1]._id,
                proposedBy: users[0]._id,
                estimatedBudget: 11000000,
                status: 'in_progress',
                priority: 'high',
                location: { ward: 'Vijayanagar', wardNo: 157, area: '1st Stage', address: 'MC Layout' }
            },
            {
                title: 'Hosahalli Major Maintenance',
                description: 'General maintenance work at Hosahalli.',
                category: 'road',
                department: departments[2]._id,
                proposedBy: users[0]._id,
                estimatedBudget: 11000000,
                status: 'approved',
                priority: 'high',
                location: { ward: 'Hosahalli', wardNo: 158, area: 'Hosahalli', address: 'Pipeline Road' }
            },
            {
                title: 'Hampi Nagar Comprehensive Maintenance',
                description: 'General maintenance work at Hampi Nagar.',
                category: 'road',
                department: departments[3]._id,
                proposedBy: users[0]._id,
                estimatedBudget: 5500000,
                status: 'proposed',
                priority: 'medium',
                location: { ward: 'Hampi Nagar', wardNo: 159, area: 'RPC Layout', address: 'Attiguppe' }
            },
            {
                title: 'Bapuji Nagar Major Works',
                description: 'General maintenance work at Bapuji Nagar.',
                category: 'road',
                department: departments[4]._id,
                proposedBy: users[0]._id,
                estimatedBudget: 11000000,
                status: 'in_progress',
                priority: 'high',
                location: { ward: 'Bapuji Nagar', wardNo: 160, area: 'New Guddadahalli', address: 'Bapuji Nagar Main Road' }
            },
            {
                title: 'Avalahalli Comprehensive Maintenance',
                description: 'General maintenance work at Avalahalli.',
                category: 'road',
                department: departments[8]._id,
                proposedBy: users[0]._id,
                estimatedBudget: 5500000,
                status: 'in_progress',
                priority: 'medium',
                location: { ward: 'Avalahalli', wardNo: 164, area: 'Avalahalli', address: 'Muneshwara Block' }
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
