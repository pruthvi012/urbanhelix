const express = require('express');
const FundTransaction = require('../models/FundTransaction');
const Project = require('../models/Project');
const Department = require('../models/Department');
const Milestone = require('../models/Milestone');
const BlockchainService = require('../services/blockchainService');
const AuditLog = require('../models/AuditLog');
const HashChainService = require('../services/hashChainService');
const { protect, authorize } = require('../middleware/auth');

const router = express.Router();

// GET /api/funds — list fund transactions
router.get('/', async (req, res) => {
    try {
        const { type, status, project, page = 1, limit = 20 } = req.query;
        const filter = {};
        if (type) filter.type = type;
        if (status) filter.status = status;
        if (project) filter.project = project;

        const transactions = await FundTransaction.find(filter)
            .populate('project', 'title')
            .populate('milestone', 'title milestoneNumber')
            .populate('initiatedBy', 'name email')
            .populate('verifications.verifiedBy', 'name')
            .sort({ createdAt: -1 })
            .skip((page - 1) * limit)
            .limit(parseInt(limit));

        const total = await FundTransaction.countDocuments(filter);

        res.json({ success: true, transactions, total, page: parseInt(page), totalPages: Math.ceil(total / limit) });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
});

// POST /api/funds/disburse — initiate fund disbursement
router.post('/disburse', protect, authorize('engineer', 'admin'), async (req, res) => {
    try {
        const { projectId, milestoneId, amount, description } = req.body;

        const project = await Project.findById(projectId).populate('department');
        if (!project) return res.status(404).json({ success: false, message: 'Project not found' });

        const transaction = await FundTransaction.create({
            type: 'disbursement',
            from: {
                entityType: 'department',
                entityId: project.department._id,
                name: project.department.name,
            },
            to: {
                entityType: 'contractor',
                entityId: project.contractor,
                name: 'Contractor',
            },
            amount,
            description: description || `Fund disbursement for ${project.title}`,
            project: projectId,
            milestone: milestoneId,
            status: 'pending',
            initiatedBy: req.user._id,
        });

        await HashChainService.addRecord(
            'fund_disbursement',
            {
                transactionId: transaction._id,
                projectId,
                projectTitle: project.title,
                amount,
                initiatedBy: req.user.name,
            },
            { entityType: 'fund_transaction', entityId: transaction._id },
            req.user._id
        );

        await AuditLog.create({
            user: req.user._id,
            action: 'disburse',
            resourceType: 'fund_transaction',
            resourceId: transaction._id,
            details: `₹${amount.toLocaleString()} disbursement initiated for ${project.title}`,
        });

        res.status(201).json({ success: true, transaction });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
});

// PUT /api/funds/:id/verify — two-stage verification
router.put('/:id/verify', protect, authorize('financial_officer', 'admin'), async (req, res) => {
    try {
        const transaction = await FundTransaction.findById(req.params.id);
        if (!transaction) return res.status(404).json({ success: false, message: 'Transaction not found' });

        const { approved, remarks } = req.body;
        const stage = transaction.verifications.length + 1;

        if (stage > 2) {
            return res.status(400).json({ success: false, message: 'Transaction already fully verified' });
        }

        const verificationRes = { verifiedBy: req.user._id, stage, approved, remarks: remarks || '', timestamp: Date.now() };

        // Blockchain: Financial Approve and Pay
        if (approved && stage === 2) {
            try {
                // Get milestone blockchainId
                const milestone = await Milestone.findById(transaction.milestone);
                if (milestone && milestone.blockchainId !== undefined) {
                    const receipt = await BlockchainService.financialApproveAndPay(
                        milestone.blockchainId,
                        'TX-REF-' + Date.now()
                    );
                    verificationRes.transactionHash = receipt.hash;
                }
            } catch (bcError) {
                console.error('Blockchain payment release failed:', bcError);
            }
        }

        transaction.verifications.push(verificationRes);

        if (!approved) {
            transaction.status = 'rejected';
        } else if (stage === 1) {
            transaction.status = 'verification_1';
        } else if (stage === 2) {
            transaction.status = 'approved';

            // Update project spent budget
            if (transaction.project) {
                const project = await Project.findById(transaction.project);
                if (project) {
                    project.spentBudget += transaction.amount;
                    await project.save();
                }
            }

            await HashChainService.addRecord(
                'payment_released',
                {
                    transactionId: transaction._id,
                    amount: transaction.amount,
                    stage: 2,
                    approvedBy: req.user.name,
                },
                { entityType: 'fund_transaction', entityId: transaction._id },
                req.user._id
            );
        }

        await transaction.save();

        await AuditLog.create({
            user: req.user._id,
            action: approved ? 'approve' : 'reject',
            resourceType: 'fund_transaction',
            resourceId: transaction._id,
            details: `Stage ${stage} verification: ${approved ? 'approved' : 'rejected'}`,
        });

        res.json({ success: true, transaction });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
});

// GET /api/funds/stats/overview — fund analytics
router.get('/stats/overview', async (req, res) => {
    try {
        const stats = await FundTransaction.aggregate([
            {
                $group: {
                    _id: '$type',
                    totalAmount: { $sum: '$amount' },
                    count: { $sum: 1 },
                },
            },
        ]);

        const byStatus = await FundTransaction.aggregate([
            {
                $group: {
                    _id: '$status',
                    totalAmount: { $sum: '$amount' },
                    count: { $sum: 1 },
                },
            },
        ]);

        res.json({ success: true, byType: stats, byStatus });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
});

module.exports = router;
