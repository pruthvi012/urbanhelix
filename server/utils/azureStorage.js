const { BlobServiceClient } = require('@azure/storage-blob');
const multer = require('multer');
const crypto = require('crypto');
const ProjectAsset = require('../models/ProjectAsset');

// ─── Azure Blob Storage Client ───
let containerClient = null;
if (process.env.AZURE_STORAGE_CONNECTION_STRING && process.env.AZURE_STORAGE_CONTAINER) {
    try {
        const blobServiceClient = BlobServiceClient.fromConnectionString(process.env.AZURE_STORAGE_CONNECTION_STRING);
        containerClient = blobServiceClient.getContainerClient(process.env.AZURE_STORAGE_CONTAINER);
    } catch (err) {
        console.warn('⚠️ Azure Storage init failed in azureStorage.js:', err.message);
    }
}

// Utility to generate hash for a file
const generateFileHash = (buffer) => {
    return crypto.createHash('sha256').update(buffer).digest('hex');
};

// Upload a buffer directly to Azure Blob
const uploadBufferToAzure = async (buffer, blobName, contentType) => {
    if (!containerClient) throw new Error('Azure Storage not configured');
    const blockBlobClient = containerClient.getBlockBlobClient(blobName);
    await blockBlobClient.uploadData(buffer, {
        blobHTTPHeaders: { blobContentType: contentType }
    });
    return blockBlobClient.url;
};

// Middleware to record asset in MongoDB after upload
const recordAssetMetadata = async (req, res, next) => {
    if (!req.files && !req.file) return next();

    try {
        const files = req.file ? [req.file] : (Object.values(req.files).flat());

        for (const file of files) {
            const fileUrl = file.location || file.path || '';
            const asset = new ProjectAsset({
                projectId: req.params.id || req.body.projectId,
                assetType: mapFieldToType(file.fieldname),
                fileUrl: fileUrl,
                fileName: file.originalname,
                fileHash: file.key
                    ? crypto.createHash('sha256').update(fileUrl).digest('hex')
                    : (file.buffer ? generateFileHash(file.buffer) : crypto.createHash('sha256').update(fileUrl).digest('hex')),
                uploadedBy: req.user?._id,
                timestamp: new Date()
            });
            await asset.save();
        }
        next();
    } catch (error) {
        console.error('Error recording asset metadata:', error);
        next(); // Don't block the request if metadata recording fails
    }
};

const mapFieldToType = (field) => {
    if (field.includes('photo')) return 'photo';
    if (field.includes('bill')) return 'bill';
    if (field.includes('report')) return 'report';
    return 'proof';
};

module.exports = { uploadBufferToAzure, recordAssetMetadata, generateFileHash, containerClient };
