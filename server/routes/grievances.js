const express = require('express');
const Grievance = require('../models/Grievance');
const AuditLog = require('../models/AuditLog');
const HashChainService = require('../services/hashChainService');
const { protect, authorize } = require('../middleware/auth');
const upload = require('../middleware/upload');
const notificationService = require('../services/notificationService');

const router = express.Router();

// GET /api/grievances — list all (public)
router.get('/', async (req, res) => {
    try {
        const { project, status, page = 1, limit = 20 } = req.query;
        const filter = {};
        if (project) filter.project = project;
        if (status) filter.status = status;

        const grievances = await Grievance.find(filter)
            .populate('project', 'title status')
            .populate('citizen', 'name')
            .populate('resolution.resolvedBy', 'name')
            .sort({ createdAt: -1 })
            .skip((page - 1) * limit)
            .limit(parseInt(limit));

        const total = await Grievance.countDocuments(filter);

        res.json({ success: true, grievances, total, page: parseInt(page), totalPages: Math.ceil(total / limit) });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
});

// POST /api/grievances — file a grievance (citizen, admin)
router.post('/', protect, authorize('citizen', 'admin'), upload.single('image'), async (req, res) => {
    try {
        const { project, title, description, category, ward, wardNo, area, location } = req.body;

        const grievanceData = {
            project: project || null,
            citizen: req.user._id,
            title,
            description,
            category,
            ward,
            wardNo: wardNo ? parseInt(wardNo) : undefined,
            area,
            location: typeof location === 'string' ? JSON.parse(location) : location,
        };

        if (req.file) {
            grievanceData.imageUrl = req.file.location || `/uploads/grievances/${req.file.filename}`;
        }

        const grievance = await Grievance.create(grievanceData);

        await HashChainService.addRecord(
            'grievance_filed',
            {
                grievanceId: grievance._id,
                projectId: project,
                title,
                category,
                ward,
                wardNo,
                area,
                filedBy: req.user.name,
            },
            { entityType: 'grievance', entityId: grievance._id },
            req.user._id
        );

        await AuditLog.create({
            user: req.user._id,
            action: 'create',
            resourceType: 'grievance',
            resourceId: grievance._id,
            details: `Grievance "${title}" filed`,
        });

        res.status(201).json({ success: true, grievance });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
});

// PUT /api/grievances/:id/vote
router.put('/:id/vote', protect, async (req, res) => {
    try {
        const { type } = req.body; // 'upvote' or 'downvote'
        const grievance = await Grievance.findById(req.params.id);
        if (!grievance) return res.status(404).json({ success: false, message: 'Grievance not found' });

        const userId = req.user._id;

        if (type === 'upvote') {
            // Remove from downvotes if present, add to upvotes
            grievance.downvotes = grievance.downvotes.filter(id => id.toString() !== userId.toString());
            if (!grievance.upvotes.some(id => id.toString() === userId.toString())) {
                grievance.upvotes.push(userId);
            }
        } else {
            grievance.upvotes = grievance.upvotes.filter(id => id.toString() !== userId.toString());
            if (!grievance.downvotes.some(id => id.toString() === userId.toString())) {
                grievance.downvotes.push(userId);
            }
        }

        await grievance.save();
        res.json({ success: true, grievance });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
});

// PUT /api/grievances/:id/resolve  
router.put('/:id/resolve', protect, authorize('engineer', 'admin'), async (req, res) => {
    try {
        const grievance = await Grievance.findById(req.params.id);
        if (!grievance) return res.status(404).json({ success: false, message: 'Grievance not found' });

        const { status, remarks } = req.body;
        grievance.status = status;
        grievance.resolution = {
            resolvedBy: req.user._id,
            resolvedAt: new Date(),
            remarks: remarks || '',
        };
        await grievance.save();

        // Notify the citizen
        await notificationService.notifyGrievanceResolution(grievance, status);

        res.json({ success: true, grievance });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
});

module.exports = router;
