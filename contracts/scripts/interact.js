const hre = require("hardhat");
const fs = require("fs");
const path = require("path");

async function main() {
  console.log("Loading ViddhanaKYC contract...\n");

  // Load deployment info
  const deploymentPath = path.join(__dirname, "..", "deployments", "viddhana.json");
  
  if (!fs.existsSync(deploymentPath)) {
    throw new Error("Deployment file not found. Please deploy the contract first.");
  }

  const deployment = JSON.parse(fs.readFileSync(deploymentPath, "utf8"));
  console.log("Loaded deployment from:", deploymentPath);
  console.log("Contract address:", deployment.address);
  console.log("Network:", deployment.network);
  console.log("");

  // Get signer
  const [signer] = await hre.ethers.getSigners();
  console.log("Using account:", signer.address);

  // Get contract instance
  const ViddhanaKYC = await hre.ethers.getContractFactory("ViddhanaKYC");
  const contract = ViddhanaKYC.attach(deployment.address);

  // Example interactions
  console.log("\n========================================");
  console.log("Contract Interaction Examples");
  console.log("========================================\n");

  // Check current state
  const owner = await contract.owner();
  console.log("Contract owner:", owner);

  const totalKYC = await contract.totalKYCCount();
  console.log("Total KYC count:", totalKYC.toString());

  // Example: Set KYC for an address
  const testAddress = "0x70997970C51812dc3A010C7d01b50e0d17dc79C8"; // Example address
  
  console.log("\n--- Setting KYC Status ---");
  console.log("Address:", testAddress);
  
  // Check current status
  const currentStatus = await contract.isKYC(testAddress);
  console.log("Current KYC status:", currentStatus);

  if (!currentStatus) {
    console.log("Setting KYC to true...");
    const tx = await contract.setKYC(testAddress, true);
    await tx.wait();
    console.log("Transaction hash:", tx.hash);
  }

  // Get updated info
  const [status, timestamp] = await contract.getKYCInfo(testAddress);
  console.log("\n--- KYC Info ---");
  console.log("Status:", status);
  console.log("Timestamp:", timestamp.toString());
  console.log("Date:", new Date(Number(timestamp) * 1000).toISOString());

  // Check isKYC
  const isVerified = await contract.isKYC(testAddress);
  console.log("isKYC:", isVerified);

  // Get timestamp only
  const kycTimestamp = await contract.getKYCTimestamp(testAddress);
  console.log("KYC Timestamp:", kycTimestamp.toString());

  // Updated total count
  const newTotalKYC = await contract.totalKYCCount();
  console.log("\nUpdated total KYC count:", newTotalKYC.toString());

  // Example: Batch set KYC
  console.log("\n--- Batch KYC Example ---");
  const batchAddresses = [
    "0x3C44CdDdB6a900fa2b585dd299e03d12FA4293BC",
    "0x90F79bf6EB2c4f870365E785982E1f101E93b906",
  ];
  
  console.log("Setting KYC for batch:", batchAddresses);
  const batchTx = await contract.batchSetKYC(batchAddresses, true);
  await batchTx.wait();
  console.log("Batch transaction hash:", batchTx.hash);

  const finalTotalKYC = await contract.totalKYCCount();
  console.log("Final total KYC count:", finalTotalKYC.toString());

  console.log("\n========================================");
  console.log("Interaction complete!");
  console.log("========================================");
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error("Interaction failed:", error);
    process.exit(1);
  });
