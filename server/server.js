const express = require('express');
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
const Ward = require('./models/Ward');

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

connectDB().then(async () => {
    // Seed Wards if empty
    try {
        const count = await Ward.countDocuments();
        if (count === 0) {
            console.log('🌱 Seeding wards...');
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
            console.log('✅ Successfully seeded Wards!');
        }
    } catch (err) {
        console.error('❌ Ward seeding failed:', err.message);
    }

    app.listen(PORT, () => {
        console.log(`🚀 UrbanHeliX server running on port ${PORT}`);
    });
});

module.exports = app;
