const { S3Client } = require("@aws-sdk/client-s3");
const multer = require("multer");
const multerS3 = require("multer-s3");
const crypto = require("crypto");
const ProjectAsset = require("../models/ProjectAsset");

// Configure S3 Client
const s3 = new S3Client({
    region: process.env.AWS_REGION,
    credentials: {
        accessKeyId: process.env.AWS_ACCESS_KEY_ID,
        secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
    },
});

// Utility to generate hash for a file
const generateFileHash = (buffer) => {
    return crypto.createHash('sha256').update(buffer).digest('hex');
};

// Multer S3 Storage Configuration
const uploadToS3 = multer({
    storage: multerS3({
        s3: s3,
        bucket: process.env.AWS_S3_BUCKET,
        acl: 'public-read',
        metadata: function (req, file, cb) {
            cb(null, { fieldName: file.fieldname });
        },
        key: function (req, file, cb) {
            const ext = file.originalname.split('.').pop();
            const fileName = `${Date.now()}-${Math.round(Math.random() * 1E9)}.${ext}`;
            cb(null, `urbanhelix/${file.fieldname}/${fileName}`);
        }
    })
});

// Middleware to record asset in MongoDB after S3 upload
const recordAssetMetadata = async (req, res, next) => {
    if (!req.files && !req.file) return next();

    try {
        const files = req.file ? [req.file] : (Object.values(req.files).flat());

        for (const file of files) {
            // Note: Since multer-s3 doesn't provide the buffer easily for hashing,
            // we typically hash the file stream or the file name + metadata for proof,
            // or we use a separate hash generator if the user needs a content-based hash.
            // For now, we'll store the S3 location and generate a unique transaction-based hash.

            const asset = new ProjectAsset({
                projectId: req.params.id || req.body.projectId,
                assetType: mapFieldToType(file.fieldname),
                fileUrl: file.location,
                fileName: file.originalname,
                fileHash: file.etag || crypto.createHash('sha256').update(file.location).digest('hex'),
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

module.exports = { uploadToS3, recordAssetMetadata, s3 };
