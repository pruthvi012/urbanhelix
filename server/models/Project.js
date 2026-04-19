const mongoose = require('mongoose');

const projectSchema = new mongoose.Schema({
    title: { type: String, required: true, trim: true },
    description: { type: String, required: true },
    category: {
        type: String,
        enum: ['road', 'water_supply', 'sanitation', 'electricity', 'park', 'building', 'bridge', 'drainage', 'other'],
        default: 'other',
    },
    department: { type: mongoose.Schema.Types.ObjectId, ref: 'Department', required: true },
    proposedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    engineer: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },
    contractor: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },
    estimatedBudget: { type: Number, required: true },
    allocatedBudget: { type: Number, default: 0 },
    spentBudget: { type: Number, default: 0 },
    isPublic: { type: Boolean, default: true },
    status: {
        type: String,
        enum: ['proposed', 'approved', 'in_progress', 'verification', 'completed', 'rejected'],
        default: 'proposed',
    },
    location: {
        ward: { type: String, default: '' },
        address: { type: String, default: '' },
        coordinates: {
            lat: { type: Number, default: null },
            lng: { type: Number, default: null },
        },
    },
    startDate: { type: Date, default: null },
    expectedEndDate: { type: Date, default: null },
    actualEndDate: { type: Date, default: null },
    priority: {
        type: String,
        enum: ['low', 'medium', 'high', 'critical'],
        default: 'medium',
    },
    hashChainRecordId: { type: mongoose.Schema.Types.ObjectId, ref: 'HashChainRecord', default: null },
    blockchainId: { type: Number, unique: true, sparse: true },
    transactionHash: String,
    lastTransactionHash: String,
    imageUrl: String,
    reportUrl: String,
    verifications: [
        {
            stage: Number,
            verifiedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
            timestamp: { type: Date, default: Date.now },
            approved: Boolean,
            remarks: String,
            transactionHash: String
        }
    ],
    contactEmail: String,
    statusHistory: [{
        status: {
            type: String,
            enum: ['proposed', 'approved', 'in_progress', 'verification', 'completed', 'rejected']
        },
        changedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
        timestamp: { type: Date, default: Date.now },
        remarks: { type: String, default: '' },
        transactionHash: String
    }],
}, { timestamps: true });

module.exports = mongoose.model('Project', projectSchema);
