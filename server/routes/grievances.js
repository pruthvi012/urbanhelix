const express = require('express');
const Grievance = require('../models/Grievance');
const AuditLog = require('../models/AuditLog');
const HashChainService = require('../services/hashChainService');
const { protect, authorize } = require('../middleware/auth');
const upload = require('../middleware/upload');
const notificationService = require('../services/notificationService');
const fs = require('fs/promises');
const path = require('path');
const { BlobServiceClient } = require('@azure/storage-blob');

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

// DELETE /api/grievances/:id — remove an invalid grievance and its evidence file
router.delete('/:id', protect, authorize('admin'), async (req, res) => {
    try {
        const grievance = await Grievance.findById(req.params.id);
        if (!grievance) return res.status(404).json({ success: false, message: 'Grievance not found' });

        if (grievance.imageUrl) {
            if (grievance.imageUrl.includes('.blob.core.windows.net/')) {
                if (!process.env.AZURE_STORAGE_CONNECTION_STRING || !process.env.AZURE_STORAGE_CONTAINER) {
                    return res.status(500).json({ success: false, message: 'Azure storage is not configured; the evidence file was not removed.' });
                }

                const blobService = BlobServiceClient.fromConnectionString(process.env.AZURE_STORAGE_CONNECTION_STRING);
                const container = blobService.getContainerClient(process.env.AZURE_STORAGE_CONTAINER);
                const urlPath = decodeURIComponent(new URL(grievance.imageUrl).pathname).replace(/^\//, '');
                const containerPrefix = `${process.env.AZURE_STORAGE_CONTAINER}/`;
                const blobName = urlPath.startsWith(containerPrefix) ? urlPath.slice(containerPrefix.length) : urlPath;
                await container.getBlockBlobClient(blobName).deleteIfExists();
            } else if (grievance.imageUrl.startsWith('/uploads/')) {
                const uploadPath = path.join(__dirname, '..', grievance.imageUrl);
                await fs.unlink(uploadPath).catch(error => {
                    if (error.code !== 'ENOENT') throw error;
                });
            }
        }

        await grievance.deleteOne();
        await AuditLog.create({
            user: req.user._id,
            action: 'delete',
            resourceType: 'grievance',
            resourceId: grievance._id,
            details: `Grievance "${grievance.title}" and its evidence file were removed`,
        });

        res.json({ success: true, message: 'Grievance and evidence file removed' });
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
router.put('/:id/resolve', protect, authorize('engineer', 'admin'), upload.single('siteVisitImage'), async (req, res) => {
    try {
        const grievance = await Grievance.findById(req.params.id);
        if (!grievance) return res.status(404).json({ success: false, message: 'Grievance not found' });

        const { status, remarks, priority, condition, visitLocation } = req.body;
        grievance.status = status;
        grievance.resolution = {
            resolvedBy: req.user._id,
            resolvedAt: new Date(),
            remarks: remarks || '',
        };
        if (req.user.role === 'engineer') {
            const parsedLocation = typeof visitLocation === 'string' ? JSON.parse(visitLocation) : visitLocation;
            grievance.siteVisit = {
                priority: priority === 'high' ? 'high' : 'moderate',
                condition: condition || '',
                location: parsedLocation || {},
                imageUrl: req.file ? (req.file.location || `/uploads/grievances/${req.file.filename}`) : grievance.siteVisit?.imageUrl || '',
                visitedBy: req.user._id,
                visitedAt: new Date(),
            };
        }
        await grievance.save();

        // Notify the citizen
        await notificationService.notifyGrievanceResolution(grievance, status);

        res.json({ success: true, grievance });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
});

module.exports = router;
