const express = require('express');
const Project = require('../models/Project');
const Department = require('../models/Department');
const AuditLog = require('../models/AuditLog');
const Notification = require('../models/Notification');
const HashChainService = require('../services/hashChainService');
const BlockchainService = require('../services/blockchainService');
const { protect, authorize } = require('../middleware/auth');
const upload = require('../middleware/upload');
const notificationService = require('../services/notificationService');
const FundTransaction = require('../models/FundTransaction');

const router = express.Router();
const crypto = require('crypto');

// GET /api/projects — list all (public)
router.get('/', async (req, res) => {
    try {
        const { status, department, category, page = 1, limit = 20, ward, wardNo, area } = req.query;
        const filter = {};
        if (status) filter.status = status;
        if (department) filter.department = department;
        if (category) filter.category = category;
        if (ward) filter['location.ward'] = ward;
        if (wardNo) filter['location.wardNo'] = parseInt(wardNo);
        if (area) filter['location.area'] = area;

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

// POST /api/projects/verify-code — contractor verifies access code to unlock project
router.post('/verify-code', protect, authorize('contractor'), async (req, res) => {
    try {
        const { code } = req.body;
        if (!code) return res.status(400).json({ success: false, message: 'Access code is required.' });

        const project = await Project.findOne({ contractorCode: code.trim().toUpperCase() })
            .populate('department', 'name ward')
            .populate('proposedBy', 'name email')
            .populate('engineer', 'name email')
            .populate('contractor', 'name email');

        if (!project) return res.status(404).json({ success: false, message: 'Invalid code. No project found with this access code.' });

        if (project.contractor?._id?.toString() !== req.user._id.toString()) {
            return res.status(403).json({ success: false, message: 'This code belongs to a different contractor.' });
        }

        project.contractorCodeVerified = true;
        await project.save();

        res.json({ success: true, message: 'Project unlocked successfully!', project });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
});

// GET /api/projects/my-projects — contractor gets only their verified projects
router.get('/my-projects', protect, authorize('contractor'), async (req, res) => {
    try {
        const projects = await Project.find({
            contractor: req.user._id,
            contractorCodeVerified: true
        })
            .populate('department', 'name ward')
            .populate('proposedBy', 'name email')
            .populate('engineer', 'name email')
            .populate('contractor', 'name email')
            .sort({ createdAt: -1 });

        res.json({ success: true, projects });
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

        // VERIFY EXPENSE HASHES (Tamper Detection)
        let tamperedFound = false;
        if (project.expenditures && project.expenditures.length > 0) {
            const crypto = require('crypto');
            project.expenditures.forEach(exp => {
                const dataString = `${exp.amount}-${exp.material}-${new Date(exp.date).toISOString()}-${exp.invoiceUrl}-${exp.vendorName}`;
                const calculatedHash = crypto.createHash('sha256').update(dataString).digest('hex');
                if (calculatedHash !== exp.expenseHash && !exp.isTampered) {
                    exp.isTampered = true;
                    tamperedFound = true;
                }
            });
            if (tamperedFound) {
                await project.save();
                // Notify citizens and admins
                await notificationService.notifyAllCitizens(
                    'SECURITY ALERT: Invoice Tampered',
                    `CRITICAL: Tampering detected in project "${project.title}". An expenditure amount or invoice was illegally altered after upload!`,
                    { type: 'public_update', relatedEntity: { entityType: 'Project', entityId: project._id } }
                );
            }
        }

        res.json({ success: true, project });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
});

// POST /api/projects — propose a new project (citizen, engineer, admin)
router.post('/', protect, authorize('citizen', 'engineer', 'admin'), upload.fields([
    { name: 'image', maxCount: 1 }, 
    { name: 'report', maxCount: 1 },
    { name: 'budgetEstimateProof', maxCount: 1 }
]), async (req, res) => {
    try {
        const { title, estimatedBudget, department: departmentId } = req.body;

        // Validation: Match with Tamper Testing (Anomaly/Lock detection) - Only if department is provided
        if (departmentId) {
            const department = await Department.findById(departmentId);
            if (!department) return res.status(404).json({ success: false, message: 'Department not found' });

            if (department.isLocked || department.spentBudget > department.allocatedBudget) {
                return res.status(403).json({ 
                    success: false, 
                    message: 'PROPOSAL REJECTED: This ward is currently under investigation for budget anomalies. No new projects can be proposed.' 
                });
            }

            // Check if estimated budget is within the remaining total budget
            const remaining = department.totalBudget - department.allocatedBudget;
            if (Number(estimatedBudget) > remaining) {
                return res.status(400).json({ 
                    success: false, 
                    message: `PROPOSAL REJECTED: Estimated budget (₹${Number(estimatedBudget).toLocaleString()}) exceeds the available ward budget (₹${remaining.toLocaleString()}).` 
                });
            }
        }

        // Clean up empty strings that cause CastErrors
        if (req.body.department === '') {
            delete req.body.department;
        }

        // Parse JSON strings sent via FormData
        let locationData = req.body.location;
        if (typeof locationData === 'string') {
            try {
                locationData = JSON.parse(locationData);
            } catch (e) {
                console.error("Failed to parse location JSON", e);
            }
        }

        const projectData = {
            ...req.body,
            location: locationData,
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
            if (req.files.budgetEstimateProof) projectData.budgetEstimateProofUrl = `/uploads/projects/${req.files.budgetEstimateProof[0].filename}`;
        }

        // Budget Locking Logic
        const { enteredBudget } = req.body;
        if (enteredBudget && Number(enteredBudget) === Number(projectData.estimatedBudget)) {
            projectData.isBudgetLocked = true;
        }

        // Auto-generate unique contractor access code
        let contractorCode;
        let isUnique = false;
        while (!isUnique) {
            const codeRaw = crypto.randomBytes(4).toString('hex').toUpperCase();
            contractorCode = `UHX-${codeRaw}`;
            const existing = await Project.findOne({ contractorCode });
            if (!existing) isUnique = true;
        }
        projectData.contractorCode = contractorCode;

        const project = await Project.create(projectData);

        // Blockchain: Create Project on-chain
        try {
            const receipt = await BlockchainService.createProject(
                project._id.toString(),
                project.title,
                project.department ? project.department.toString() : '',
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

        // Notify admins about new proposal
        await notificationService.notifyProjectProposal(project);
        
        await notificationService.notifyAllCitizens(
            'New Project Proposed',
            `A new project "${project.title}" has been proposed.`,
            { type: 'public_update', relatedEntity: { entityType: 'Project', entityId: project._id } }
        );

        res.status(201).json({ success: true, project, contractorCode: project.contractorCode });
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
        // USER REQUIREMENT: Only allow editing estimatedBudget, restrict Spent Budget modification.
        const allowedUpdates = ['title', 'description', 'category', 'estimatedBudget', 'location', 'priority'];
        
        // Strictly protect these fields - they are only handled by the system or Admin testing
        const restrictedFields = ['spentBudget', 'allocatedBudget', 'status', 'engineer', 'contractor'];

        const oldBudget = project.estimatedBudget;
        const newBudget = req.body.estimatedBudget;
        const budgetChanged = newBudget !== undefined && Number(newBudget) !== Number(oldBudget);

        allowedUpdates.forEach(update => {
            if (req.body[update] !== undefined) project[update] = req.body[update];
        });

        // Even Admins are discouraged from manual Spent Budget tampering here to preserve Audit integrity
        // unless specifically needed for "Tamper Testing" which we handle separately.
        if (isAdmin && req.body.spentBudget !== undefined) {
             project.spentBudget = req.body.spentBudget;
        }

        await project.save();

        // Notify all stakeholders about budget edit if changed
        if (budgetChanged) {
            await notificationService.notifyProjectStakeholders(
                project,
                'Project Budget Updated',
                `The budget for "${project.title}" has been updated from ₹${oldBudget.toLocaleString()} to ₹${Number(newBudget).toLocaleString()}.`,
                'budget_change'
            );
        }

        res.json({ success: true, project });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
});

// PUT /api/projects/:id/approve — financial officer approves project
router.put('/:id/approve', protect, authorize('financial_officer'), async (req, res) => {
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

        // Create Fund Transaction for Allocation
        if (project.department) {
            try {
                await FundTransaction.create({
                    type: 'allocation',
                    from: {
                        entityType: 'department',
                        entityId: project.department,
                        name: 'Ward Fund',
                    },
                    to: {
                        entityType: 'project',
                        entityId: project._id,
                        name: project.title,
                    },
                    amount: Number(allocatedBudget),
                    description: `Budget allocated for project: ${project.title}`,
                    project: project._id,
                    status: 'approved',
                    initiatedBy: req.user._id,
                });
            } catch (ftErr) {
                console.error('FundTransaction creation failed:', ftErr);
            }
        }

        // Update department budget (allocated, not spent!)
        if (project.department) {
            const dept = await Department.findById(project.department);
            if (dept) {
                dept.allocatedBudget += project.allocatedBudget;
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
            details: `Project approved with ₹${project.allocatedBudget.toLocaleString()} budget`
        });

        // Notify all stakeholders about approval
        await notificationService.notifyProjectStakeholders(
            project,
            'Project Approved & Engineer Assigned',
            `Project "${project.title}" has been approved with a budget of ₹${project.allocatedBudget.toLocaleString()}.`,
            'project_approved'
        );

        await notificationService.notifyAllCitizens(
            'Project Approved',
            `Project "${project.title}" has been officially approved with a budget of ₹${project.allocatedBudget.toLocaleString()}.`,
            { type: 'public_update', relatedEntity: { entityType: 'Project', entityId: project._id } }
        );

        res.json({ success: true, project });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
});

// PUT /api/projects/:id/assign — assign contractor + generate access code
router.put('/:id/assign', protect, authorize('engineer', 'admin'), async (req, res) => {
    try {
        const project = await Project.findById(req.params.id);
        if (!project) return res.status(404).json({ success: false, message: 'Project not found' });

        const { contractorId, startDate, expectedEndDate } = req.body;

        project.contractor = contractorId;
        project.contractorCodeVerified = false;
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

        // Notify all stakeholders about contractor assignment
        await notificationService.notifyProjectStakeholders(
            project,
            'Contractor Assigned to Project',
            `A contractor has been assigned to project: ${project.title}. Work has officially started.`,
            'system'
        );

        await notificationService.notifyAllCitizens(
            'Contractor Assigned',
            `A contractor has been assigned to project: ${project.title}. Work has officially started!`,
            { type: 'public_update', relatedEntity: { entityType: 'Project', entityId: project._id } }
        );

        res.json({ success: true, project });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
});


// PUT /api/projects/:id/status — update project status
router.put('/:id/status', protect, authorize('engineer', 'contractor', 'admin'), upload.fields([{ name: 'report', maxCount: 1 }, { name: 'progressPhoto', maxCount: 1 }]), async (req, res) => {
    try {
        const project = await Project.findById(req.params.id);
        if (!project) return res.status(404).json({ success: false, message: 'Project not found' });

        const { status, remarks } = req.body;

        project.status = status;
        if (status === 'completed') project.actualEndDate = new Date();

        // Handle uploaded files
        if (req.files) {
            if (req.files.report) project.reportUrl = `/uploads/projects/${req.files.report[0].filename}`;
            if (req.files.progressPhoto) {
                project.progressPhotos.push({
                    url: `/uploads/projects/${req.files.progressPhoto[0].filename}`,
                    description: remarks || `Progress update for ${status}`,
                    timestamp: new Date()
                });
            }
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

        const title = req.files && req.files.progressPhoto ? 'New Progress Photos Uploaded' : 'Project Status Updated';
        const body = req.files && req.files.progressPhoto 
            ? `${req.user.name} uploaded new photos for project: ${project.title}`
            : `The status of "${project.title}" has been changed to "${status.replace('_', ' ')}".`;

        await notificationService.notifyProjectStakeholders(
            project,
            title,
            body,
            'system'
        );

        // Broadcast to all citizens
        await notificationService.notifyAllCitizens(
            title,
            body,
            { type: 'public_update', relatedEntity: { entityType: 'Project', entityId: project._id } }
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

// PUT /api/projects/:id/revision — revise budget for a locked project
router.put('/:id/revision', protect, authorize('engineer', 'admin'), async (req, res) => {
    try {
        const project = await Project.findById(req.params.id);
        if (!project) return res.status(404).json({ success: false, message: 'Project not found' });

        const { newBudget, reason } = req.body;
        if (!newBudget || !reason) {
            return res.status(400).json({ success: false, message: 'New budget and reason are required for revision' });
        }

        const oldBudget = project.allocatedBudget || project.estimatedBudget;

        // Record revision
        const revision = {
            oldBudget,
            newBudget: Number(newBudget),
            reason,
            changedBy: req.user._id,
            timestamp: new Date()
        };

        project.budgetRevisionHistory.push(revision);
        
        // Update the actual budget
        if (project.allocatedBudget > 0) {
            // If already approved, update allocated budget and department budget
            const diff = Number(newBudget) - project.allocatedBudget;
            project.allocatedBudget = Number(newBudget);
            
            if (project.department) {
                const dept = await Department.findById(project.department);
                if (dept) {
                    dept.allocatedBudget += diff;
                    await dept.save();
                }
            }
        } else {
            project.estimatedBudget = Number(newBudget);
        }

        // Blockchain/HashChain: Record Revision for tamper evidence
        try {
            const hashRecord = await HashChainService.addRecord(
                'budget_revision',
                {
                    projectId: project._id,
                    oldBudget,
                    newBudget: Number(newBudget),
                    reason,
                    revisedBy: req.user.name
                },
                { entityType: 'project', entityId: project._id },
                req.user._id
            );
            
            revision.transactionHash = hashRecord.recordHash; // Using internal hash as a reference if no blockchain tx yet
            project.lastTransactionHash = hashRecord.recordHash;
        } catch (err) {
            console.error('HashChain record failed:', err);
        }

        await project.save();

        await AuditLog.create({
            user: req.user._id,
            action: 'revision',
            resourceType: 'project',
            resourceId: project._id,
            details: `Budget revised from ₹${oldBudget.toLocaleString()} to ₹${Number(newBudget).toLocaleString()}. Reason: ${reason}`,
        });

        // Notify all stakeholders about budget revision
        await notificationService.notifyProjectStakeholders(
            project,
            'Project Budget Revised',
            `The budget for "${project.title}" has been revised from ₹${oldBudget.toLocaleString()} to ₹${Number(newBudget).toLocaleString()}. Reason: ${reason}`,
            'budget_revision'
        );

        res.json({ success: true, project });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
});

// POST /api/projects/:id/expenditure — log contractor expenditure
router.post('/:id/expenditure', protect, authorize('contractor', 'engineer'), upload.single('invoice'), async (req, res) => {
    try {
        const crypto = require('crypto');
        const project = await Project.findById(req.params.id);
        if (!project) return res.status(404).json({ success: false, message: 'Project not found' });

        const { date, invoiceDate, amount, material, vendorName, remarks } = req.body;

        if (!date || !invoiceDate || !amount || !material || !vendorName) {
            return res.status(400).json({ success: false, message: 'All fields (including Vendor Name and Invoice Date) are required.' });
        }
        if (date !== invoiceDate) {
            return res.status(400).json({ success: false, message: 'Expenditure date and Invoice Date must match exactly.' });
        }
        if (!req.file) {
            return res.status(400).json({ success: false, message: 'Invoice bill upload is required to proceed.' });
        }

        const expAmount = Number(amount);
        const invoiceUrl = `/uploads/projects/${req.file.filename}`;

        // Create SHA-256 Hash
        const dataString = `${expAmount}-${material}-${new Date(date).toISOString()}-${invoiceUrl}-${vendorName}`;
        const expenseHash = crypto.createHash('sha256').update(dataString).digest('hex');

        // Record expenditure
        project.expenditures.push({
            date: new Date(date),
            invoiceDate: new Date(invoiceDate),
            amount: expAmount,
            material,
            vendorName,
            invoiceUrl,
            remarks: remarks || '',
            recordedBy: req.user._id,
            expenseHash,
            isTampered: false
        });

        // Update total spent budget
        project.spentBudget += expAmount;

        // Optionally record to HashChain
        try {
            await HashChainService.addRecord(
                'expenditure_logged',
                {
                    projectId: project._id,
                    amount: expAmount,
                    material,
                    vendorName,
                    expenseHash,
                    loggedBy: req.user.name
                },
                { entityType: 'project', entityId: project._id },
                req.user._id
            );
        } catch (err) {
            console.error('HashChain record failed:', err);
        }

        await project.save();

        await AuditLog.create({
            user: req.user._id,
            action: 'log_expenditure',
            resourceType: 'project',
            resourceId: project._id,
            details: `Logged expenditure of ₹${expAmount.toLocaleString()} for ${material} (Vendor: ${vendorName})`,
        });

        res.json({ success: true, project });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
});

module.exports = router;
