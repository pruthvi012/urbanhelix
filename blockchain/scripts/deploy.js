const hre = require("hardhat");
const fs = require("fs");
const path = require("path");

async function main() {
    console.log("🚀 Deploying UrbanHeliX Smart Contracts...\n");

    const [deployer] = await hre.ethers.getSigners();
    console.log("📍 Deploying with account:", deployer.address);
    console.log("💰 Account balance:", (await hre.ethers.provider.getBalance(deployer.address)).toString());
    console.log("");

    // Deploy FundAllocation
    const FundAllocation = await hre.ethers.getContractFactory("FundAllocation");
    const fundAllocation = await FundAllocation.deploy();
    await fundAllocation.waitForDeployment();
    const fundAddr = await fundAllocation.getAddress();
    console.log("✅ FundAllocation deployed to:", fundAddr);

    // Deploy ProjectRegistry
    const ProjectRegistry = await hre.ethers.getContractFactory("ProjectRegistry");
    const projectRegistry = await ProjectRegistry.deploy();
    await projectRegistry.waitForDeployment();
    const projAddr = await projectRegistry.getAddress();
    console.log("✅ ProjectRegistry deployed to:", projAddr);

    // Deploy MilestonePayment
    const MilestonePayment = await hre.ethers.getContractFactory("MilestonePayment");
    const milestonePayment = await MilestonePayment.deploy();
    await milestonePayment.waitForDeployment();
    const msAddr = await milestonePayment.getAddress();
    console.log("✅ MilestonePayment deployed to:", msAddr);

    console.log("\n🎉 All contracts deployed!\n");

    // Save deployment addresses to a JSON file for the backend to read
    const deploymentInfo = {
        network: hre.network.name,
        chainId: (await hre.ethers.provider.getNetwork()).chainId.toString(),
        deployer: deployer.address,
        deployedAt: new Date().toISOString(),
        contracts: {
            FundAllocation: { address: fundAddr },
            ProjectRegistry: { address: projAddr },
            MilestonePayment: { address: msAddr },
        },
    };

    // Save to blockchain directory
    const deployPath = path.join(__dirname, "..", "deployments.json");
    fs.writeFileSync(deployPath, JSON.stringify(deploymentInfo, null, 2));
    console.log("📄 Deployment info saved to:", deployPath);

    // Also copy to server config directory so backend can read it
    const serverConfigPath = path.join(__dirname, "..", "..", "server", "config", "deployments.json");
    fs.writeFileSync(serverConfigPath, JSON.stringify(deploymentInfo, null, 2));
    console.log("📄 Deployment info copied to server config:", serverConfigPath);

    // Copy ABIs to server so backend can interact with contracts
    const abiDir = path.join(__dirname, "..", "..", "server", "config", "abis");
    if (!fs.existsSync(abiDir)) fs.mkdirSync(abiDir, { recursive: true });

    const contracts = ["FundAllocation", "ProjectRegistry", "MilestonePayment"];
    for (const name of contracts) {
        const artifact = await hre.artifacts.readArtifact(name);
        fs.writeFileSync(
            path.join(abiDir, `${name}.json`),
            JSON.stringify({ abi: artifact.abi }, null, 2)
        );
    }
    console.log("📄 Contract ABIs copied to server config/abis/");

    console.log("\n🏁 Deployment complete! Backend can now interact with the blockchain.");
}

main()
    .then(() => process.exit(0))
    .catch((error) => {
        console.error("❌ Deployment failed:", error);
        process.exit(1);
    });
