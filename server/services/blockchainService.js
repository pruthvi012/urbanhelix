const { ethers } = require('ethers');
const fs = require('fs');
const path = require('path');

class BlockchainService {
    constructor() {
        this.provider = new ethers.JsonRpcProvider(process.env.BLOCKCHAIN_RPC_URL || 'http://127.0.0.1:8545');
        this.wallet = new ethers.Wallet(
            process.env.BLOCKCHAIN_PRIVATE_KEY || '0xac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff80', // Hardhat Account #0
            this.provider
        );

        this.deploymentInfo = require('../config/deployments.json');
        this.contracts = {};

        this._initializeContracts();
    }

    _initializeContracts() {
        const contractsToLoad = ['FundAllocation', 'ProjectRegistry', 'MilestonePayment'];

        contractsToLoad.forEach(name => {
            const abiData = require(`../config/abis/${name}.json`);
            const address = this.deploymentInfo.contracts[name].address;
            this.contracts[name] = new ethers.Contract(address, abiData.abi, this.wallet);
        });
    }

    // --- FundAllocation Functions ---

    async createBudget(deptId, deptName, totalBudget, fiscalYear) {
        try {
            const tx = await this.contracts.FundAllocation.createBudget(
                deptId,
                deptName,
                ethers.parseEther(totalBudget.toString()),
                fiscalYear
            );
            return await tx.wait();
        } catch (error) {
            console.error('Blockchain Error (createBudget):', error);
            throw error;
        }
    }

    async allocateFund(deptId, amount, description) {
        try {
            const tx = await this.contracts.FundAllocation.allocateFund(
                deptId,
                ethers.parseEther(amount.toString()),
                description
            );
            return await tx.wait();
        } catch (error) {
            console.error('Blockchain Error (allocateFund):', error);
            throw error;
        }
    }

    // --- ProjectRegistry Functions ---

    async createProject(mongoId, title, deptId, estimatedBudget, dataHash) {
        try {
            const tx = await this.contracts.ProjectRegistry.createProject(
                mongoId,
                title,
                deptId,
                ethers.parseEther(estimatedBudget.toString()),
                dataHash
            );
            const receipt = await tx.wait();

            // Extract ProjectCreated event
            const event = receipt.logs.map(log => {
                try {
                    return this.contracts.ProjectRegistry.interface.parseLog(log);
                } catch (e) {
                    return null;
                }
            }).find(e => e && e.name === 'ProjectCreated');

            return {
                hash: receipt.hash,
                blockchainId: event ? Number(event.args.projectId) : null
            };
        } catch (error) {
            console.error('Blockchain Error (createProject):', error);
            throw error;
        }
    }

    async approveProject(blockchainId, allocatedBudget, remarks) {
        try {
            const tx = await this.contracts.ProjectRegistry.approveProject(
                blockchainId,
                ethers.parseEther(allocatedBudget.toString()),
                remarks
            );
            return await tx.wait();
        } catch (error) {
            console.error('Blockchain Error (approveProject):', error);
            throw error;
        }
    }

    async updateProjectStatus(blockchainId, newStatus, remarks) {
        try {
            const statusMap = {
                'proposed': 0,
                'approved': 1,
                'in_progress': 2,
                'verification': 3,
                'completed': 4,
                'rejected': 5
            };

            const statusIndex = statusMap[newStatus];
            const tx = await this.contracts.ProjectRegistry.updateStatus(
                blockchainId,
                statusIndex,
                remarks
            );
            return await tx.wait();
        } catch (error) {
            console.error('Blockchain Error (updateProjectStatus):', error);
            throw error;
        }
    }

    // --- MilestonePayment Functions ---

    async submitMilestone(projBlockchainId, mongoId, title, amount, proofHash) {
        try {
            const tx = await this.contracts.MilestonePayment.submitMilestone(
                projBlockchainId,
                mongoId,
                title,
                ethers.parseEther(amount.toString()),
                proofHash
            );
            const receipt = await tx.wait();

            const event = receipt.logs.map(log => {
                try {
                    return this.contracts.MilestonePayment.interface.parseLog(log);
                } catch (e) {
                    return null;
                }
            }).find(e => e && e.name === 'MilestoneSubmitted');

            return {
                hash: receipt.hash,
                blockchainId: event ? Number(event.args.milestoneId) : null
            };
        } catch (error) {
            console.error('Blockchain Error (submitMilestone):', error);
            throw error;
        }
    }

    async engineerApproveMilestone(milestoneBlockchainId) {
        try {
            const tx = await this.contracts.MilestonePayment.engineerApprove(milestoneBlockchainId);
            return await tx.wait();
        } catch (error) {
            console.error('Blockchain Error (engineerApproveMilestone):', error);
            throw error;
        }
    }

    async financialApproveAndPay(milestoneBlockchainId, txRef) {
        try {
            const tx = await this.contracts.MilestonePayment.financialApproveAndPay(
                milestoneBlockchainId,
                txRef
            );
            return await tx.wait();
        } catch (error) {
            console.error('Blockchain Error (financialApproveAndPay):', error);
            throw error;
        }
    }
}

module.exports = new BlockchainService();
