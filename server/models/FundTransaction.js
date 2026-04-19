const mongoose = require('mongoose');

const fundTransactionSchema = new mongoose.Schema({
    type: {
        type: String,
        enum: ['allocation', 'disbursement', 'payment', 'refund'],
        required: true,
    },
    from: {
        entityType: { type: String, enum: ['government', 'department', 'project'], required: true },
        entityId: { type: mongoose.Schema.Types.ObjectId, required: true },
        name: { type: String, default: '' },
    },
    to: {
        entityType: { type: String, enum: ['department', 'project', 'contractor'], required: true },
        entityId: { type: mongoose.Schema.Types.ObjectId, required: true },
        name: { type: String, default: '' },
    },
    amount: { type: Number, required: true, min: 0 },
    description: { type: String, default: '' },
    project: { type: mongoose.Schema.Types.ObjectId, ref: 'Project', default: null },
    milestone: { type: mongoose.Schema.Types.ObjectId, ref: 'Milestone', default: null },
    status: {
        type: String,
        enum: ['pending', 'verification_1', 'verification_2', 'approved', 'completed', 'rejected'],
        default: 'pending',
    },
    verifications: [{
        verifiedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
        stage: { type: Number, enum: [1, 2] },
        approved: Boolean,
        remarks: String,
        timestamp: { type: Date, default: Date.now },
    }],
    initiatedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    blockchainId: { type: Number, unique: true, sparse: true },
    transactionHash: String,
    hashChainRecordId: { type: mongoose.Schema.Types.ObjectId, ref: 'HashChainRecord', default: null },
}, { timestamps: true });

module.exports = mongoose.model('FundTransaction', fundTransactionSchema);
