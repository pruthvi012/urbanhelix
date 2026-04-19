const express = require('express');
const Project = require('../models/Project');
const Department = require('../models/Department');
const AuditLog = require('../models/AuditLog');
const HashChainService = require('../services/hashChainService');
const BlockchainService = require('../services/blockchainService');
const { protect, authorize } = require('../middleware/auth');
const upload = require('../middleware/upload');

const router = express.Router();

// GET /api/projects — list all (public)
router.get('/', async (req, res) => {
    try {
        const { status, department, category, page = 1, limit = 20 } = req.query;
        const filter = {};
        if (status) filter.status = status;
        if (department) filter.department = department;
        if (category) filter.category = category;

        const projects = await Project.find(filter)
            .populate('department', 'name ward')
            .populate('proposedBy', 'name email')
            .populate('engineer', 'name email')
            .populate('contractor', 'name email')
            .sort({ createdAt: -1 })
            .skip((page - 1) * limit)
            .limit(parseInt(limit));

        const total = await Project.countDocuments(filter);

        res.json({ success: true, projects, total, page: parseInt(page), totalPages: Math.ceil(total / limit) });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
});

// GET /api/projects/:id
router.get('/:id', async (req, res) => {
    try {
        const project = await Project.findById(req.params.id)
            .populate('department', 'name ward')
            .populate('proposedBy', 'name email role')
            .populate('engineer', 'name email')
            .populate('contractor', 'name email')
            .populate('statusHistory.changedBy', 'name role');

        if (!project) return res.status(404).json({ success: false, message: 'Project not found' });

        res.json({ success: true, project });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
});

// POST /api/projects — propose a new project (citizen, engineer, admin)
router.post('/', protect, authorize('citizen', 'engineer', 'admin'), upload.fields([{ name: 'image', maxCount: 1 }, { name: 'report', maxCount: 1 }]), async (req, res) => {
    try {
        const projectData = {
            ...req.body,
            proposedBy: req.user._id,
            status: 'proposed',
            statusHistory: [{
                status: 'proposed',
                changedBy: req.user._id,
                remarks: 'Project proposed',
            }],
        };

        // Handle uploaded files
        if (req.files) {
            if (req.files.image) projectData.imageUrl = `/uploads/projects/${req.files.image[0].filename}`;
            if (req.files.report) projectData.reportUrl = `/uploads/projects/${req.files.report[0].filename}`;
        }

        const project = await Project.create(projectData);

        // Blockchain: Create Project on-chain
        try {
            const receipt = await BlockchainService.createProject(
                project._id.toString(),
                project.title,
                project.department.toString(),
                project.estimatedBudget,
                '' // Data hash can be added if needed
            );
            project.transactionHash = receipt.hash;
            // Assuming the first log is ProjectCreated, we can extract blockchainId if needed
            // For simplicity, we use the project index or count if the contract provides it
            // Or we can just store the hash for verification
            await project.save();
        } catch (bcError) {
            console.error('Blockchain creation failed for project:', bcError);
        }

        // Record on hash chain
        const hashRecord = await HashChainService.addRecord(
            'project_created',
            {
                projectId: project._id,
                title: project.title,
                budget: project.estimatedBudget,
            },
            { entityType: 'project', entityId: project._id },
            req.user._id,
            project.blockchainId,
            project.transactionHash
        );

        project.hashChainRecordId = hashRecord._id;
        await project.save();

        await AuditLog.create({
            user: req.user._id,
            action: 'create',
            resourceType: 'project',
            resourceId: project._id,
            details: `Project "${project.title}" proposed`,
        });

        res.status(201).json({ success: true, project });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
});

// PUT /api/projects/:id — update project details (admin or proposer)
router.put('/:id', protect, async (req, res) => {
    try {
        let project = await Project.findById(req.params.id);
        if (!project) return res.status(404).json({ success: false, message: 'Project not found' });

        // Authorization: Admin or Proposer (only if status is proposed)
        const isAdmin = req.user.role === 'admin';
        const isProposer = project.proposedBy?.toString() === req.user._id.toString();

        if (!isAdmin && !(isProposer && project.status === 'proposed')) {
            return res.status(403).json({ success: false, message: 'Not authorized to edit this project' });
        }

        // Update fields (excluding sensitive once handled by specific routes)
        const allowedUpdates = ['title', 'description', 'category', 'estimatedBudget', 'location', 'priority'];
        allowedUpdates.forEach(update => {
            if (req.body[update] !== undefined) project[update] = req.body[update];
        });

        await project.save();
        res.json({ success: true, project });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
});

// PUT /api/projects/:id/approve — engineer approves project
router.put('/:id/approve', protect, authorize('engineer', 'admin'), async (req, res) => {
    try {
        const project = await Project.findById(req.params.id);
        if (!project) return res.status(404).json({ success: false, message: 'Project not found' });

        const { allocatedBudget, remarks } = req.body;

        project.status = 'approved';
        project.engineer = req.user._id;
        project.allocatedBudget = allocatedBudget;
        project.statusHistory.push({
            status: 'approved',
            changedBy: req.user._id,
            remarks: remarks,
        });

        // Blockchain: Approve Project
        try {
            if (project.blockchainId !== undefined && project.blockchainId !== null) {
                const receipt = await BlockchainService.updateProjectStatus(
                    project.blockchainId,
                    'approved',
                    remarks
                );
                project.lastTransactionHash = receipt.hash;
            }
        } catch (bcError) {
            console.error('Blockchain approval failed for project:', bcError);
        }

        await project.save();

        // Update department budget
        if (project.department) {
            const dept = await Department.findById(project.department);
            if (dept) {
                dept.spentBudget += project.allocatedBudget;
                await dept.save();
            }
        }

        // Hash chain record
        await HashChainService.addRecord(
            'project_status_change',
            { projectId: project._id, status: 'approved', remarks },
            { entityType: 'project', entityId: project._id },
            req.user._id,
            project.blockchainId,
            project.lastTransactionHash
        );

        await AuditLog.create({
            user: req.user._id,
            action: 'approve',
            resourceType: 'project',
            resourceId: project._id,
            details: `Project approved with ₹${project.allocatedBudget.toLocaleString()} budget`,
        });

        res.json({ success: true, project });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
});

// PUT /api/projects/:id/assign — assign contractor
router.put('/:id/assign', protect, authorize('engineer', 'admin'), async (req, res) => {
    try {
        const project = await Project.findById(req.params.id);
        if (!project) return res.status(404).json({ success: false, message: 'Project not found' });

        const { contractorId, startDate, expectedEndDate } = req.body;

        project.contractor = contractorId;
        project.status = 'in_progress';
        project.startDate = startDate || new Date();
        project.expectedEndDate = expectedEndDate;
        project.statusHistory.push({
            status: 'in_progress',
            changedBy: req.user._id,
            remarks: 'Contractor assigned, project started',
        });
        await project.save();

        await HashChainService.addRecord(
            'project_status_change',
            {
                projectId: project._id,
                title: project.title,
                newStatus: 'in_progress',
                contractor: contractorId,
                assignedBy: req.user.name,
            },
            { entityType: 'project', entityId: project._id },
            req.user._id
        );

        res.json({ success: true, project });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
});

// PUT /api/projects/:id/status — update project status
router.put('/:id/status', protect, authorize('engineer', 'contractor', 'admin'), upload.single('report'), async (req, res) => {
    try {
        const project = await Project.findById(req.params.id);
        if (!project) return res.status(404).json({ success: false, message: 'Project not found' });

        // If contractor, verify they are assigned to this project
        if (req.user.role === 'contractor' && project.contractor?.toString() !== req.user._id.toString()) {
            return res.status(403).json({ success: false, message: 'Contractors can only update status for assigned projects' });
        }

        const { status, remarks } = req.body;

        project.status = status;
        if (status === 'completed') project.actualEndDate = new Date();

        // Handle uploaded report
        if (req.file) {
            project.reportUrl = `/uploads/projects/${req.file.filename}`;
        }
        project.statusHistory.push({
            status,
            changedBy: req.user._id,
            remarks: remarks || `Status changed to ${status}`,
        });
        await project.save();

        await HashChainService.addRecord(
            'project_status_change',
            { projectId: project._id, title: project.title, newStatus: status, changedBy: req.user.name },
            { entityType: 'project', entityId: project._id },
            req.user._id
        );

        res.json({ success: true, project });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
});

// GET /api/projects/stats/overview — dashboard stats
router.get('/stats/overview', async (req, res) => {
    try {
        const [total, proposed, approved, inProgress, completed] = await Promise.all([
            Project.countDocuments(),
            Project.countDocuments({ status: 'proposed' }),
            Project.countDocuments({ status: 'approved' }),
            Project.countDocuments({ status: 'in_progress' }),
            Project.countDocuments({ status: 'completed' }),
        ]);

        const totalBudget = await Project.aggregate([
            { $group: { _id: null, total: { $sum: '$allocatedBudget' }, spent: { $sum: '$spentBudget' } } },
        ]);

        res.json({
            success: true,
            stats: {
                total, proposed, approved, inProgress, completed,
                totalBudget: totalBudget[0]?.total || 0,
                totalSpent: totalBudget[0]?.spent || 0,
            },
        });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
});

module.exports = router;
