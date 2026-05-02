const mongoose = require('mongoose');

const departmentSchema = new mongoose.Schema({
    name: { type: String, required: true, unique: true, trim: true },
    ward: { type: String, required: true },
    wardNo: { type: Number },
    description: { type: String, default: '' },
    headOfficer: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },
    totalBudget: { type: Number, default: 0 },
    allocatedBudget: { type: Number, default: 0 },
    spentBudget: { type: Number, default: 0 },
    fiscalYear: { type: String, default: '2025-2026' },
    isActive: { type: Boolean, default: true },
    completedDate: { type: Date, default: null },
    blockchainId: { type: Number, unique: true, sparse: true },
    transactionHash: String,
    lastTransactionHash: String,
    isLocked: { type: Boolean, default: false },
}, { timestamps: true });

// Virtual for remaining budget
departmentSchema.virtual('remainingBudget').get(function () {
    return this.totalBudget - this.allocatedBudget;
});

departmentSchema.virtual('availableBudget').get(function () {
    return this.allocatedBudget - this.spentBudget;
});

departmentSchema.set('toJSON', { virtuals: true });
departmentSchema.set('toObject', { virtuals: true });

module.exports = mongoose.model('Department', departmentSchema);
