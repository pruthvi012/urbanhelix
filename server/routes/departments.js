const express = require('express');
const Department = require('../models/Department');
const AuditLog = require('../models/AuditLog');
const HashChainService = require('../services/hashChainService');
const BlockchainService = require('../services/blockchainService');
const { protect, authorize } = require('../middleware/auth');

const router = express.Router();

// GET /api/departments — list all
router.get('/', async (req, res) => {
    try {
        const departments = await Department.find().populate('headOfficer', 'name email');
        res.json({ success: true, departments });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
});

// GET /api/departments/:id
router.get('/:id', async (req, res) => {
    try {
        const department = await Department.findById(req.params.id).populate('headOfficer', 'name email');
        if (!department) return res.status(404).json({ success: false, message: 'Department not found' });
        res.json({ success: true, department });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
});

// POST /api/departments — create (admin/engineer)
router.post('/', protect, authorize('admin', 'engineer'), async (req, res) => {
    try {
        const department = await Department.create(req.body);

        await AuditLog.create({
            user: req.user._id,
            action: 'create',
            resourceType: 'department',
            resourceId: department._id,
            details: `Department "${department.name}" created`,
        });

        // Blockchain: Create Budget
        try {
            const receipt = await BlockchainService.createBudget(
                department._id.toString(),
                department.name,
                department.totalBudget,
                department.fiscalYear
            );
            department.transactionHash = receipt.hash;
            await department.save();
        } catch (bcError) {
            console.error('Blockchain creation failed for department:', bcError);
        }

        res.status(201).json({ success: true, department });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
});

// PUT /api/departments/:id/allocate — allocate budget
router.put('/:id/allocate', protect, authorize('admin', 'engineer'), async (req, res) => {
    try {
        const { amount } = req.body;
        const department = await Department.findById(req.params.id);
        if (!department) return res.status(404).json({ success: false, message: 'Department not found' });

        department.allocatedBudget += Number(amount);

        // Blockchain: Allocate Fund on-chain
        try {
            const receipt = await BlockchainService.allocateFund(
                department._id.toString(),
                amount,
                `Budget allocation for ${department.name}`
            );
            department.lastTransactionHash = receipt.hash;
        } catch (bcError) {
            console.error('Blockchain allocation failed for department:', bcError);
        }

        await department.save();

        // Add to hash chain
        const hashRecord = await HashChainService.addRecord(
            'fund_allocation',
            { departmentId: department._id, name: department.name, amount: amount }, // Changed from dept.name, dept.totalBudget to department.name, amount
            { entityType: 'department', entityId: department._id },
            req.user._id,
            null,
            receipt ? receipt.hash : null
        );

        await AuditLog.create({
            user: req.user._id,
            action: 'allocate',
            resourceType: 'department',
            resourceId: department._id,
            details: `₹${amount.toLocaleString()} allocated to ${department.name}`,
        });

        res.json({ success: true, department });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
});

module.exports = router;
