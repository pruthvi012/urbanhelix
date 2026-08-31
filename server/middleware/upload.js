const multer = require('multer');
const path = require('path');
const fs = require('fs');
const { BlobServiceClient } = require('@azure/storage-blob');
const { Readable } = require('stream');

// ─── Azure Blob Storage Configuration ───
let containerClient = null;
if (process.env.AZURE_STORAGE_CONNECTION_STRING && process.env.AZURE_STORAGE_CONTAINER) {
    try {
        const blobServiceClient = BlobServiceClient.fromConnectionString(process.env.AZURE_STORAGE_CONNECTION_STRING);
        containerClient = blobServiceClient.getContainerClient(process.env.AZURE_STORAGE_CONTAINER);
        // Auto-create the container if it doesn't exist
        containerClient.createIfNotExists({ access: 'blob' })
            .then(() => console.log('✅ Azure Blob Storage connected: container "' + process.env.AZURE_STORAGE_CONTAINER + '"'))
            .catch(err => {
                console.warn('⚠️ Azure container creation failed, falling back to local storage:', err.message);
                containerClient = null;
            });
    } catch (err) {
        console.warn('⚠️ Azure Blob Storage init failed, falling back to local storage:', err.message);
        containerClient = null;
    }
}

// ─── Ensure local upload directories exist (fallback) ───
const uploadDir = path.join(__dirname, '../uploads');
try {
    if (!fs.existsSync(uploadDir)) fs.mkdirSync(uploadDir);
} catch (err) {
    console.warn('⚠️ Local uploads directory creation failed (non-critical on serverless):', err.message);
}

// ─── Custom Multer Storage Engine for Azure Blob ───
class AzureBlobStorage {
    constructor(opts) {
        this.containerClient = opts.containerClient;
    }

    _handleFile(req, file, cb) {
        let folder = 'others';
        if (req.originalUrl.includes('projects')) folder = 'projects';
        else if (req.originalUrl.includes('grievances')) folder = 'grievances';

        const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
        const blobName = `${folder}/${file.fieldname}-${uniqueSuffix}${path.extname(file.originalname)}`;

        const blockBlobClient = this.containerClient.getBlockBlobClient(blobName);

        // Collect the file stream into a buffer, then upload
        const chunks = [];
        file.stream.on('data', (chunk) => chunks.push(chunk));
        file.stream.on('error', (err) => cb(err));
        file.stream.on('end', async () => {
            try {
                const buffer = Buffer.concat(chunks);
                await blockBlobClient.uploadData(buffer, {
                    blobHTTPHeaders: { blobContentType: file.mimetype }
                });

                cb(null, {
                    location: blockBlobClient.url,
                    key: blobName,
                    size: buffer.length,
                    bucket: process.env.AZURE_STORAGE_CONTAINER
                });
            } catch (err) {
                cb(err);
            }
        });
    }

    _removeFile(req, file, cb) {
        if (file.key) {
            const blockBlobClient = this.containerClient.getBlockBlobClient(file.key);
            blockBlobClient.deleteIfExists().then(() => cb(null)).catch(cb);
        } else {
            cb(null);
        }
    }
}

// ─── Dynamic Storage Engine ───
const getStorage = () => {
    // Priority 1: Azure Blob Storage
    if (containerClient) {
        return new AzureBlobStorage({ containerClient });
    }

    // Priority 2: Memory storage for serverless (Vercel)
    if (process.env.NODE_ENV === 'production' || process.env.VERCEL) {
        return multer.memoryStorage();
    }

    // Priority 3: Local disk storage (fallback — always works)
    return multer.diskStorage({
        destination: (req, file, cb) => {
            let folder = 'others';
            if (req.originalUrl.includes('projects')) folder = 'projects';
            else if (req.originalUrl.includes('grievances')) folder = 'grievances';

            const dest = path.join(uploadDir, folder);
            if (!fs.existsSync(dest)) {
                try {
                    fs.mkdirSync(dest, { recursive: true });
                } catch (err) {
                    console.error('Failed to create upload directory:', err);
                }
            }
            cb(null, dest);
        },
        filename: (req, file, cb) => {
            const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
            cb(null, file.fieldname + '-' + uniqueSuffix + path.extname(file.originalname));
        }
    });
};

const fileFilter = (req, file, cb) => {
    const allowedTypes = [
        'image/jpeg', 'image/jpg', 'image/png', 'image/webp', 
        'application/pdf', 'application/x-pdf', 'image/heic', 'image/heif'
    ];
    if (allowedTypes.includes(file.mimetype)) {
        cb(null, true);
    } else {
        cb(new Error('Invalid file type. Only JPEG, PNG, WEBP and PDF are allowed.'), false);
    }
};

const upload = multer({
    storage: getStorage(),
    fileFilter: fileFilter,
    limits: { fileSize: 50 * 1024 * 1024 }
});

module.exports = upload;
