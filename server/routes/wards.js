const express = require('express');
const router = express.Router();
const Ward = require('../models/Ward');

// Get all wards with their areas
router.get('/', async (req, res) => {
    try {
        let wards = await Ward.find().sort({ name: 1 });
        
        if (wards.length === 0) {
            console.log('⚠️ Emergency Inline Seeding starting...');
            const seedData = [
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
            await Ward.insertMany(seedData);
            wards = await Ward.find().sort({ name: 1 });
            console.log('✅ Emergency Inline Seeding complete.');
        }
        
        res.json({ wards });
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
});

// Seed wards directly via API (for production ease)
const { seedAll } = require('../utils/seeder');
router.get('/seed', async (req, res) => {
    try {
        await seedAll();
        const wards = await Ward.find().sort({ name: 1 });
        res.json({ message: 'Seeding process triggered!', count: wards.length, wards });
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
});

module.exports = router;
