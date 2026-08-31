const express = require('express');
const cors = require('cors');
const connectDB = require('../server/config/db.js');

// Register all Mongoose models to prevent missing schema errors during populates
require('../server/models/User');
require('../server/models/Department');
require('../server/models/Project');
require('../server/models/Milestone');
require('../server/models/FundTransaction');
require('../server/models/Grievance');
require('../server/models/HashChainRecord');
require('../server/models/AuditLog');
require('../server/models/Ward');
require('../server/models/ProjectAsset');
require('../server/models/Notification');

const app = express();
app.use(cors({ origin: '*' }));
// app.use(express.json());
// app.use(express.urlencoded());

// Fix Vercel URL prefix stripping
app.use((req, res, next) => {
  if (!req.url.startsWith('/api')) {
    req.url = '/api' + (req.url.startsWith('/') ? '' : '/') + req.url;
  }
  next();
});

// Lazy-load routes to prevent cold-start crashes
app.use('/api/auth', (req, res, next) => require('../server/routes/auth.js')(req, res, next));
app.use('/api/departments', (req, res, next) => require('../server/routes/departments.js')(req, res, next));
app.use('/api/projects', (req, res, next) => require('../server/routes/projects.js')(req, res, next));
app.use('/api/milestones', (req, res, next) => require('../server/routes/milestones.js')(req, res, next));
app.use('/api/funds', (req, res, next) => require('../server/routes/funds.js')(req, res, next));
app.use('/api/grievances', (req, res, next) => require('../server/routes/grievances.js')(req, res, next));
app.use('/api/audit', (req, res, next) => require('../server/routes/audit.js')(req, res, next));
app.use('/api/notifications', (req, res, next) => require('../server/routes/notifications.js')(req, res, next));
app.use('/api/wards', (req, res, next) => require('../server/routes/wards.js')(req, res, next));
app.use('/api/ai', (req, res, next) => require('../server/routes/ai.js')(req, res, next));



module.exports = async function handler(req, res) {
  try {
    await connectDB();
    return app(req, res);
  } catch (err) {
    console.error('API handler error:', err);
    res.status(500).json({ success: false, message: err.message });
  }
};
