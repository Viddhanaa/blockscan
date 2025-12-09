# Phase 2: KYC Smart Contract Implementation

## Overview
This document details the implementation of the on-chain KYC Registry smart contract for Viddhana Chain. The contract serves as the single source of truth for KYC verification status.

---

## Contract Specification

### Contract Details
| Attribute | Value |
|-----------|-------|
| Contract Name | ViddhanaKYC |
| Solidity Version | ^0.8.19 |
| License | MIT |
| Pattern | Ownable (OpenZeppelin) |
| Deployment | System contract (deploy first) |

### Functions
| Function | Access | Description |
|----------|--------|-------------|
| `setKYC(address, bool)` | Owner only | Set KYC status for address |
| `isKYC(address)` | Public view | Check KYC status |
| `batchSetKYC(address[], bool)` | Owner only | Bulk KYC update |
| `transferOwnership(address)` | Owner only | Transfer admin rights |

### Events
| Event | Parameters | Description |
|-------|------------|-------------|
| `KYCUpdated` | address indexed user, bool status | Emitted on KYC change |
| `OwnershipTransferred` | address indexed previousOwner, address indexed newOwner | Ownership change |

---

## Step 1: Development Environment Setup

### 1.1 Install Hardhat
```bash
# Create contracts directory
mkdir -p ~/viddhana-chain/contracts
cd ~/viddhana-chain/contracts

# Initialize npm project
npm init -y

# Install Hardhat and dependencies
npm install --save-dev hardhat @nomicfoundation/hardhat-toolbox
npm install @openzeppelin/contracts

# Initialize Hardhat
npx hardhat init
# Select: Create a JavaScript project
```

### 1.2 Project Structure
```
contracts/
├── contracts/
│   └── ViddhanaKYC.sol
├── scripts/
│   ├── deploy.js
│   └── verify.js
├── test/
│   └── ViddhanaKYC.test.js
├── hardhat.config.js
└── package.json
```

---

## Step 2: Smart Contract Code

### 2.1 Main Contract

Create `contracts/contracts/ViddhanaKYC.sol`:

```solidity
// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/utils/Pausable.sol";

/**
 * @title ViddhanaKYC
 * @dev On-chain KYC Registry for Viddhana Chain
 * @notice Manages KYC verification status for addresses
 */
contract ViddhanaKYC is Ownable, Pausable {
    
    // ============ State Variables ============
    
    /// @dev Mapping of address to KYC status
    mapping(address => bool) private _kycStatus;
    
    /// @dev Mapping of address to KYC timestamp
    mapping(address => uint256) private _kycTimestamp;
    
    /// @dev Total number of KYC'd addresses
    uint256 private _totalKYC;
    
    // ============ Events ============
    
    /// @dev Emitted when KYC status is updated
    event KYCUpdated(
        address indexed user, 
        bool status, 
        uint256 timestamp,
        address indexed updatedBy
    );
    
    /// @dev Emitted when batch KYC update occurs
    event BatchKYCUpdated(
        uint256 count, 
        bool status, 
        address indexed updatedBy
    );
    
    // ============ Constructor ============
    
    /**
     * @dev Initializes the contract with the deployer as owner
     */
    constructor() Ownable(msg.sender) {
        // Owner is set automatically by Ownable
    }
    
    // ============ External Functions ============
    
    /**
     * @dev Set KYC status for a single address
     * @param _user Address to update
     * @param _status KYC status (true = verified, false = revoked)
     */
    function setKYC(address _user, bool _status) external onlyOwner whenNotPaused {
        require(_user != address(0), "ViddhanaKYC: zero address");
        require(_kycStatus[_user] != _status, "ViddhanaKYC: status unchanged");
        
        _updateKYC(_user, _status);
    }
    
    /**
     * @dev Set KYC status for multiple addresses
     * @param _users Array of addresses to update
     * @param _status KYC status to set for all
     */
    function batchSetKYC(
        address[] calldata _users, 
        bool _status
    ) external onlyOwner whenNotPaused {
        require(_users.length > 0, "ViddhanaKYC: empty array");
        require(_users.length <= 100, "ViddhanaKYC: batch too large");
        
        for (uint256 i = 0; i < _users.length; i++) {
            if (_users[i] != address(0) && _kycStatus[_users[i]] != _status) {
                _updateKYC(_users[i], _status);
            }
        }
        
        emit BatchKYCUpdated(_users.length, _status, msg.sender);
    }
    
    /**
     * @dev Check if an address is KYC verified
     * @param _user Address to check
     * @return bool True if KYC verified
     */
    function isKYC(address _user) external view returns (bool) {
        return _kycStatus[_user];
    }
    
    /**
     * @dev Get KYC verification timestamp
     * @param _user Address to check
     * @return uint256 Timestamp of KYC verification (0 if never verified)
     */
    function getKYCTimestamp(address _user) external view returns (uint256) {
        return _kycTimestamp[_user];
    }
    
    /**
     * @dev Get total number of KYC'd addresses
     * @return uint256 Total count
     */
    function totalKYCCount() external view returns (uint256) {
        return _totalKYC;
    }
    
    /**
     * @dev Get full KYC info for an address
     * @param _user Address to check
     * @return status KYC status
     * @return timestamp KYC verification timestamp
     */
    function getKYCInfo(address _user) external view returns (
        bool status,
        uint256 timestamp
    ) {
        return (_kycStatus[_user], _kycTimestamp[_user]);
    }
    
    // ============ Admin Functions ============
    
    /**
     * @dev Pause contract operations
     */
    function pause() external onlyOwner {
        _pause();
    }
    
    /**
     * @dev Unpause contract operations
     */
    function unpause() external onlyOwner {
        _unpause();
    }
    
    // ============ Internal Functions ============
    
    /**
     * @dev Internal function to update KYC status
     * @param _user Address to update
     * @param _status New status
     */
    function _updateKYC(address _user, bool _status) internal {
        if (_status && !_kycStatus[_user]) {
            _totalKYC++;
        } else if (!_status && _kycStatus[_user]) {
            _totalKYC--;
        }
        
        _kycStatus[_user] = _status;
        _kycTimestamp[_user] = block.timestamp;
        
        emit KYCUpdated(_user, _status, block.timestamp, msg.sender);
    }
}
```

