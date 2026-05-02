const mongoose = require('mongoose');

const projectAssetSchema = new mongoose.Schema({
    projectId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Project',
        required: true
    },
    assetType: {
        type: String,
        enum: ['photo', 'bill', 'report', 'proof'],
        required: true
    },
    fileUrl: {
        type: String,
        required: true
    },
    fileName: String,
    fileHash: {
        type: String,
        required: true
    },
    uploadedBy: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User'
    },
    timestamp: {
        type: Date,
        default: Date.now
    }
});

// Index for quick lookups
projectAssetSchema.index({ projectId: 1, assetType: 1 });

module.exports = mongoose.model('ProjectAsset', projectAssetSchema);
