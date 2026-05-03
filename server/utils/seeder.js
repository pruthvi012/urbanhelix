const Ward = require('../models/Ward');
const Department = require('../models/Department');

const seedWards = [
    { wardNo: 156, name: 'Kempapura Agrahara', assemblyConstituency: 'Vijayanagar AC (167)', areas: ['RPC Layout', 'Binny Layout', 'Hosahalli Main Road'] },
    { wardNo: 157, name: 'Vijayanagar', assemblyConstituency: 'Vijayanagar AC (167)', areas: ['1st Stage', '2nd Stage', 'MC Layout', 'Maruti Mandir'] },
    { wardNo: 161, name: 'Hosahalli', assemblyConstituency: 'Govindaraja Nagar AC (166)', areas: ['Hosahalli', 'MC Layout Part', 'Pipe Line Road'] },
    { wardNo: 165, name: 'Ganesh Mandir', assemblyConstituency: 'Padmanaba Nagar AC (171)', areas: ['Banashankari 3rd Stage', 'Kamakya Theater Area', 'Devegowda Petrol Bunk Road'] },
    { wardNo: 166, name: 'Kariyanapalya', assemblyConstituency: 'C V Raman Nagar AC (161)', areas: ['Kariyanapalya Main', 'Banaswadi Railway Crossing', 'Kacharakanahalli'] },
    { wardNo: 167, name: 'Yediyur', assemblyConstituency: 'Padmanaba Nagar AC (171)', areas: ['Yediyur Lake Area', 'Jayanagar 6th Block', 'South End Circle'] },
    { wardNo: 168, name: 'Pattabhiram Nagar', assemblyConstituency: 'Jayanagar AC (173)', areas: ['Jayanagar 4th Block', 'Jayanagar 5th Block', 'Pattabhiram Nagar'] },
    { wardNo: 169, name: 'Byrasandra', assemblyConstituency: 'Jayanagar AC (173)', areas: ['Byrasandra Main', 'Jayanagar 1st Block', 'Someshwaranagar'] },
    { wardNo: 170, name: 'Jayanagar East', assemblyConstituency: 'Jayanagar AC (173)', areas: ['Jayanagar 3rd Block East', 'LIC Colony', 'Ashoka Pillar'] },
    { wardNo: 171, name: 'Gurappanapalya', assemblyConstituency: 'BTM Layout AC (172)', areas: ['Gurappanapalya', 'BTM 1st Stage', 'Jayadeva Area'] }
];

const seedDepartments = [
    { name: 'BBMP Major Roads - South Zone', ward: 'General', totalBudget: 500000000, description: 'Maintenance and construction of major arterial roads' },
    { name: 'BBMP Storm Water Drains (SWD)', ward: 'General', totalBudget: 300000000, description: 'Drainage and flood prevention infrastructure' },
    { name: 'BBMP Solid Waste Management (SWM)', ward: 'General', totalBudget: 200000000, description: 'Waste collection and processing plants' },
    { name: 'BBMP Parks & Lakes', ward: 'General', totalBudget: 150000000, description: 'Beautification and maintenance of public green spaces' },
    { name: 'BBMP Health & Education', ward: 'General', totalBudget: 100000000, description: 'Public hospitals and BBMP schools' },
    { name: 'Ward Development - Yediyur (#167)', ward: 'Yediyur', wardNo: 167, totalBudget: 50000000, description: 'Specific development fund for Ward 167' },
    { name: 'Ward Development - Vijayanagar (#157)', ward: 'Vijayanagar', wardNo: 157, totalBudget: 45000000, description: 'Specific development fund for Ward 157' }
];

const seedAll = async () => {
    try {
        console.log('🚀 Seeder started...');
        // 1. Seed Wards - Force re-seed if we don't have our core 10 wards
        const wardCount = await Ward.countDocuments();
        console.log(`📊 Current Ward count: ${wardCount}`);
        if (wardCount < 10) {
            console.log('🌱 Insufficient wards found. Refreshing ward data...');
            await Ward.deleteMany({});
            console.log('🧹 Old wards cleared.');
            const insertedWards = await Ward.insertMany(seedWards);
            console.log(`✅ ${insertedWards.length} Wards seeded and verified!`);
        }

        // 2. Seed Departments - Force re-seed if we have fewer than 5 departments
        const deptCount = await Department.countDocuments();
        console.log(`📊 Current Department count: ${deptCount}`);
        if (deptCount < 5) {
            console.log('🌱 Insufficient departments found. Refreshing department data...');
            await Department.deleteMany({});
            console.log('🧹 Old departments cleared.');
            const insertedDepts = await Department.insertMany(seedDepartments);
            console.log(`✅ ${insertedDepts.length} Departments seeded and verified!`);
        }

        console.log('🏁 Data seeding verification complete.');
    } catch (err) {
        console.error('❌ Seeding failed at stage:', err.message);
        throw err; // Re-throw to be caught by server.js
    }
};

module.exports = { seedAll };
