// api/index.js
import express from 'express';
import cors from 'cors';
import { connectDB } from '../server/config/db.js';

// Import existing Express routers
import authRoutes from '../server/routes/auth.js';
import departmentRoutes from '../server/routes/departments.js';
import projectRoutes from '../server/routes/projects.js';
import milestoneRoutes from '../server/routes/milestones.js';
import fundRoutes from '../server/routes/funds.js';
import grievanceRoutes from '../server/routes/grievances.js';
import auditRoutes from '../server/routes/audit.js';
import notificationRoutes from '../server/routes/notifications.js';
import wardRoutes from '../server/routes/wards.js';
import aiRoutes from '../server/routes/ai.js';

const app = express();
app.use(cors({ origin: '*' }));
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: true, limit: '50mb' }));

// Mount routers under /api
app.use('/api/auth', authRoutes);
app.use('/api/departments', departmentRoutes);
app.use('/api/projects', projectRoutes);
app.use('/api/milestones', milestoneRoutes);
app.use('/api/funds', fundRoutes);
app.use('/api/grievances', grievanceRoutes);
app.use('/api/audit', auditRoutes);
app.use('/api/notifications', notificationRoutes);
app.use('/api/wards', wardRoutes);
app.use('/api/ai', aiRoutes);

export default async function handler(req, res) {
  try {
    await connectDB();
    return app(req, res);
  } catch (err) {
    console.error('❌ API handler error:', err);
    res.status(500).json({ success: false, message: err.message });
  }
}

