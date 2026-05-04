const mongoose = require('mongoose');

const hashChainRecordSchema = new mongoose.Schema({
    sequenceNumber: { type: Number, required: true, unique: true },
    recordType: {
        type: String,
        enum: ['fund_allocation', 'fund_disbursement', 'project_created', 'project_approved', 'project_status_change',
            'milestone_submitted', 'milestone_approved', 'payment_released', 'grievance_filed', 'expenditure_logged', 'budget_revision'],
        required: true,
    },
    data: { type: mongoose.Schema.Types.Mixed, required: true },
    dataHash: { type: String, required: true },       // SHA-256 of the data payload
    previousHash: { type: String, required: true },    // Hash of the previous record
    recordHash: { type: String, required: true },      // SHA-256(dataHash + previousHash + sequenceNumber)
    relatedEntity: {
        entityType: { type: String },
        entityId: { type: mongoose.Schema.Types.ObjectId },
    },
    createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },
    blockchainId: { type: Number },
    transactionHash: { type: String }
}, { timestamps: true });

// Index for fast chain traversal
hashChainRecordSchema.index({ recordType: 1 });

module.exports = mongoose.model('HashChainRecord', hashChainRecordSchema);
