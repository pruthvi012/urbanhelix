const crypto = require('crypto');
const HashChainRecord = require('../models/HashChainRecord');

class HashChainService {
    /**
     * Compute SHA-256 hash of a string
     */
    static computeHash(data) {
        return crypto.createHash('sha256').update(data).digest('hex');
    }

    /**
     * Add a new record to the hash chain
     */
    static async addRecord(recordType, data, relatedEntity = null, createdBy = null, blockchainId = null, transactionHash = null) {
        // Get the last record in the chain
        const lastRecord = await HashChainRecord.findOne().sort({ sequenceNumber: -1 });

        const sequenceNumber = lastRecord ? lastRecord.sequenceNumber + 1 : 1;
        const previousHash = lastRecord ? lastRecord.recordHash : '0'.repeat(64); // Genesis block

        // Compute data hash
        const dataString = JSON.stringify(data);
        const dataHash = this.computeHash(dataString);

        // Compute record hash: SHA-256(dataHash + previousHash + sequenceNumber)
        const recordHash = this.computeHash(`${dataHash}${previousHash}${sequenceNumber}`);

        const record = await HashChainRecord.create({
            sequenceNumber,
            recordType,
            data,
            dataHash,
            previousHash,
            recordHash,
            relatedEntity,
            createdBy,
            blockchainId,
            transactionHash
        });

        return record;
    }

    /**
     * Verify the integrity of a single record
     */
    static async verifyRecord(recordId) {
        const record = await HashChainRecord.findById(recordId);
        if (!record) return { valid: false, error: 'Record not found' };

        // Recompute data hash
        const dataString = JSON.stringify(record.data);
        const expectedDataHash = this.computeHash(dataString);

        if (expectedDataHash !== record.dataHash) {
            return { valid: false, error: 'Data hash mismatch — data has been tampered with' };
        }

        // Recompute record hash
        const expectedRecordHash = this.computeHash(
            `${record.dataHash}${record.previousHash}${record.sequenceNumber}`
        );

        if (expectedRecordHash !== record.recordHash) {
            return { valid: false, error: 'Record hash mismatch — record has been tampered with' };
        }

        // Verify chain linkage (check previous record)
        if (record.sequenceNumber > 1) {
            const prevRecord = await HashChainRecord.findOne({ sequenceNumber: record.sequenceNumber - 1 });
            if (!prevRecord) {
                return { valid: false, error: 'Previous record missing — chain broken' };
            }
            if (prevRecord.recordHash !== record.previousHash) {
                return { valid: false, error: 'Previous hash mismatch — chain tampered' };
            }
        } else {
            // Genesis record
            if (record.previousHash !== '0'.repeat(64)) {
                return { valid: false, error: 'Genesis record has invalid previous hash' };
            }
        }

        return { valid: true, record };
    }

    /**
     * Verify the entire hash chain integrity
     */
    static async verifyChain() {
        const records = await HashChainRecord.find().sort({ sequenceNumber: 1 });

        if (records.length === 0) {
            return { valid: true, message: 'Chain is empty', totalRecords: 0 };
        }

        const errors = [];

        for (let i = 0; i < records.length; i++) {
            const record = records[i];

            // Verify data hash
            const dataString = JSON.stringify(record.data);
            const expectedDataHash = this.computeHash(dataString);
            if (expectedDataHash !== record.dataHash) {
                errors.push({ 
                    sequenceNumber: record.sequenceNumber, 
                    error: 'Data hash mismatch',
                    details: { expected: expectedDataHash, stored: record.dataHash }
                });
                continue;
            }

            // Verify record hash
            const expectedRecordHash = this.computeHash(
                `${record.dataHash}${record.previousHash}${record.sequenceNumber}`
            );
            if (expectedRecordHash !== record.recordHash) {
                errors.push({ 
                    sequenceNumber: record.sequenceNumber, 
                    error: 'Record hash mismatch',
                    details: { expected: expectedRecordHash, stored: record.recordHash }
                });
                continue;
            }

            // Verify chain linkage
            if (i === 0) {
                if (record.previousHash !== '0'.repeat(64)) {
                    errors.push({ sequenceNumber: record.sequenceNumber, error: 'Invalid genesis hash' });
                }
            } else {
                if (records[i - 1].recordHash !== record.previousHash) {
                    errors.push({ 
                        sequenceNumber: record.sequenceNumber, 
                        error: 'Chain link broken',
                        details: { expected: records[i - 1].recordHash, stored: record.previousHash }
                    });
                }
            }
        }

        return {
            valid: errors.length === 0,
            totalRecords: records.length,
            errors,
        };
    }

    /**
     * Get recent chain records with pagination
     */
    static async getRecentRecords(page = 1, limit = 20) {
        const records = await HashChainRecord.find()
            .sort({ sequenceNumber: -1 })
            .skip((page - 1) * limit)
            .limit(limit)
            .populate('createdBy', 'name email role');

        const total = await HashChainRecord.countDocuments();

        return { records, total, page, totalPages: Math.ceil(total / limit) };
    }

    /**
     * Verify the integrity of a project's current state against its linked hash record
     */
    static async verifyProjectIntegrity(projectId) {
        const Project = require('../models/Project');
        const project = await Project.findById(projectId);
        if (!project) return { valid: false, error: 'Project not found' };

        if (!project.hashChainRecordId) {
            return { valid: false, error: 'Project has no linked hash record' };
        }

        const record = await HashChainRecord.findById(project.hashChainRecordId);
        if (!record) return { valid: false, error: 'Linked hash record not found' };

        // Recompute data hash of the record to ensure the record itself isn't tampered
        const recordDataString = JSON.stringify(record.data);
        const expectedRecordDataHash = this.computeHash(recordDataString);
        if (expectedRecordDataHash !== record.dataHash) {
            return { valid: false, error: 'The audit record itself has been tampered with!' };
        }

        // Compare current project fields with record data
        const discrepancies = [];
        
        // Check budget
        const ledgerBudget = record.data.allocatedBudget || record.data.budget || record.data.estimatedBudget;
        const currentBudget = project.allocatedBudget || project.estimatedBudget;
        
        if (ledgerBudget && currentBudget && Number(ledgerBudget) !== Number(currentBudget)) {
            discrepancies.push({
                field: 'budget',
                ledger: ledgerBudget,
                current: currentBudget
            });
        }

        // Check status
        if (record.data.newStatus && record.data.newStatus !== project.status) {
            discrepancies.push({
                field: 'status',
                ledger: record.data.newStatus,
                current: project.status
            });
        }

        return {
            valid: discrepancies.length === 0,
            discrepancies,
            recordId: record._id,
            sequenceNumber: record.sequenceNumber,
            project: {
                title: project.title,
                projectCode: project.projectCode
            }
        };
    }
}

module.exports = HashChainService;
