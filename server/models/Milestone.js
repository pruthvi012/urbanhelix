const mongoose = require('mongoose');

const milestoneSchema = new mongoose.Schema({
    project: { type: mongoose.Schema.Types.ObjectId, ref: 'Project', required: true },
    title: { type: String, required: true, trim: true },
    description: { type: String, default: '' },
    milestoneNumber: { type: Number, required: true },
    amount: { type: Number, required: true },
    status: {
        type: String,
        enum: ['pending', 'submitted', 'under_review', 'approved', 'rejected', 'paid'],
        default: 'pending',
    },
    submittedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },
    proofDocuments: [{
        filename: String,
        originalName: String,
        mimeType: String,
        data: String, // Base64 encoded
        uploadedAt: { type: Date, default: Date.now },
    }],
    engineerApproval: {
        approved: { type: Boolean, default: false },
        approvedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },
        approvedAt: { type: Date, default: null },
        remarks: { type: String, default: '' },
    },
    financialApproval: {
        approved: { type: Boolean, default: false },
        approvedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },
        approvedAt: { type: Date, default: null },
        remarks: { type: String, default: '' },
    },
    dueDate: { type: Date, default: null },
    completedDate: { type: Date, default: null },
    blockchainId: { type: Number, unique: true, sparse: true },
    transactionHash: String,
    hashChainRecordId: { type: mongoose.Schema.Types.ObjectId, ref: 'HashChainRecord', default: null },
}, { timestamps: true });

module.exports = mongoose.model('Milestone', milestoneSchema);
