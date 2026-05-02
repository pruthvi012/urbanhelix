const express = require('express');
const router = express.Router();
const Ward = require('../models/Ward');

// Get all wards with their areas
router.get('/', async (req, res) => {
    try {
        const wards = await Ward.find().sort({ name: 1 });
        res.json({ wards });
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
});

module.exports = router;
