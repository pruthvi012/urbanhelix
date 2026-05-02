const express = require('express');
const HashChainService = require('../services/hashChainService');
const HashChainRecord = require('../models/HashChainRecord');
const AuditLog = require('../models/AuditLog');
const FundTransaction = require('../models/FundTransaction');
const Project = require('../models/Project');
const Department = require('../models/Department');
const { protect } = require('../middleware/auth');

const router = express.Router();

// GET /api/audit/verify-chain — verify entire hash chain integrity (public)
router.get('/verify-chain', async (req, res) => {
    try {
        const result = await HashChainService.verifyChain();
        res.json({ success: true, ...result });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
});

// GET /api/audit/verify-record/:id — verify a single record
router.get('/verify-record/:id', async (req, res) => {
    try {
        const result = await HashChainService.verifyRecord(req.params.id);
        res.json({ success: true, ...result });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
});

// GET /api/audit/chain — get chain records with pagination (public)
router.get('/chain', async (req, res) => {
    try {
        const { page = 1, limit = 20, type } = req.query;
        const filter = {};
        if (type) filter.recordType = type;

        const records = await HashChainRecord.find(filter)
            .sort({ sequenceNumber: -1 })
            .skip((page - 1) * parseInt(limit))
            .limit(parseInt(limit))
            .populate('createdBy', 'name email role');

        const total = await HashChainRecord.countDocuments(filter);

        res.json({
            success: true,
            records,
            total,
            page: parseInt(page),
            totalPages: Math.ceil(total / parseInt(limit)),
        });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
});

// GET /api/audit/logs — audit logs (admin/auditor)
router.get('/logs', protect, async (req, res) => {
    try {
        const { page = 1, limit = 50, action, resourceType } = req.query;
        const filter = {};
        if (action) filter.action = action;
        if (resourceType) filter.resourceType = resourceType;

        const logs = await AuditLog.find(filter)
            .populate('user', 'name email role')
            .sort({ createdAt: -1 })
            .skip((page - 1) * parseInt(limit))
            .limit(parseInt(limit));

        const total = await AuditLog.countDocuments(filter);

        res.json({
            success: true,
            logs,
            total,
            page: parseInt(page),
            totalPages: Math.ceil(total / parseInt(limit)),
        });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
});

// GET /api/audit/analytics — analytics overview
router.get('/analytics', async (req, res) => {
    try {
        const { category, ward, area } = req.query;
        let projectMatch = {};
        if (category && category !== 'all') {
            projectMatch.category = category;
        }
        if (ward && ward !== 'all') {
            projectMatch['location.ward'] = { $regex: new RegExp(`^${ward}$`, 'i') };
        }
        if (area && area !== 'all') {
            projectMatch['location.area'] = { $regex: new RegExp(`^${area}$`, 'i') };
        }

        // Department-wise spending (Aggregated from Projects)
        const groupBy = (ward && ward !== 'all') ? '$location.area' : '$location.ward';
        const deptSpending = await Project.aggregate([
            { $match: projectMatch },
            {
                $group: {
                    _id: groupBy,
                    totalBudget: { $sum: '$estimatedBudget' },
                    allocatedBudget: { $sum: '$allocatedBudget' },
                    spentBudget: { $sum: '$spentBudget' }
                }
            },
            {
                $project: {
                    name: '$_id',
                    totalBudget: 1,
                    allocatedBudget: 1,
                    spentBudget: 1
                }
            },
            { $sort: { name: 1 } }
        ]);

        // Project status distribution
        const projectStats = await Project.aggregate([
            { $match: projectMatch },
            { $group: { _id: '$status', count: { $sum: 1 }, totalBudget: { $sum: '$allocatedBudget' } } },
        ]);

        // Category-wise project distribution
        const categoryStats = await Project.aggregate([
            { $group: { _id: '$category', count: { $sum: 1 }, totalBudget: { $sum: '$allocatedBudget' } } },
        ]);

        // Monthly fund flow
        const monthlyFunds = await FundTransaction.aggregate([
            { $match: { status: { $in: ['approved', 'completed'] } } },
            {
                $group: {
                    _id: {
                        year: { $year: '$createdAt' },
                        month: { $month: '$createdAt' },
                    },
                    totalAmount: { $sum: '$amount' },
                    count: { $sum: 1 },
                },
            },
            { $sort: { '_id.year': 1, '_id.month': 1 } },
        ]);

        // Hash chain stats
        const chainStats = await HashChainRecord.aggregate([
            { $group: { _id: '$recordType', count: { $sum: 1 } } },
        ]);

        // Ward-wise project status
        const wardWiseProjectStatus = await Project.aggregate([
            { $match: projectMatch },
            {
                $group: {
                    _id: { ward: '$location.ward', status: '$status' },
                    count: { $sum: 1 }
                }
            },
            {
                $group: {
                    _id: '$_id.ward',
                    statuses: {
                        $push: {
                            status: '$_id.status',
                            count: '$count'
                        }
                    },
                    total: { $sum: '$count' }
                }
            },
            { $sort: { '_id': 1 } }
        ]);

        res.json({
            success: true,
            analytics: {
                departmentSpending: deptSpending,
                projectsByStatus: projectStats,
                projectsByCategory: categoryStats,
                monthlyFundFlow: monthlyFunds,
                hashChainStats: chainStats,
                wardWiseProjectStatus,
            },
        });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
});

module.exports = router;
