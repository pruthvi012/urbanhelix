const express = require('express');
const Project = require('../models/Project');
const Department = require('../models/Department');
const AuditLog = require('../models/AuditLog');
const Notification = require('../models/Notification');
const HashChainService = require('../services/hashChainService');
const BlockchainService = require('../services/blockchainService');
const { protect, authorize, optionalAuth } = require('../middleware/auth');
const upload = require('../middleware/upload');
const notificationService = require('../services/notificationService');
const FundTransaction = require('../models/FundTransaction');
const crypto = require('crypto');

const router = express.Router();

const calculateEntryHash = (data) => {
    const { amount, material, date, invoiceUrl, vendor, progressPhotoUrl, gpsLat, gpsLng } = data;
    const str = `${amount}|${material}|${new Date(date).toISOString()}|${invoiceUrl}|${vendor}|${progressPhotoUrl||''}|${gpsLat||''}|${gpsLng||''}`;
    return crypto.createHash('sha256').update(str).digest('hex');
};

// Allowed materials per category (whitelist)
const CATEGORY_MATERIALS = {
    road: ['Asphalt/Bitumen','Gravel/Crushed Stone','Concrete','Sand','Cement','Steel Rebar','Labour/Wages','Machinery Rental'],
    water_supply: ['PVC/HDPE Pipes','Valves/Fittings','Pumps/Motors','Cement','Sand','Labour/Wages','Excavator Rental'],
    sanitation: ['Concrete Pipes','Manhole Covers','Cement','Sand','Bricks','Labour/Wages'],
    electricity: ['Cables/Wires','Transformers','Poles','Streetlights/LEDs','Switchgears','Labour/Wages'],
    park: ['Plants/Trees','Soil/Fertilizer','Paving Stones','Fencing/Gates','Benches/Play Equipment','Lighting','Labour/Wages'],
    building: ['Cement','Steel Rebar','Bricks/Blocks','Sand','Gravel','Wood/Plywood','Glass/Windows','Labour/Wages'],
    bridge: ['Steel Girders','Concrete','High-grade Cement','Cables','Scaffolding','Labour/Wages','Heavy Machinery'],
    drainage: ['Concrete Pipes','Cement','Sand','Steel Grates','Bricks','Labour/Wages','Excavator Rental'],
    other: ['General Materials','Labour/Wages','Machinery','Miscellaneous']
};

const generateProjectCode = async () => {
    let code;
    let exists = true;
    while (exists) {
        code = 'UHX-' + crypto.randomBytes(3).toString('hex').toUpperCase();
        exists = await Project.exists({ projectCode: code });
    }
    return code;
};

