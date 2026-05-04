const express = require('express'); // UrbanHeliX Deployment Fix 04-05-2026
const mongoose = require('mongoose');
const cors = require('cors');
const path = require('path');
require('dotenv').config();

const connectDB = require('./config/db');

// Import routes
const authRoutes = require('./routes/auth');
const departmentRoutes = require('./routes/departments');
const projectRoutes = require('./routes/projects');
const milestoneRoutes = require('./routes/milestones');
const fundRoutes = require('./routes/funds');
const grievanceRoutes = require('./routes/grievances');
const auditRoutes = require('./routes/audit');
const notificationRoutes = require('./routes/notifications');
const wardRoutes = require('./routes/wards');

const app = express();

// Middleware
app.use(cors());
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: true, limit: '50mb' }));

// Static files
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

// API Routes
app.use('/api/auth', authRoutes);
app.use('/api/departments', departmentRoutes);
app.use('/api/projects', projectRoutes);
app.use('/api/milestones', milestoneRoutes);
app.use('/api/funds', fundRoutes);
app.use('/api/grievances', grievanceRoutes);
app.use('/api/audit', auditRoutes);
app.use('/api/notifications', notificationRoutes);
app.use('/api/wards', wardRoutes);

// EMERGENCY TAMPER FOR DEMO
app.get('/simulate-fraud', async (req, res) => {
    try {
        const HashChainRecord = require('./models/HashChainRecord');
        const record = await HashChainRecord.findOne().sort({ sequenceNumber: 1 });
        if (!record) return res.send("No records to tamper with.");
        record.dataHash = record.dataHash.substring(0, 63) + (record.dataHash.endsWith('f') ? 'e' : 'f');
        await record.save();
        res.send("FRAUD SIMULATED! REFRESH THE WEBSITE TO SEE THE ALERTS.");
    } catch (e) { res.send("Error: " + e.message); }
});

// RESET DEMO DATA
app.get('/reset-demo', async (req, res) => {
    try {
        const mongoose = require('mongoose');
        const Project = require('./models/Project');
        const User = require('./models/User');
        const HashChainRecord = require('./models/HashChainRecord');
        const Milestone = mongoose.model('Milestone', new mongoose.Schema({}, { strict: false, collection: 'milestones' }));
        const Fund = mongoose.model('Fund', new mongoose.Schema({}, { strict: false, collection: 'fundtransactions' }));

        await Project.deleteMany({});
        await HashChainRecord.deleteMany({});
        try { await Milestone.deleteMany({}); } catch(e) {}
        try { await Fund.deleteMany({}); } catch(e) {}
        await User.deleteMany({ role: { $in: ['contractor', 'citizen', 'financial_officer'] } });

        res.send("DEMO RESET COMPLETE! All projects, hash records, and demo accounts cleared. Admin and Engineer accounts kept.");
    } catch (e) { res.send("Error: " + e.message); }
});

// Health check
app.get('/api/health', (req, res) => {
    res.json({ status: 'ok', timestamp: new Date().toISOString() });
});



// Global error handler
app.use((err, req, res, next) => {
    console.error('❌ Error:', err.message);
    res.status(err.statusCode || 500).json({
        success: false,
        message: err.message || 'Internal Server Error',
    });
});

// Start server
const PORT = process.env.PORT || 5000;

const autoSeeder = require('./utils/autoSeeder');

connectDB().then(async () => {
    await autoSeeder();
    app.listen(PORT, () => {
        console.log(`🚀 UrbanHeliX server running on port ${PORT}`);
    });
});

module.exports = app;
