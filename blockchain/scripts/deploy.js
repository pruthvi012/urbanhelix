const { ethers } = require("hardhat");
const fs = require("fs");
const path = require("path");

async function main() {
  const [deployer] = await ethers.getSigners();
  console.log("Deploying with wallet:", deployer.address);

  const balance = await deployer.provider.getBalance(deployer.address);
  console.log("Wallet balance:", ethers.formatEther(balance), "MATIC");

  const Factory = await ethers.getContractFactory("ExpenditureLogger");
  
  // Hardcode max gas fee so it fits in 0.1 MATIC (e.g. 15 gwei max fee, 15 gwei priority)
  const txOptions = {
      maxFeePerGas: ethers.parseUnits("35", "gwei"),
      maxPriorityFeePerGas: ethers.parseUnits("30", "gwei")
  };
  
  const contract = await Factory.deploy(txOptions);
  await contract.waitForDeployment();

  const address = await contract.getAddress();
  console.log("\n? ExpenditureLogger deployed to:", address);
  console.log("Network:", (await ethers.provider.getNetwork()).name);

  // Save ABI + address for the server to use
  const artifact = require("../artifacts/contracts/ExpenditureLogger.sol/ExpenditureLogger.json");
  const output = {
    address,
    abi: artifact.abi,
    network: (await ethers.provider.getNetwork()).chainId.toString()
  };

  const outPath = path.join(__dirname, "../../server/blockchain/ExpenditureLogger.json");
  fs.mkdirSync(path.dirname(outPath), { recursive: true });
  fs.writeFileSync(outPath, JSON.stringify(output, null, 2));
  console.log("? ABI + address saved to server/blockchain/ExpenditureLogger.json");
  console.log("\n?? Add these to your Vercel env vars:");
  console.log("   POLYGON_CONTRACT_ADDRESS =", address);
  console.log("   POLYGON_RPC_URL = https://rpc-amoy.polygon.technology");
}

main().catch(console.error);
