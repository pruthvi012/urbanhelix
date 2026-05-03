const mongoose = require('mongoose');

const projectSchema = new mongoose.Schema({
    projectCode: { type: String, unique: true, sparse: true },
    title: { type: String, required: true, trim: true },
    description: { type: String, required: true },
    category: {
        type: String,
        enum: ['road', 'water_supply', 'sanitation', 'electricity', 'park', 'building', 'bridge', 'drainage', 'other'],
        default: 'other',
    },
    department: { type: mongoose.Schema.Types.ObjectId, ref: 'Department', required: false },
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
        ward: { type: String, required: true },
        wardNo: { type: Number },
        area: { type: String, required: true },
        address: { type: String },
        coordinates: {
            lat: Number,
            lng: Number
        }
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
    progressPhotos: [{
        url: String,
        description: String,
        timestamp: { type: Date, default: Date.now }
    }],
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
    budgetEstimateProofUrl: String,
    isBudgetLocked: { type: Boolean, default: false },
    expenditures: [{
        date: { type: Date, required: true },
        invoiceDate: { type: Date, required: true },
        amount: { type: Number, required: true },
        material: { type: String, required: true },
        vendor: { type: String, required: true },
        invoiceUrl: { type: String, required: true },
        progressPhotoUrl: { type: String },
        gpsLat: { type: Number },
        gpsLng: { type: Number },
        remarks: { type: String },
        entryHash: { type: String, required: true },
        recordedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
        timestamp: { type: Date, default: Date.now },
        engineerVerified: { type: Boolean, default: false },
        verifiedByEngineer: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },
        verifiedAt: { type: Date, default: null },
        verificationRemarks: { type: String, default: '' },
        readyForPayment: { type: Boolean, default: false },
        verificationPhotoUrl: { type: String, default: null },
        financeReleased: { type: Boolean, default: false },
        releasedByFinance: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },
        releasedAt: { type: Date, default: null }
    }],
    budgetRevisionHistory: [{
        oldBudget: Number,
        newBudget: Number,
        reason: String,
        timestamp: { type: Date, default: Date.now },
        changedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
        transactionHash: String
    }],
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
