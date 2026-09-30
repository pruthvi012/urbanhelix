const Project = require('../models/Project');
const blockchainService = require('./blockchainService');

class QueueProcessor {
    constructor() {
        this.isRunning = false;
    }

    start(intervalMs = 5 * 60 * 1000) { // 5 minutes by default
        console.log(`[QueueProcessor] Starting background worker for Polygon integration (interval: ${intervalMs}ms)`);
        
        // Run immediately on start
        this.processQueue();

        // Then schedule interval
        setInterval(() => {
            this.processQueue();
        }, intervalMs);
    }

    async processQueue() {
        if (this.isRunning) return;
        this.isRunning = true;

        try {
            // Find projects that have at least one expenditure stuck in 'pending' or 'failed' (but limit retries ideally, for now just pending or failed)
            const projects = await Project.find({
                'expenditures.blockchainStatus': { $in: ['pending', 'failed'] }
            });

            if (projects.length === 0) {
                this.isRunning = false;
                return;
            }

            console.log(`[QueueProcessor] Found ${projects.length} project(s) with pending blockchain writes.`);

            for (let project of projects) {
                let modified = false;

                for (let exp of project.expenditures) {
                    if (exp.blockchainStatus === 'pending' || exp.blockchainStatus === 'failed') {
                        try {
                            exp.blockchainStatus = 'processing';
                            await project.save(); // lock it

                            const result = await blockchainService.logExpenditure(
                                project.projectCode || project._id.toString(),
                                exp.vendor,
                                exp.amount,
                                exp.entryHash
                            );

                            if (result && result.txHash) {
                                exp.txHash = result.txHash;
                                exp.blockchainStatus = 'completed';
                                modified = true;
                                console.log(`[QueueProcessor] ✅ Successfully logged expenditure ${exp._id} to Polygon: ${result.txHash}`);
                            }
                        } catch (err) {
                            console.error(`[QueueProcessor] ❌ Failed to log expenditure ${exp._id}:`, err.message);
                            exp.blockchainStatus = 'failed';
                            modified = true;
                        }
                    }
                }

                if (modified) {
                    await project.save();
                }
            }

        } catch (error) {
            console.error('[QueueProcessor] Fatal error processing queue:', error);
        } finally {
            this.isRunning = false;
        }
    }
}

module.exports = new QueueProcessor();
