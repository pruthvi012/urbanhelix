const express = require('express');
const Milestone = require('../models/Milestone');
const Project = require('../models/Project');
const AuditLog = require('../models/AuditLog');
const HashChainService = require('../services/hashChainService');
const BlockchainService = require('../services/blockchainService');

const { protect, authorize } = require('../middleware/auth');

const router = express.Router();

// GET /api/milestones?project=xxx
router.get('/', protect, async (req, res) => {
    try {
        const filter = {};
        if (req.query.project) filter.project = req.query.project;
        if (req.query.status) filter.status = req.query.status;

        const milestones = await Milestone.find(filter)
            .populate('project', 'title status')
            .populate('submittedBy', 'name email')
            .populate('engineerApproval.approvedBy', 'name')
            .populate('financialApproval.approvedBy', 'name')
            .sort({ milestoneNumber: 1 });

        res.json({ success: true, milestones });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
});

// POST /api/milestones — contractor submits milestone
router.post('/', protect, authorize('contractor', 'admin'), async (req, res) => {
    try {
        const { project, title, description, milestoneNumber, amount, dueDate } = req.body;

        const proj = await Project.findById(project);
        if (!proj) return res.status(404).json({ success: false, message: 'Project not found' });

        const milestone = await Milestone.create({
            project,
            title,
            description,
            milestoneNumber,
            amount,
            dueDate,
            submittedBy: req.user._id,
            status: 'submitted',
        });

        // Hash chain record
        const hashRecord = await HashChainService.addRecord(
            'milestone_submitted',
            {
                milestoneId: milestone._id,
                projectId: project,
                projectTitle: proj.title,
                title: milestone.title,
                amount: milestone.amount,
                submittedBy: req.user.name,
            },
            { entityType: 'milestone', entityId: milestone._id },
            req.user._id,
            milestone.blockchainId,
            milestone.transactionHash
        );

        milestone.hashChainRecordId = hashRecord._id;
        await milestone.save();

        await AuditLog.create({
            user: req.user._id,
            action: 'create',
            resourceType: 'milestone',
            resourceId: milestone._id,
            details: `Milestone "${title}" submitted for project`,
        });

        // Blockchain: Submit Milestone
        try {
            // Retrieve the project to get its blockchainId
            const projectObj = await Project.findById(project);
            if (projectObj && projectObj.blockchainId !== undefined) {
                const receipt = await BlockchainService.submitMilestone(
                    projectObj.blockchainId,
                    milestone._id.toString(),
                    milestone.title,
                    milestone.amount,
                    '' // Proof hash
                );
                milestone.transactionHash = receipt.hash;
                milestone.blockchainId = receipt.blockchainId;
                await milestone.save();
            }
        } catch (bcError) {
            console.error('Blockchain submission failed for milestone:', bcError);
        }

        res.status(201).json({ success: true, milestone });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
});

// PUT /api/milestones/:id/engineer-approve — engineer approves
router.put('/:id/engineer-approve', protect, authorize('engineer', 'admin'), async (req, res) => {
    try {
        const milestone = await Milestone.findById(req.params.id);
        if (!milestone) return res.status(404).json({ success: false, message: 'Milestone not found' });

        const { approved, remarks } = req.body;

        milestone.engineerApproval = { approved, approvedBy: req.user._id, approvedAt: Date.now(), remarks };
        milestone.status = approved ? 'under_review' : 'rejected';

        // Blockchain: Engineer Approve
        if (approved && milestone.blockchainId !== undefined) {
            try {
                const receipt = await BlockchainService.engineerApproveMilestone(milestone.blockchainId);
                milestone.engineerApproval.transactionHash = receipt.hash;
            } catch (bcError) {
                console.error('Blockchain engineer approval failed:', bcError);
            }
        }

        await milestone.save();

        if (approved) {
            await HashChainService.addRecord(
                'milestone_approved',
                {
                    milestoneId: milestone._id,
                    stage: 'engineer',
                    approvedBy: req.user.name,
                    amount: milestone.amount,
                },
                { entityType: 'milestone', entityId: milestone._id },
                req.user._id,
                milestone.blockchainId,
                milestone.engineerApproval.transactionHash
            );
        }

        res.json({ success: true, milestone });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
});

// PUT /api/milestones/:id/financial-approve — financial officer approves
router.put('/:id/financial-approve', protect, authorize('financial_officer', 'admin'), async (req, res) => {
    try {
        const milestone = await Milestone.findById(req.params.id);
        if (!milestone) return res.status(404).json({ success: false, message: 'Milestone not found' });

        const { approved, remarks } = req.body;

        milestone.financialApproval = {
            approved,
            approvedBy: req.user._id,
            approvedAt: new Date(),
            remarks: remarks || '',
        };
        milestone.status = approved ? 'approved' : 'rejected';
        await milestone.save();

        if (approved) {
            await HashChainService.addRecord(
                'milestone_approved',
                {
                    milestoneId: milestone._id,
                    stage: 'financial',
                    approvedBy: req.user.name,
                    amount: milestone.amount,
                },
                { entityType: 'milestone', entityId: milestone._id },
                req.user._id
            );
        }

        res.json({ success: true, milestone });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
});

module.exports = router;