---

## Step 3: Hardhat Configuration

### 3.1 Configure hardhat.config.js

```javascript
require("@nomicfoundation/hardhat-toolbox");

/** @type import('hardhat/config').HardhatUserConfig */
module.exports = {
  solidity: {
    version: "0.8.19",
    settings: {
      optimizer: {
        enabled: true,
        runs: 200
      }
    }
  },
  networks: {
    viddhana: {
      url: "http://localhost:8545",
      chainId: 1337,
      accounts: [
        // Private key of owner account (NEVER commit to git!)
        // Use environment variable in production
        process.env.OWNER_PRIVATE_KEY || "0x..."
      ],
      gasPrice: 1000000000 // 1 Gwei
    },
    viddhana_remote: {
      url: process.env.RPC_URL || "http://YOUR_NODE_IP:8545",
      chainId: 1337,
      accounts: [process.env.OWNER_PRIVATE_KEY || "0x..."]
    }
  },
  paths: {
    sources: "./contracts",
    tests: "./test",
    cache: "./cache",
    artifacts: "./artifacts"
  }
};
```

### 3.2 Environment Variables

Create `.env` file (add to .gitignore):
```bash
OWNER_PRIVATE_KEY=0x...your_private_key_here...
RPC_URL=http://localhost:8545
```

Install dotenv:
```bash
npm install dotenv
```

Update hardhat.config.js:
```javascript
require('dotenv').config();
require("@nomicfoundation/hardhat-toolbox");
// ... rest of config
```

---

## Step 4: Deployment Script

### 4.1 Create Deployment Script

Create `contracts/scripts/deploy.js`:

```javascript
const hre = require("hardhat");
const fs = require("fs");
const path = require("path");

async function main() {
  console.log("Deploying ViddhanaKYC contract...\n");

  // Get deployer account
  const [deployer] = await hre.ethers.getSigners();
  console.log("Deploying with account:", deployer.address);
  
  // Check balance
  const balance = await hre.ethers.provider.getBalance(deployer.address);
  console.log("Account balance:", hre.ethers.formatEther(balance), "BTCD\n");

  // Deploy contract
  const ViddhanaKYC = await hre.ethers.getContractFactory("ViddhanaKYC");
  const kyc = await ViddhanaKYC.deploy();
  
  await kyc.waitForDeployment();
  const contractAddress = await kyc.getAddress();
  
  console.log("ViddhanaKYC deployed to:", contractAddress);
  console.log("Owner:", await kyc.owner());
  console.log("Transaction hash:", kyc.deploymentTransaction().hash);

  // Save deployment info
  const deploymentInfo = {
    network: hre.network.name,
    chainId: hre.network.config.chainId,
    contractAddress: contractAddress,
    deployer: deployer.address,
    deployedAt: new Date().toISOString(),
    transactionHash: kyc.deploymentTransaction().hash
  };

  const deploymentPath = path.join(__dirname, "../deployments");
  if (!fs.existsSync(deploymentPath)) {
    fs.mkdirSync(deploymentPath, { recursive: true });
  }

  fs.writeFileSync(
    path.join(deploymentPath, `${hre.network.name}.json`),
    JSON.stringify(deploymentInfo, null, 2)
  );

  console.log("\nDeployment info saved to:", `deployments/${hre.network.name}.json`);

  // Verify initial state
  console.log("\n--- Contract State ---");
  console.log("Total KYC Count:", (await kyc.totalKYCCount()).toString());
  console.log("Paused:", await kyc.paused());
  
  return contractAddress;
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
```

### 4.2 Run Deployment

```bash
# Deploy to local Viddhana network
npx hardhat run scripts/deploy.js --network viddhana

# Expected output:
# Deploying ViddhanaKYC contract...
# Deploying with account: 0x...
# Account balance: 1000000.0 BTCD
# ViddhanaKYC deployed to: 0x...
# Owner: 0x...
```

---

## Step 5: Test Suite

### 5.1 Create Test File

Create `contracts/test/ViddhanaKYC.test.js`:

