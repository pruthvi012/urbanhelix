const { ethers } = require('ethers');
const Project = require('../models/Project');

const POLYGON_RPC_URL = process.env.POLYGON_RPC_URL || 'https://rpc-amoy.polygon.technology';
const POLYGON_PRIVATE_KEY = process.env.POLYGON_PRIVATE_KEY;
const EXPENDITURE_LOGGER_ADDRESS = process.env.EXPENDITURE_LOGGER_ADDRESS;

const abi = [
    "function logExpenditure(string _expenditureId, string _projectCode, string _vendor, uint256 _amount, string _sha256Hash) external"
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
    recordExpenditureOnChain
};