// GET /api/projects — list all (public)
router.get('/', optionalAuth, async (req, res) => {
    try {
        const { status, department, category, page = 1, limit = 20, ward, wardNo, area, projectCode } = req.query;
        const filter = {};
        if (status) filter.status = status;
        if (department) filter.department = department;
        if (category) filter.category = category;
        if (ward) filter['location.ward'] = ward;
        if (wardNo) filter['location.wardNo'] = parseInt(wardNo);
        if (area) filter['location.area'] = area;
        if (projectCode) {
            filter.projectCode = { $regex: new RegExp('^' + projectCode.trim() + '$', 'i') };
        }

        let projects = await Project.find(filter)
            .populate('department', 'name ward')
            .populate('proposedBy', 'name email')
            .populate('engineer', 'name email')
            .populate('contractor', 'name email')
            .sort({ createdAt: -1 })
            .skip((page - 1) * limit)
            .limit(parseInt(limit));

        const total = await Project.countDocuments(filter);

        // Sanitize projectCode for non-engineers/admins/finance unless they searched specifically by it
        const userRole = req.user?.role;
        const canSeeCode = userRole === 'admin' || userRole === 'engineer' || userRole === 'financial_officer';
        
        const sanitizedProjects = projects.map(p => {
            const pObj = p.toObject();
            // Allow contractor to see the code IF they searched for it explicitly, otherwise hide it
            if (!canSeeCode && (!projectCode || pObj.projectCode !== projectCode)) {
                delete pObj.projectCode;
            }
            return pObj;
        });

        res.json({ success: true, projects: sanitizedProjects, total, page: parseInt(page), totalPages: Math.ceil(total / limit) });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
});

// GET /api/projects/:id
router.get('/:id', optionalAuth, async (req, res) => {
    try {
        const project = await Project.findById(req.params.id)
            .populate('department', 'name ward')
            .populate('proposedBy', 'name email role')
            .populate('engineer', 'name email')
            .populate('contractor', 'name email')
            .populate('statusHistory.changedBy', 'name role');

        if (!project) return res.status(404).json({ success: false, message: 'Project not found' });
        
        let pObj = project.toObject();
        const userRole = req.user?.role;
        if (userRole !== 'admin' && userRole !== 'engineer' && userRole !== 'financial_officer' && (!req.user || req.user._id.toString() !== pObj.contractor?._id?.toString())) {
            delete pObj.projectCode;
        }

        // Verify expenditures integrity
        let isTampered = false;
        if (project.expenditures && project.expenditures.length > 0) {
            for (const exp of project.expenditures) {
                const currentHash = calculateEntryHash({
                    amount: exp.amount,
                    material: exp.material,
                    date: exp.date,
                    invoiceUrl: exp.invoiceUrl,
                    vendor: exp.vendor
                });
                if (currentHash !== exp.entryHash) {
                    isTampered = true;
                    break;
                }
            }
        }

        if (isTampered) {
            // Trigger emergency notifications if not already handled
            await notificationService.notifyAllCitizens(
                '🚨 TAMPER ALERT: Project Expenditure Audit Failed',
                `Warning: Cryptographic audit failed for project "${project.title}". Financial records may have been tampered with.`,
                { type: 'tamper_alert', relatedEntity: { entityType: 'Project', entityId: project._id } }
            );
        }

        res.json({ success: true, project: pObj, isTampered });
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
        
        // Generate projectCode upon approval
        if (!project.projectCode) {
            project.projectCode = await generateProjectCode();
        }

        project.status = 'approved';
        // Only set engineer if not already assigned (proposedBy is typically the engineer)
        if (!project.engineer) {
            project.engineer = project.proposedBy;
        }
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

// POST /api/projects/:id/expenditure — log contractor expenditure with invoice and hashing
router.post('/:id/expenditure', protect, authorize('contractor', 'engineer'), upload.fields([{ name: 'invoice', maxCount: 1 }, { name: 'progressPhoto', maxCount: 1 }]), async (req, res) => {
    try {
        const project = await Project.findById(req.params.id).populate('engineer', 'name _id');
        if (!project) return res.status(404).json({ success: false, message: 'Project not found' });

        const { date, invoiceDate, amount, material, vendor, remarks, gpsLat, gpsLng } = req.body;

        if (!date || !invoiceDate || !amount || !material || !vendor) {
            return res.status(400).json({ success: false, message: 'All fields (date, invoiceDate, amount, material, vendor) are required' });
        }

        if (!req.files || !req.files.invoice) {
            return res.status(400).json({ success: false, message: 'Invoice/bill upload is mandatory for every expense entry' });
        }
        if (!req.files.progressPhoto) {
            return res.status(400).json({ success: false, message: 'Geo-tagged progress photo is mandatory' });
        }

        // Strict date matching validation
        if (date !== invoiceDate) {
            return res.status(400).json({ success: false, message: 'Expenditure date must exactly match the date printed on the invoice' });
        }

        // Material whitelist validation
        const allowedMaterials = CATEGORY_MATERIALS[project.category] || CATEGORY_MATERIALS.other;
        if (!allowedMaterials.includes(material)) {
            return res.status(400).json({ success: false, message: `Invalid material "${material}" for category "${project.category}". Allowed: ${allowedMaterials.join(', ')}` });
        }

        const expAmount = Number(amount);

        // Budget remaining check
        const remaining = (project.allocatedBudget || project.estimatedBudget) - project.spentBudget;
        if (expAmount > remaining) {
            return res.status(400).json({ success: false, message: `Amount ₹${expAmount.toLocaleString()} exceeds remaining budget of ₹${remaining.toLocaleString()}` });
        }

        const invoiceUrl = `/uploads/projects/${req.files.invoice[0].filename}`;
        const progressPhotoUrl = `/uploads/projects/${req.files.progressPhoto[0].filename}`;

        // Calculate Cryptographic Hash including all fields
        const entryHash = calculateEntryHash({
            amount: expAmount, material, date, invoiceUrl, vendor,
            progressPhotoUrl,
            gpsLat: gpsLat ? parseFloat(gpsLat) : null,
            gpsLng: gpsLng ? parseFloat(gpsLng) : null
        });

        // Record expenditure (pending engineer verification)
        project.expenditures.push({
            date: new Date(date),
            invoiceDate: new Date(invoiceDate),
            amount: expAmount,
            material,
            vendor,
            invoiceUrl,
            progressPhotoUrl,
            gpsLat: gpsLat ? parseFloat(gpsLat) : null,
            gpsLng: gpsLng ? parseFloat(gpsLng) : null,
            entryHash,
            remarks: remarks || '',
            recordedBy: req.user._id,
            engineerVerified: false,
            readyForPayment: false
        });

        // Update total spent budget
        project.spentBudget += expAmount;

        // Record to HashChain
        try {
            await HashChainService.addRecord(
                'expenditure_logged',
                { projectId: project._id, amount: expAmount, material, vendor, entryHash, loggedBy: req.user.name },
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
            details: `Logged tamper-proof expenditure: ₹${expAmount.toLocaleString()} for ${material} from ${vendor}. Awaiting engineer verification.`,
        });

        // Notify assigned engineer for cross-verification
        if (project.engineer) {
            await Notification.create({
                user: project.engineer._id || project.engineer,
                title: '🔍 Expense Needs Physical Verification',
                message: `Contractor logged ₹${expAmount.toLocaleString()} for "${material}" on project "${project.title}". Please visit site and verify physically.`,
                type: 'system',
                relatedEntity: { entityType: 'Project', entityId: project._id }
            });
        }

        res.json({ success: true, project });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
});

// PUT /api/projects/:id/expenditure/:expId/verify — engineer physically verifies an expense
router.put('/:id/expenditure/:expId/verify', protect, authorize('engineer', 'admin'), async (req, res) => {
    try {
        const project = await Project.findById(req.params.id);
        if (!project) return res.status(404).json({ success: false, message: 'Project not found' });

        const exp = project.expenditures.id(req.params.expId);
        if (!exp) return res.status(404).json({ success: false, message: 'Expenditure record not found' });

        const { verified, remarks } = req.body;

        exp.engineerVerified = verified === true || verified === 'true';
        exp.verifiedByEngineer = req.user._id;
        exp.verifiedAt = new Date();
        exp.verificationRemarks = remarks || '';
        exp.readyForPayment = exp.engineerVerified;

        await project.save();

        await AuditLog.create({
            user: req.user._id,
            action: 'verify_expenditure',
            resourceType: 'project',
            resourceId: project._id,
            details: `Engineer ${exp.engineerVerified ? 'VERIFIED ✅' : 'REJECTED ❌'} expenditure of ₹${exp.amount.toLocaleString()} for ${exp.material}. Remarks: ${remarks || 'None'}`,
        });

        res.json({ success: true, expenditure: exp, message: exp.engineerVerified ? 'Expenditure verified and marked ready for payment' : 'Expenditure rejected' });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
});

// GET /api/projects/materials/:category — get allowed materials for a category
router.get('/materials/:category', (req, res) => {
    const mats = CATEGORY_MATERIALS[req.params.category] || CATEGORY_MATERIALS.other;
    res.json({ success: true, materials: mats });
});


module.exports = router;
