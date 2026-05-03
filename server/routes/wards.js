const express = require('express');
const router = express.Router();
const Ward = require('../models/Ward');

// Get all wards with their areas
const { seedAll } = require('../utils/seeder');
router.get('/', async (req, res) => {
    try {
        let wards = await Ward.find().sort({ name: 1 });
        
        // Final fallback: if empty, try to seed right now
        if (wards.length === 0) {
            console.log('⚠️ Wards empty in route. Triggering emergency seed...');
            await seedAll();
            wards = await Ward.find().sort({ name: 1 });
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
