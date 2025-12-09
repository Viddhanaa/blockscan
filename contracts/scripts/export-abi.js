const fs = require("fs");
const path = require("path");

async function main() {
  console.log("Exporting ViddhanaKYC ABI...\n");

  // Path to the compiled artifact
  const artifactPath = path.join(
    __dirname,
    "..",
    "artifacts",
    "contracts",
    "ViddhanaKYC.sol",
    "ViddhanaKYC.json"
  );

  // Check if artifact exists
  if (!fs.existsSync(artifactPath)) {
    throw new Error(
      "Artifact not found. Please compile the contract first with 'npm run compile'"
    );
  }

  // Load artifact
  const artifact = JSON.parse(fs.readFileSync(artifactPath, "utf8"));
  console.log("Loaded artifact from:", artifactPath);

  // Extract ABI
  const abi = artifact.abi;
  console.log("ABI entries:", abi.length);

  // Ensure abi directory exists
  const abiDir = path.join(__dirname, "..", "abi");
  if (!fs.existsSync(abiDir)) {
    fs.mkdirSync(abiDir, { recursive: true });
  }

  // Save ABI to file
  const abiPath = path.join(abiDir, "ViddhanaKYC.json");
  fs.writeFileSync(abiPath, JSON.stringify(abi, null, 2));
  console.log("ABI saved to:", abiPath);

  // Also create a simplified version with just function signatures
  console.log("\n--- ABI Summary ---");
  abi.forEach((item) => {
    if (item.type === "function") {
      const inputs = item.inputs.map((i) => `${i.type} ${i.name}`).join(", ");
      const outputs = item.outputs.map((o) => o.type).join(", ");
      console.log(`  ${item.name}(${inputs}) -> (${outputs})`);
    } else if (item.type === "event") {
      const inputs = item.inputs
        .map((i) => `${i.type}${i.indexed ? " indexed" : ""} ${i.name}`)
        .join(", ");
      console.log(`  event ${item.name}(${inputs})`);
    }
  });

  console.log("\nABI export complete!");
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error("Export failed:", error);
    process.exit(1);
  });
