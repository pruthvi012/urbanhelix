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

const autoSeeder = require('./utils/autoSeeder');

connectDB().then(async () => {
    await autoSeeder();
    app.listen(PORT, () => {
        console.log(`🚀 UrbanHeliX server running on port ${PORT}`);
    });
});

module.exports = app;
