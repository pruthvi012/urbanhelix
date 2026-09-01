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
    proofHash: String,
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
    completionInvoiceUrl: String,
    completionSupplier: String,
    // Final bills are kept as an append-only history. Only one item may be active;
    // rejected bills that explicitly require correction remain in this array.
    finalBills: [{
        billUrl: { type: String, required: true },
        storageKey: { type: String, default: null },
        supplier: { type: String, required: true },
        claimedAmount: { type: Number, required: true },
        originalFileHash: { type: String, required: true },
        metadataSnapshot: { type: mongoose.Schema.Types.Mixed, required: true },
        metadataHash: { type: String, required: true },
        hashChainRecordId: { type: mongoose.Schema.Types.ObjectId, ref: 'HashChainRecord', default: null },
        workflowSnapshot: { type: mongoose.Schema.Types.Mixed, required: true },
        workflowHash: { type: String, required: true },
        workflowHashChainRecordId: { type: mongoose.Schema.Types.ObjectId, ref: 'HashChainRecord', default: null },
        submittedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
        submittedAt: { type: Date, default: Date.now },
        active: { type: Boolean, default: true },
        status: {
            type: String,
            enum: ['submitted', 'engineer_verified', 'approved', 'rejected', 'correction_required', 'suspicious'],
            default: 'submitted'
        },
        suspicious: { type: Boolean, default: false },
        tamperReason: { type: String, default: '' },
        engineerVerifiedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },
        engineerVerifiedAt: { type: Date, default: null },
        approvalAuthorityBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },
        approvalAuthorityAt: { type: Date, default: null },
        financeReleased: { type: Boolean, default: false },
        releasedByFinance: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },
        releasedAt: { type: Date, default: null },
        rejectionReason: { type: String, default: '' },
        correctionRequired: { type: Boolean, default: false }
    }],
    paymentBlocked: { type: Boolean, default: false },
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
        verificationGpsLat: { type: Number, default: null },
        verificationGpsLng: { type: Number, default: null },
        verificationPhotoHash: { type: String, default: null },
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

projectSchema.index({ _id: 1, 'finalBills.active': 1 });

module.exports = mongoose.model('Project', projectSchema);
