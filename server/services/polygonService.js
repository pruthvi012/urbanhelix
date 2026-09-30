const { ethers } = require('ethers');
const Project = require('../models/Project');

const POLYGON_RPC_URL = process.env.POLYGON_RPC_URL || 'https://polygon-amoy.drpc.org';
const POLYGON_PRIVATE_KEY = process.env.POLYGON_PRIVATE_KEY;
const EXPENDITURE_LOGGER_ADDRESS = process.env.EXPENDITURE_LOGGER_ADDRESS;

// Matches the deployed ExpenditureLogger ABI used by the application.
const abi = [
    "function logExpenditure(string projectCode, string vendor, uint256 amount, string sha256Hash) external"
];

let contract = null;
let provider = null;
let wallet = null;

if (POLYGON_PRIVATE_KEY && EXPENDITURE_LOGGER_ADDRESS) {
    try {
        provider = new ethers.JsonRpcProvider(POLYGON_RPC_URL);
        wallet = new ethers.Wallet(POLYGON_PRIVATE_KEY, provider);
        contract = new ethers.Contract(EXPENDITURE_LOGGER_ADDRESS, abi, wallet);
        console.log('Polygon Amoy connected successfully.');
    } catch (err) {
        console.error('Failed to initialize Polygon connection:', err);
    }
} else {
    console.warn('Polygon credentials missing. Blockchain logging will be disabled.');
}


async function recordExpenditureOnChain(projectId, expId, projectCode, vendor, amount, sha256Hash) {
    // Mark as processing
    await Project.updateOne(
        { _id: projectId, 'expenditures._id': expId },
        { $set: { 'expenditures.$.blockchainStatus': 'processing' } }
    );

    if (!contract) {
        console.warn('Cannot write to blockchain: Contract not initialized.');
        await Project.updateOne(
            { _id: projectId, 'expenditures._id': expId },
            { $set: { 'expenditures.$.blockchainStatus': 'failed' } }
        );
        return;
    }

    try {
        console.log(`Writing expenditure ${expId} to Polygon Amoy...`);
        const tx = await contract.logExpenditure(
            expId.toString(),
            projectCode,
            vendor,
            Math.floor(amount),
            sha256Hash
        );
        
        console.log(`Transaction sent: ${tx.hash}. Waiting for confirmation...`);
        const receipt = await tx.wait();
        console.log(`Transaction confirmed in block ${receipt.blockNumber}`);
        
        await Project.updateOne(
            { _id: projectId, 'expenditures._id': expId },
            { $set: { 
                'expenditures.$.txHash': tx.hash,
                'expenditures.$.blockchainStatus': 'completed' 
            }}
        );
    } catch (err) {
        console.error('Error writing to Polygon:', err);
        await Project.updateOne(
            { _id: projectId, 'expenditures._id': expId },
            { $set: { 'expenditures.$.blockchainStatus': 'failed' } }
        );
    }
}

// Retry keeps looking at ${failed} in a separate setInterval if we want it.

module.exports = {
    recordExpenditureOnChain,
    // Reuses the deployed logger: the vendor field identifies the immutable
    // record type and the hash field contains the document commitment.
    async anchorIntegrityHash(projectCode, recordType, commitmentHash) {
        if (!contract) throw new Error('Polygon integrity anchor is not configured');
        const tx = await contract.logExpenditure(projectCode, `INTEGRITY:${recordType}`, 0, commitmentHash);
        const receipt = await tx.wait();
        if (!receipt || receipt.status !== 1) throw new Error('Polygon integrity anchor transaction failed');
        return { txHash: tx.hash, blockNumber: Number(receipt.blockNumber) };
    },
    async verifyIntegrityAnchor(txHash, projectCode, recordType, commitmentHash) {
        if (!contract || !provider || !txHash) return false;
        const [tx, receipt] = await Promise.all([provider.getTransaction(txHash), provider.getTransactionReceipt(txHash)]);
        if (!tx || !receipt || receipt.status !== 1 || tx.to?.toLowerCase() !== contract.target.toLowerCase()) return false;
        const parsed = contract.interface.parseTransaction({ data: tx.data, value: tx.value });
        return parsed?.name === 'logExpenditure'
            && String(parsed.args[0]) === String(projectCode)
            && String(parsed.args[1]) === `INTEGRITY:${recordType}`
            && String(parsed.args[2]) === '0'
            && String(parsed.args[3]).toLowerCase() === String(commitmentHash).toLowerCase();
    }
};
