const mongoose = require('mongoose');
const Department = require('./models/Department');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '.env') });

const southWards = ['Jayanagar', 'Basavanagudi', 'Padmanabhanagar', 'BTM Layout', 'Chickpet', 'Chamarajpet'];

const cleanup = async () => {
    try {
        if (!process.env.MONGO_URI) {
            console.error('MONGO_URI not found in .env');
            process.exit(1);
        }
        await mongoose.connect(process.env.MONGO_URI);
        console.log('Connected to MongoDB');
        
        // Remove Avalahalli, Deepanjali Nagar specifically, and any other non-South wards
        const result = await Department.deleteMany({ ward: { $nin: southWards } });
        console.log(`✅ Cleanup successful. Removed ${result.deletedCount} non-South wards.`);
        
        // Ensure South Wards exist (just in case they were deleted)
        const existing = await Department.find({ ward: { $in: southWards } });
        if (existing.length === 0) {
            console.log('South wards missing, re-seeding...');
            const wards = [
                { name: 'Roads & Infra', ward: 'Jayanagar', totalBudget: 20000000, allocatedBudget: 12000000, spentBudget: 9500000 },
                { name: 'Water Supply', ward: 'Basavanagudi', totalBudget: 15000000, allocatedBudget: 10000000, spentBudget: 7800000 },
                { name: 'Sanitation', ward: 'Padmanabhanagar', totalBudget: 25000000, allocatedBudget: 15000000, spentBudget: 11500000 },
                { name: 'Parks', ward: 'BTM Layout', totalBudget: 18000000, allocatedBudget: 11000000, spentBudget: 8500000 },
                { name: 'Public Works', ward: 'Chickpet', totalBudget: 22000000, allocatedBudget: 14000000, spentBudget: 25000000 },
                { name: 'Electricity', ward: 'Chamarajpet', totalBudget: 12000000, allocatedBudget: 9000000, spentBudget: 7500000 }
            ];
            await Department.insertMany(wards);
            console.log('✅ South Zone Wards Restored');
        }

        process.exit(0);
    } catch (err) {
        console.error('❌ Cleanup failed:', err);
        process.exit(1);
    }
};

cleanup();
