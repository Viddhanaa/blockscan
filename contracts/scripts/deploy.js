const hre = require("hardhat");
const fs = require("fs");
const path = require("path");

async function main() {
  console.log("Starting ViddhanaKYC deployment...\n");

  // Get deployer account
  const [deployer] = await hre.ethers.getSigners();
  console.log("Deployer address:", deployer.address);

  // Get deployer balance
  const balance = await hre.ethers.provider.getBalance(deployer.address);
  console.log("Deployer balance:", hre.ethers.formatEther(balance), "ETH\n");

  // Deploy ViddhanaKYC contract
  console.log("Deploying ViddhanaKYC contract...");
  const ViddhanaKYC = await hre.ethers.getContractFactory("ViddhanaKYC");
  const viddhanaKYC = await ViddhanaKYC.deploy();

  await viddhanaKYC.waitForDeployment();

  const contractAddress = await viddhanaKYC.getAddress();
  const deploymentTx = viddhanaKYC.deploymentTransaction();

  console.log("\n========================================");
  console.log("ViddhanaKYC deployed successfully!");
  console.log("========================================");
  console.log("Contract address:", contractAddress);
  console.log("Transaction hash:", deploymentTx.hash);
  console.log("Block number:", deploymentTx.blockNumber || "pending");
  console.log("========================================\n");

  // Save deployment info
  const deploymentInfo = {
    contractName: "ViddhanaKYC",
    address: contractAddress,
    deployer: deployer.address,
    transactionHash: deploymentTx.hash,
    network: hre.network.name,
    chainId: (await hre.ethers.provider.getNetwork()).chainId.toString(),
    deployedAt: new Date().toISOString(),
  };

  const deploymentsDir = path.join(__dirname, "..", "deployments");
  if (!fs.existsSync(deploymentsDir)) {
    fs.mkdirSync(deploymentsDir, { recursive: true });
  }

  const deploymentPath = path.join(deploymentsDir, "viddhana.json");
  fs.writeFileSync(deploymentPath, JSON.stringify(deploymentInfo, null, 2));
  console.log("Deployment info saved to:", deploymentPath);

  // Verify the contract is working
  console.log("\nVerifying contract...");
  const owner = await viddhanaKYC.owner();
  console.log("Contract owner:", owner);
  
  const totalKYC = await viddhanaKYC.totalKYCCount();
  console.log("Initial KYC count:", totalKYC.toString());

  console.log("\nDeployment complete!");
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error("Deployment failed:", error);
    process.exit(1);
  });