```javascript
const { expect } = require("chai");
const { ethers } = require("hardhat");

describe("ViddhanaKYC", function () {
  let kyc;
  let owner;
  let user1;
  let user2;
  let users;

  beforeEach(async function () {
    [owner, user1, user2, ...users] = await ethers.getSigners();
    
    const ViddhanaKYC = await ethers.getContractFactory("ViddhanaKYC");
    kyc = await ViddhanaKYC.deploy();
    await kyc.waitForDeployment();
  });

  describe("Deployment", function () {
    it("Should set the right owner", async function () {
      expect(await kyc.owner()).to.equal(owner.address);
    });

    it("Should start with zero KYC count", async function () {
      expect(await kyc.totalKYCCount()).to.equal(0);
    });

    it("Should not be paused initially", async function () {
      expect(await kyc.paused()).to.equal(false);
    });
  });

  describe("setKYC", function () {
    it("Should allow owner to set KYC status", async function () {
      await kyc.setKYC(user1.address, true);
      expect(await kyc.isKYC(user1.address)).to.equal(true);
    });

    it("Should emit KYCUpdated event", async function () {
      await expect(kyc.setKYC(user1.address, true))
        .to.emit(kyc, "KYCUpdated")
        .withArgs(user1.address, true, await getBlockTimestamp(), owner.address);
    });

    it("Should increment total KYC count", async function () {
      await kyc.setKYC(user1.address, true);
      expect(await kyc.totalKYCCount()).to.equal(1);
      
      await kyc.setKYC(user2.address, true);
      expect(await kyc.totalKYCCount()).to.equal(2);
    });

    it("Should decrement count when revoking KYC", async function () {
      await kyc.setKYC(user1.address, true);
      await kyc.setKYC(user1.address, false);
      expect(await kyc.totalKYCCount()).to.equal(0);
    });

    it("Should revert if called by non-owner", async function () {
      await expect(kyc.connect(user1).setKYC(user2.address, true))
        .to.be.revertedWithCustomError(kyc, "OwnableUnauthorizedAccount");
    });

    it("Should revert for zero address", async function () {
      await expect(kyc.setKYC(ethers.ZeroAddress, true))
        .to.be.revertedWith("ViddhanaKYC: zero address");
    });

    it("Should revert if status unchanged", async function () {
      await kyc.setKYC(user1.address, true);
      await expect(kyc.setKYC(user1.address, true))
        .to.be.revertedWith("ViddhanaKYC: status unchanged");
    });
  });

  describe("batchSetKYC", function () {
    it("Should set KYC for multiple addresses", async function () {
      const addresses = [user1.address, user2.address];
      await kyc.batchSetKYC(addresses, true);
      
      expect(await kyc.isKYC(user1.address)).to.equal(true);
      expect(await kyc.isKYC(user2.address)).to.equal(true);
      expect(await kyc.totalKYCCount()).to.equal(2);
    });

    it("Should emit BatchKYCUpdated event", async function () {
      const addresses = [user1.address, user2.address];
      await expect(kyc.batchSetKYC(addresses, true))
        .to.emit(kyc, "BatchKYCUpdated")
        .withArgs(2, true, owner.address);
    });

    it("Should revert for empty array", async function () {
      await expect(kyc.batchSetKYC([], true))
        .to.be.revertedWith("ViddhanaKYC: empty array");
    });

    it("Should revert for batch > 100", async function () {
      const addresses = Array(101).fill(user1.address);
      await expect(kyc.batchSetKYC(addresses, true))
        .to.be.revertedWith("ViddhanaKYC: batch too large");
    });
  });

  describe("getKYCInfo", function () {
    it("Should return correct KYC info", async function () {
      await kyc.setKYC(user1.address, true);
      const [status, timestamp] = await kyc.getKYCInfo(user1.address);
      
      expect(status).to.equal(true);
      expect(timestamp).to.be.gt(0);
    });

    it("Should return false and 0 for non-KYC address", async function () {
      const [status, timestamp] = await kyc.getKYCInfo(user1.address);
      
      expect(status).to.equal(false);
      expect(timestamp).to.equal(0);
    });
  });

  describe("Pausable", function () {
    it("Should allow owner to pause", async function () {
      await kyc.pause();
      expect(await kyc.paused()).to.equal(true);
    });

    it("Should prevent setKYC when paused", async function () {
      await kyc.pause();
      await expect(kyc.setKYC(user1.address, true))
        .to.be.revertedWithCustomError(kyc, "EnforcedPause");
    });

    it("Should allow operations after unpause", async function () {
      await kyc.pause();
      await kyc.unpause();
      await kyc.setKYC(user1.address, true);
      expect(await kyc.isKYC(user1.address)).to.equal(true);
    });
  });

  // Helper function
  async function getBlockTimestamp() {
    const block = await ethers.provider.getBlock("latest");
    return block.timestamp;
  }
});
```

### 5.2 Run Tests

```bash
# Run all tests
npx hardhat test

# Run with gas reporting
REPORT_GAS=true npx hardhat test

# Run specific test
npx hardhat test test/ViddhanaKYC.test.js
```

---

## Step 6: Contract Verification (Blockscout)

### 6.1 Manual Verification

1. Navigate to Blockscout at `http://localhost:4000`
2. Search for deployed contract address
3. Go to "Contract" tab → "Verify & Publish"
4. Enter:
   - Contract Name: `ViddhanaKYC`
   - Compiler Version: `v0.8.19+commit.7dd6d404`
   - Optimization: Yes (200 runs)
   - Source Code: Flattened contract code

### 6.2 Get Flattened Source

```bash
npx hardhat flatten contracts/ViddhanaKYC.sol > ViddhanaKYC_flattened.sol
```

---

## Step 7: Interaction Examples

### 7.1 Using Hardhat Console

```bash
npx hardhat console --network viddhana
```

```javascript
// In console
const kycAddress = "0x..."; // deployed address
const kyc = await ethers.getContractAt("ViddhanaKYC", kycAddress);

// Check owner
await kyc.owner();

// Set KYC for address
await kyc.setKYC("0xUserAddress...", true);

// Check KYC status
await kyc.isKYC("0xUserAddress...");

// Get full info
await kyc.getKYCInfo("0xUserAddress...");

// Batch set
await kyc.batchSetKYC(["0xAddr1...", "0xAddr2..."], true);
```

### 7.2 Using ethers.js Script

Create `scripts/interact.js`:

```javascript
const hre = require("hardhat");
const fs = require("fs");
const path = require("path");

async function main() {
  // Load deployment info
  const deploymentPath = path.join(__dirname, "../deployments/viddhana.json");
  const deployment = JSON.parse(fs.readFileSync(deploymentPath, "utf8"));
  
  const kyc = await hre.ethers.getContractAt("ViddhanaKYC", deployment.contractAddress);
  const [owner] = await hre.ethers.getSigners();

  console.log("Contract Address:", deployment.contractAddress);
  console.log("Owner:", await kyc.owner());
  
  // Example: Set KYC for test address
  const testAddress = "0x1234567890123456789012345678901234567890";
  
  console.log("\nSetting KYC for:", testAddress);
  const tx = await kyc.setKYC(testAddress, true);
  await tx.wait();
  
  console.log("Transaction hash:", tx.hash);
  console.log("Is KYC:", await kyc.isKYC(testAddress));
  console.log("Total KYC Count:", (await kyc.totalKYCCount()).toString());
}

main()
  .then(() => process.exit(0))
  .catch(console.error);
```

---

## Step 8: ABI Export

### 8.1 Extract ABI

After compilation, ABI is at:
`artifacts/contracts/ViddhanaKYC.sol/ViddhanaKYC.json`

### 8.2 Create ABI Export Script

```javascript
// scripts/export-abi.js
const fs = require("fs");
const path = require("path");

const artifactPath = path.join(
  __dirname,
  "../artifacts/contracts/ViddhanaKYC.sol/ViddhanaKYC.json"
);

const artifact = JSON.parse(fs.readFileSync(artifactPath, "utf8"));

const exportPath = path.join(__dirname, "../abi");
if (!fs.existsSync(exportPath)) {
  fs.mkdirSync(exportPath);
}

fs.writeFileSync(
  path.join(exportPath, "ViddhanaKYC.json"),
  JSON.stringify(artifact.abi, null, 2)
);

console.log("ABI exported to abi/ViddhanaKYC.json");
```

---

## Contract ABI Reference

```json
[
  {
    "inputs": [],
    "stateMutability": "nonpayable",
    "type": "constructor"
  },
  {
    "inputs": [
      {"internalType": "address", "name": "_user", "type": "address"}
    ],
    "name": "isKYC",
    "outputs": [
      {"internalType": "bool", "name": "", "type": "bool"}
    ],
    "stateMutability": "view",
    "type": "function"
  },
  {
    "inputs": [
      {"internalType": "address", "name": "_user", "type": "address"},
      {"internalType": "bool", "name": "_status", "type": "bool"}
    ],
    "name": "setKYC",
    "outputs": [],
    "stateMutability": "nonpayable",
    "type": "function"
  },
  {
    "inputs": [
      {"internalType": "address[]", "name": "_users", "type": "address[]"},
      {"internalType": "bool", "name": "_status", "type": "bool"}
    ],
    "name": "batchSetKYC",
    "outputs": [],
    "stateMutability": "nonpayable",
    "type": "function"
  },
  {
    "inputs": [
      {"internalType": "address", "name": "_user", "type": "address"}
    ],
    "name": "getKYCInfo",
    "outputs": [
      {"internalType": "bool", "name": "status", "type": "bool"},
      {"internalType": "uint256", "name": "timestamp", "type": "uint256"}
    ],
    "stateMutability": "view",
    "type": "function"
  },
  {
    "inputs": [],
    "name": "totalKYCCount",
    "outputs": [
      {"internalType": "uint256", "name": "", "type": "uint256"}
    ],
    "stateMutability": "view",
    "type": "function"
  }
]
```

---

## Checklist

- [ ] Hardhat environment set up
- [ ] ViddhanaKYC.sol created
- [ ] hardhat.config.js configured for Viddhana network
- [ ] Environment variables configured
- [ ] Deployment script created
- [ ] Contract deployed to Viddhana Chain
- [ ] Deployment info saved
- [ ] Tests written and passing
- [ ] Contract verified on Blockscout
- [ ] ABI exported for middleware use

---

## Next Steps

1. Save the deployed contract address
2. Export ABI for middleware integration
3. Proceed to `03_MIDDLEWARE_API.md` to create the KYC API wrapper
