# Phase 3: Middleware API Implementation

## Overview
This document details the implementation of the KYC Middleware API that wraps the ViddhanaKYC smart contract. Both Node.js and Python implementations are provided.

---

## API Specification

### Endpoints

| Method | Endpoint | Description | Auth |
|--------|----------|-------------|------|
| GET | `/rpc/check_kyc` | Check KYC status | Public |
| POST | `/api/approve_kyc` | Approve KYC for address | Admin |
| POST | `/api/revoke_kyc` | Revoke KYC for address | Admin |
| POST | `/api/batch_kyc` | Batch KYC update | Admin |
| GET | `/api/kyc_info` | Get full KYC info | Public |
| GET | `/api/stats` | Get KYC statistics | Public |
| GET | `/health` | Health check | Public |

### Request/Response Formats

#### Check KYC
```
GET /rpc/check_kyc?address=0x123...

Response:
{
  "success": true,
  "data": {
    "address": "0x123...",
    "is_kyc": true,
    "timestamp": 1699900000,
    "verified_at": "2024-11-13T10:00:00Z"
  }
}
```

#### Approve KYC
```
POST /api/approve_kyc
Headers: { "X-API-Key": "admin_secret_key" }
Body: { "address": "0x123..." }

Response:
{
  "success": true,
  "data": {
    "tx_hash": "0xabc...",
    "address": "0x123...",
    "status": "pending"
  }
}
```

---

## Option A: Node.js Implementation

### Step 1: Project Setup

```bash
# Create API directory
mkdir -p ~/viddhana-chain/api
cd ~/viddhana-chain/api

# Initialize project
npm init -y

# Install dependencies
npm install express ethers dotenv cors helmet express-rate-limit winston
npm install --save-dev nodemon typescript @types/express @types/node
```

### Step 2: Project Structure

```
api/
├── src/
│   ├── index.js
│   ├── config/
│   │   └── index.js
│   ├── routes/
│   │   ├── rpc.js
│   │   └── api.js
│   ├── services/
│   │   └── kyc.service.js
│   ├── middleware/
│   │   ├── auth.js
│   │   └── validator.js
│   └── utils/
│       └── logger.js
├── abi/
│   └── ViddhanaKYC.json
├── .env
├── .env.example
└── package.json
```

### Step 3: Configuration

Create `.env`:
```env
# Server
PORT=3000
NODE_ENV=development

# Blockchain
RPC_URL=http://localhost:8545
CHAIN_ID=1337
KYC_CONTRACT_ADDRESS=0x...deployed_address...

# Admin wallet (for signing transactions)
ADMIN_PRIVATE_KEY=0x...private_key...

# Security
API_KEY=your_admin_api_key_here
CORS_ORIGIN=*
RATE_LIMIT_WINDOW_MS=60000
RATE_LIMIT_MAX=100
```

Create `src/config/index.js`:
```javascript
require('dotenv').config();

module.exports = {
  server: {
    port: process.env.PORT || 3000,
    env: process.env.NODE_ENV || 'development'
  },
  blockchain: {
    rpcUrl: process.env.RPC_URL || 'http://localhost:8545',
    chainId: parseInt(process.env.CHAIN_ID) || 1337,
    kycContractAddress: process.env.KYC_CONTRACT_ADDRESS
  },
  admin: {
    privateKey: process.env.ADMIN_PRIVATE_KEY
  },
  security: {
    apiKey: process.env.API_KEY,
    corsOrigin: process.env.CORS_ORIGIN || '*',
    rateLimitWindowMs: parseInt(process.env.RATE_LIMIT_WINDOW_MS) || 60000,
    rateLimitMax: parseInt(process.env.RATE_LIMIT_MAX) || 100
  }
};
```

### Step 4: Logger Utility

Create `src/utils/logger.js`:
```javascript
const winston = require('winston');
const config = require('../config');

const logger = winston.createLogger({
  level: config.server.env === 'development' ? 'debug' : 'info',
  format: winston.format.combine(
    winston.format.timestamp(),
    winston.format.errors({ stack: true }),
    winston.format.json()
  ),
  transports: [
    new winston.transports.Console({
      format: winston.format.combine(
        winston.format.colorize(),
        winston.format.simple()
      )
    }),
    new winston.transports.File({ 
      filename: 'logs/error.log', 
      level: 'error' 
    }),
    new winston.transports.File({ 
      filename: 'logs/combined.log' 
    })
  ]
});

module.exports = logger;
```

### Step 5: KYC Service

Create `src/services/kyc.service.js`:
```javascript
const { ethers } = require('ethers');
const config = require('../config');
const logger = require('../utils/logger');
const KYC_ABI = require('../../abi/ViddhanaKYC.json');

class KYCService {
  constructor() {
    this.provider = new ethers.JsonRpcProvider(config.blockchain.rpcUrl);
    this.wallet = new ethers.Wallet(config.admin.privateKey, this.provider);
    this.contract = new ethers.Contract(
      config.blockchain.kycContractAddress,
      KYC_ABI,
      this.wallet
    );
    this.readOnlyContract = new ethers.Contract(
      config.blockchain.kycContractAddress,
      KYC_ABI,
      this.provider
    );
  }

  /**
   * Check if address is KYC verified
   * @param {string} address - Ethereum address
   * @returns {Promise<boolean>}
   */
  async checkKYC(address) {
    try {
      const isKYC = await this.readOnlyContract.isKYC(address);
      return isKYC;
    } catch (error) {
      logger.error('Error checking KYC:', error);
      throw error;
    }
  }

  /**
   * Get full KYC info for address
   * @param {string} address - Ethereum address
   * @returns {Promise<{status: boolean, timestamp: number}>}
   */
  async getKYCInfo(address) {
    try {
      const [status, timestamp] = await this.readOnlyContract.getKYCInfo(address);
      return {
        status,
        timestamp: Number(timestamp),
        verifiedAt: timestamp > 0 ? new Date(Number(timestamp) * 1000).toISOString() : null
      };
    } catch (error) {
      logger.error('Error getting KYC info:', error);
      throw error;
    }
  }

  /**
   * Set KYC status for address
   * @param {string} address - Ethereum address
   * @param {boolean} status - KYC status
   * @returns {Promise<{txHash: string}>}
   */
  async setKYC(address, status) {
    try {
      logger.info(`Setting KYC for ${address} to ${status}`);
      
      const tx = await this.contract.setKYC(address, status);
      logger.info(`Transaction submitted: ${tx.hash}`);
      
      // Wait for confirmation
      const receipt = await tx.wait();
      logger.info(`Transaction confirmed in block ${receipt.blockNumber}`);
      
      return {
        txHash: tx.hash,
        blockNumber: receipt.blockNumber,
        gasUsed: receipt.gasUsed.toString()
      };
    } catch (error) {
      logger.error('Error setting KYC:', error);
      throw error;
    }
  }

  /**
   * Batch set KYC status
   * @param {string[]} addresses - Array of addresses
   * @param {boolean} status - KYC status
   * @returns {Promise<{txHash: string}>}
   */
  async batchSetKYC(addresses, status) {
    try {
      logger.info(`Batch setting KYC for ${addresses.length} addresses to ${status}`);
      
      const tx = await this.contract.batchSetKYC(addresses, status);
      const receipt = await tx.wait();
      
      return {
        txHash: tx.hash,
        blockNumber: receipt.blockNumber,
        gasUsed: receipt.gasUsed.toString(),
        count: addresses.length
      };
    } catch (error) {
      logger.error('Error batch setting KYC:', error);
      throw error;
    }
  }

  /**
   * Get total KYC count
   * @returns {Promise<number>}
   */
  async getTotalKYCCount() {
    try {
      const count = await this.readOnlyContract.totalKYCCount();
      return Number(count);
    } catch (error) {
      logger.error('Error getting total KYC count:', error);
      throw error;
    }
  }

  /**
   * Get contract owner
   * @returns {Promise<string>}
   */
  async getOwner() {
    try {
      return await this.readOnlyContract.owner();
    } catch (error) {
      logger.error('Error getting owner:', error);
      throw error;
    }
  }
}

module.exports = new KYCService();
```

### Step 6: Middleware

Create `src/middleware/auth.js`:
```javascript
const config = require('../config');

const adminAuth = (req, res, next) => {
  const apiKey = req.headers['x-api-key'];
  
  if (!apiKey) {
    return res.status(401).json({
      success: false,
      error: 'API key required'
    });
  }
  
  if (apiKey !== config.security.apiKey) {
    return res.status(403).json({
      success: false,
      error: 'Invalid API key'
    });
  }
  
  next();
};

module.exports = { adminAuth };
```

Create `src/middleware/validator.js`:
```javascript
const { ethers } = require('ethers');

const validateAddress = (req, res, next) => {
  const address = req.query.address || req.body.address;
  
  if (!address) {
    return res.status(400).json({
      success: false,
      error: 'Address is required'
    });
  }
  
  if (!ethers.isAddress(address)) {
    return res.status(400).json({
      success: false,
      error: 'Invalid Ethereum address'
    });
  }
  
  // Normalize to checksum address
  req.validatedAddress = ethers.getAddress(address);
  next();
};

const validateAddresses = (req, res, next) => {
  const { addresses } = req.body;
  
  if (!addresses || !Array.isArray(addresses)) {
    return res.status(400).json({
      success: false,
      error: 'Addresses array is required'
    });
  }
  
  if (addresses.length === 0 || addresses.length > 100) {
    return res.status(400).json({
      success: false,
      error: 'Addresses array must contain 1-100 addresses'
    });
  }
  
  const validatedAddresses = [];
  for (const addr of addresses) {
    if (!ethers.isAddress(addr)) {
      return res.status(400).json({
        success: false,
        error: `Invalid address: ${addr}`
      });
    }
    validatedAddresses.push(ethers.getAddress(addr));
  }
  
  req.validatedAddresses = validatedAddresses;
  next();
};

module.exports = { validateAddress, validateAddresses };
```

### Step 7: Routes

Create `src/routes/rpc.js`:
```javascript
const express = require('express');
const router = express.Router();
const kycService = require('../services/kyc.service');
const { validateAddress } = require('../middleware/validator');

/**
 * GET /rpc/check_kyc
 * Check KYC status for an address
 */
router.get('/check_kyc', validateAddress, async (req, res) => {
  try {
    const address = req.validatedAddress;
    const isKYC = await kycService.checkKYC(address);
    const info = await kycService.getKYCInfo(address);
    
    res.json({
      success: true,
      data: {
        address,
        is_kyc: isKYC,
        timestamp: info.timestamp,
        verified_at: info.verifiedAt
      }
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

module.exports = router;
```

Create `src/routes/api.js`:
```javascript
const express = require('express');
const router = express.Router();
const kycService = require('../services/kyc.service');
const { adminAuth } = require('../middleware/auth');
const { validateAddress, validateAddresses } = require('../middleware/validator');

/**
 * GET /api/kyc_info
 * Get full KYC info for an address
 */
router.get('/kyc_info', validateAddress, async (req, res) => {
  try {
    const address = req.validatedAddress;
    const info = await kycService.getKYCInfo(address);
    
    res.json({
      success: true,
      data: {
        address,
        ...info
      }
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * GET /api/stats
 * Get KYC statistics
 */
router.get('/stats', async (req, res) => {
  try {
    const totalKYC = await kycService.getTotalKYCCount();
    const owner = await kycService.getOwner();
    
    res.json({
      success: true,
      data: {
        total_kyc_count: totalKYC,
        contract_owner: owner
      }
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * POST /api/approve_kyc
 * Approve KYC for an address (Admin only)
 */
router.post('/approve_kyc', adminAuth, validateAddress, async (req, res) => {
  try {
    const address = req.validatedAddress;
    const result = await kycService.setKYC(address, true);
    
    res.json({
      success: true,
      data: {
        address,
        tx_hash: result.txHash,
        block_number: result.blockNumber,
        gas_used: result.gasUsed,
        status: 'confirmed'
      }
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * POST /api/revoke_kyc
 * Revoke KYC for an address (Admin only)
 */
router.post('/revoke_kyc', adminAuth, validateAddress, async (req, res) => {
  try {
    const address = req.validatedAddress;
    const result = await kycService.setKYC(address, false);
    
    res.json({
      success: true,
      data: {
        address,
        tx_hash: result.txHash,
        block_number: result.blockNumber,
        gas_used: result.gasUsed,
        status: 'confirmed'
      }
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * POST /api/batch_kyc
 * Batch approve/revoke KYC (Admin only)
 */
router.post('/batch_kyc', adminAuth, validateAddresses, async (req, res) => {
  try {
    const { status } = req.body;
    const addresses = req.validatedAddresses;
    
    if (typeof status !== 'boolean') {
      return res.status(400).json({
        success: false,
        error: 'Status (boolean) is required'
      });
    }
    
    const result = await kycService.batchSetKYC(addresses, status);
    
    res.json({
      success: true,
      data: {
        count: result.count,
        status,
        tx_hash: result.txHash,
        block_number: result.blockNumber,
        gas_used: result.gasUsed
      }
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

module.exports = router;
```

### Step 8: Main Application

Create `src/index.js`:
```javascript
const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
const config = require('./config');
const logger = require('./utils/logger');
const rpcRoutes = require('./routes/rpc');
const apiRoutes = require('./routes/api');

const app = express();

// Security middleware
app.use(helmet());
app.use(cors({ origin: config.security.corsOrigin }));
app.use(express.json());

// Rate limiting
const limiter = rateLimit({
  windowMs: config.security.rateLimitWindowMs,
  max: config.security.rateLimitMax,
  message: { success: false, error: 'Too many requests' }
});
app.use(limiter);

// Request logging
app.use((req, res, next) => {
  logger.info(`${req.method} ${req.path}`, {
    ip: req.ip,
    query: req.query
  });
  next();
});

// Health check
app.get('/health', (req, res) => {
  res.json({
    success: true,
    data: {
      status: 'healthy',
      timestamp: new Date().toISOString(),
      version: '1.0.0'
    }
  });
});

// Routes
app.use('/rpc', rpcRoutes);
app.use('/api', apiRoutes);

// 404 handler
app.use((req, res) => {
  res.status(404).json({
    success: false,
    error: 'Endpoint not found'
  });
});

// Error handler
app.use((err, req, res, next) => {
  logger.error('Unhandled error:', err);
  res.status(500).json({
    success: false,
    error: 'Internal server error'
  });
});

// Start server
app.listen(config.server.port, () => {
  logger.info(`Viddhana KYC API running on port ${config.server.port}`);
  logger.info(`Environment: ${config.server.env}`);
  logger.info(`Contract: ${config.blockchain.kycContractAddress}`);
});
```

### Step 9: Package.json Scripts

Update `package.json`:
```json
{
  "name": "viddhana-kyc-api",
  "version": "1.0.0",
  "description": "KYC Middleware API for Viddhana Chain",
  "main": "src/index.js",
  "scripts": {
    "start": "node src/index.js",
    "dev": "nodemon src/index.js",
    "test": "jest"
  },
  "dependencies": {
    "cors": "^2.8.5",
    "dotenv": "^16.3.1",
    "ethers": "^6.9.0",
    "express": "^4.18.2",
    "express-rate-limit": "^7.1.5",
    "helmet": "^7.1.0",
    "winston": "^3.11.0"
  },
  "devDependencies": {
    "nodemon": "^3.0.2"
  }
}
```

---

## Option B: Python Implementation

### Step 1: Project Setup

```bash
# Create API directory
mkdir -p ~/viddhana-chain/api-python
cd ~/viddhana-chain/api-python

# Create virtual environment
python3 -m venv venv
source venv/bin/activate

# Install dependencies
pip install fastapi uvicorn web3 python-dotenv pydantic
```

### Step 2: Project Structure

```
api-python/
├── app/
│   ├── __init__.py
│   ├── main.py
│   ├── config.py
│   ├── routes/
│   │   ├── __init__.py
│   │   ├── rpc.py
│   │   └── api.py
│   ├── services/
│   │   ├── __init__.py
│   │   └── kyc_service.py
│   └── middleware/
│       ├── __init__.py
│       └── auth.py
├── abi/
│   └── ViddhanaKYC.json
├── .env
├── requirements.txt
└── run.py
```

### Step 3: Configuration

Create `app/config.py`:
```python
import os
from dotenv import load_dotenv

load_dotenv()

class Config:
    # Server
    PORT = int(os.getenv("PORT", 3000))
    DEBUG = os.getenv("DEBUG", "false").lower() == "true"
    
    # Blockchain
    RPC_URL = os.getenv("RPC_URL", "http://localhost:8545")
    CHAIN_ID = int(os.getenv("CHAIN_ID", 1337))
    KYC_CONTRACT_ADDRESS = os.getenv("KYC_CONTRACT_ADDRESS")
    
    # Admin
    ADMIN_PRIVATE_KEY = os.getenv("ADMIN_PRIVATE_KEY")
    
    # Security
    API_KEY = os.getenv("API_KEY")

config = Config()
```

### Step 4: KYC Service

Create `app/services/kyc_service.py`:
```python
import json
from web3 import Web3
from datetime import datetime
from ..config import config

class KYCService:
    def __init__(self):
        self.w3 = Web3(Web3.HTTPProvider(config.RPC_URL))
        
        # Load ABI
        with open("abi/ViddhanaKYC.json", "r") as f:
            self.abi = json.load(f)
        
        # Create contract instance
        self.contract = self.w3.eth.contract(
            address=Web3.to_checksum_address(config.KYC_CONTRACT_ADDRESS),
            abi=self.abi
        )
        
        # Admin account
        self.account = self.w3.eth.account.from_key(config.ADMIN_PRIVATE_KEY)
    
    def check_kyc(self, address: str) -> bool:
        """Check if address is KYC verified"""
        checksum_addr = Web3.to_checksum_address(address)
        return self.contract.functions.isKYC(checksum_addr).call()
    
    def get_kyc_info(self, address: str) -> dict:
        """Get full KYC info for address"""
        checksum_addr = Web3.to_checksum_address(address)
        status, timestamp = self.contract.functions.getKYCInfo(checksum_addr).call()
        
        return {
            "status": status,
            "timestamp": timestamp,
            "verified_at": datetime.utcfromtimestamp(timestamp).isoformat() if timestamp > 0 else None
        }
    
    def set_kyc(self, address: str, status: bool) -> dict:
        """Set KYC status for address"""
        checksum_addr = Web3.to_checksum_address(address)
        
        # Build transaction
        tx = self.contract.functions.setKYC(
            checksum_addr, 
            status
        ).build_transaction({
            'from': self.account.address,
            'nonce': self.w3.eth.get_transaction_count(self.account.address),
            'gas': 100000,
            'gasPrice': self.w3.eth.gas_price
        })
        
        # Sign and send
        signed_tx = self.w3.eth.account.sign_transaction(tx, config.ADMIN_PRIVATE_KEY)
        tx_hash = self.w3.eth.send_raw_transaction(signed_tx.rawTransaction)
        
        # Wait for receipt
        receipt = self.w3.eth.wait_for_transaction_receipt(tx_hash)
        
        return {
            "tx_hash": tx_hash.hex(),
            "block_number": receipt.blockNumber,
            "gas_used": str(receipt.gasUsed)
        }
    
    def batch_set_kyc(self, addresses: list, status: bool) -> dict:
        """Batch set KYC status"""
        checksum_addrs = [Web3.to_checksum_address(a) for a in addresses]
        
        tx = self.contract.functions.batchSetKYC(
            checksum_addrs, 
            status
        ).build_transaction({
            'from': self.account.address,
            'nonce': self.w3.eth.get_transaction_count(self.account.address),
            'gas': 50000 * len(addresses),
            'gasPrice': self.w3.eth.gas_price
        })
        
        signed_tx = self.w3.eth.account.sign_transaction(tx, config.ADMIN_PRIVATE_KEY)
        tx_hash = self.w3.eth.send_raw_transaction(signed_tx.rawTransaction)
        receipt = self.w3.eth.wait_for_transaction_receipt(tx_hash)
        
        return {
            "tx_hash": tx_hash.hex(),
            "block_number": receipt.blockNumber,
            "gas_used": str(receipt.gasUsed),
            "count": len(addresses)
        }
    
    def get_total_kyc_count(self) -> int:
        """Get total KYC count"""
        return self.contract.functions.totalKYCCount().call()
    
    def get_owner(self) -> str:
        """Get contract owner"""
        return self.contract.functions.owner().call()

kyc_service = KYCService()
```

### Step 5: Routes

Create `app/routes/rpc.py`:
```python
from fastapi import APIRouter, Query, HTTPException
from web3 import Web3
from ..services.kyc_service import kyc_service

router = APIRouter(prefix="/rpc", tags=["RPC"])

@router.get("/check_kyc")
async def check_kyc(address: str = Query(..., description="Ethereum address")):
    """Check KYC status for an address"""
    if not Web3.is_address(address):
        raise HTTPException(status_code=400, detail="Invalid Ethereum address")
    
    try:
        is_kyc = kyc_service.check_kyc(address)
        info = kyc_service.get_kyc_info(address)
        
        return {
            "success": True,
            "data": {
                "address": Web3.to_checksum_address(address),
                "is_kyc": is_kyc,
                "timestamp": info["timestamp"],
                "verified_at": info["verified_at"]
            }
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
```

Create `app/routes/api.py`:
```python
from fastapi import APIRouter, Depends, HTTPException, Header
from pydantic import BaseModel
from typing import List
from web3 import Web3
from ..config import config
from ..services.kyc_service import kyc_service

router = APIRouter(prefix="/api", tags=["API"])

# Models
class AddressRequest(BaseModel):
    address: str

class BatchKYCRequest(BaseModel):
    addresses: List[str]
    status: bool

# Auth dependency
async def verify_api_key(x_api_key: str = Header(...)):
    if x_api_key != config.API_KEY:
        raise HTTPException(status_code=403, detail="Invalid API key")
    return x_api_key

@router.get("/kyc_info")
async def get_kyc_info(address: str):
    """Get full KYC info for an address"""
    if not Web3.is_address(address):
        raise HTTPException(status_code=400, detail="Invalid Ethereum address")
    
    try:
        info = kyc_service.get_kyc_info(address)
        return {
            "success": True,
            "data": {
                "address": Web3.to_checksum_address(address),
                **info
            }
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/stats")
async def get_stats():
    """Get KYC statistics"""
    try:
        return {
            "success": True,
            "data": {
                "total_kyc_count": kyc_service.get_total_kyc_count(),
                "contract_owner": kyc_service.get_owner()
            }
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.post("/approve_kyc")
async def approve_kyc(
    request: AddressRequest,
    api_key: str = Depends(verify_api_key)
):
    """Approve KYC for an address (Admin only)"""
    if not Web3.is_address(request.address):
        raise HTTPException(status_code=400, detail="Invalid Ethereum address")
    
    try:
        result = kyc_service.set_kyc(request.address, True)
        return {
            "success": True,
            "data": {
                "address": Web3.to_checksum_address(request.address),
                **result,
                "status": "confirmed"
            }
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.post("/revoke_kyc")
async def revoke_kyc(
    request: AddressRequest,
    api_key: str = Depends(verify_api_key)
):
    """Revoke KYC for an address (Admin only)"""
    if not Web3.is_address(request.address):
        raise HTTPException(status_code=400, detail="Invalid Ethereum address")
    
    try:
        result = kyc_service.set_kyc(request.address, False)
        return {
            "success": True,
            "data": {
                "address": Web3.to_checksum_address(request.address),
                **result,
                "status": "confirmed"
            }
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.post("/batch_kyc")
async def batch_kyc(
    request: BatchKYCRequest,
    api_key: str = Depends(verify_api_key)
):
    """Batch approve/revoke KYC (Admin only)"""
    if len(request.addresses) == 0 or len(request.addresses) > 100:
        raise HTTPException(status_code=400, detail="Must provide 1-100 addresses")
    
    for addr in request.addresses:
        if not Web3.is_address(addr):
            raise HTTPException(status_code=400, detail=f"Invalid address: {addr}")
    
    try:
        result = kyc_service.batch_set_kyc(request.addresses, request.status)
        return {
            "success": True,
            "data": {
                **result,
                "status_set": request.status
            }
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
```

### Step 6: Main Application

Create `app/main.py`:
```python
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from datetime import datetime
from .routes import rpc, api
from .config import config

app = FastAPI(
    title="Viddhana KYC API",
    description="KYC Middleware API for Viddhana Chain",
    version="1.0.0"
)

# CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Include routers
app.include_router(rpc.router)
app.include_router(api.router)

@app.get("/health")
async def health_check():
    return {
        "success": True,
        "data": {
            "status": "healthy",
            "timestamp": datetime.utcnow().isoformat(),
            "version": "1.0.0"
        }
    }
```

Create `run.py`:
```python
import uvicorn
from app.config import config

if __name__ == "__main__":
    uvicorn.run(
        "app.main:app",
        host="0.0.0.0",
        port=config.PORT,
        reload=config.DEBUG
    )
```

Create `requirements.txt`:
```
fastapi==0.104.1
uvicorn==0.24.0
web3==6.11.3
python-dotenv==1.0.0
pydantic==2.5.2
```

---

## Docker Deployment

### Dockerfile (Node.js)
```dockerfile
FROM node:18-alpine

WORKDIR /app

COPY package*.json ./
RUN npm ci --only=production

COPY . .

EXPOSE 3000

CMD ["node", "src/index.js"]
```

### Dockerfile (Python)
```dockerfile
FROM python:3.11-slim

WORKDIR /app

COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

COPY . .

EXPOSE 3000

CMD ["python", "run.py"]
```

### Docker Compose Addition
```yaml
  kyc-api:
    build: ./api
    container_name: viddhana-kyc-api
    restart: unless-stopped
    ports:
      - "3000:3000"
    environment:
      - PORT=3000
      - RPC_URL=http://geth-node1:8545
      - KYC_CONTRACT_ADDRESS=${KYC_CONTRACT_ADDRESS}
      - ADMIN_PRIVATE_KEY=${ADMIN_PRIVATE_KEY}
      - API_KEY=${API_KEY}
    networks:
      - viddhana-network
    depends_on:
      - geth-node1
```

---

## Testing the API

### Using cURL

```bash
# Health check
curl http://localhost:3000/health

# Check KYC status
curl "http://localhost:3000/rpc/check_kyc?address=0x123..."

# Get KYC info
curl "http://localhost:3000/api/kyc_info?address=0x123..."

# Get stats
curl http://localhost:3000/api/stats

# Approve KYC (admin)
curl -X POST http://localhost:3000/api/approve_kyc \
  -H "Content-Type: application/json" \
  -H "X-API-Key: your_admin_api_key" \
  -d '{"address": "0x123..."}'

# Batch KYC (admin)
curl -X POST http://localhost:3000/api/batch_kyc \
  -H "Content-Type: application/json" \
  -H "X-API-Key: your_admin_api_key" \
  -d '{"addresses": ["0x123...", "0x456..."], "status": true}'
```

---

## Checklist

- [ ] Choose implementation (Node.js or Python)
- [ ] Set up project structure
- [ ] Configure environment variables
- [ ] Copy ViddhanaKYC ABI to abi/ folder
- [ ] Implement KYC service
- [ ] Implement routes (RPC and API)
- [ ] Add authentication middleware
- [ ] Add input validation
- [ ] Test all endpoints
- [ ] Create Dockerfile
- [ ] Deploy and verify functionality

---

## Next Steps

1. Deploy the API server
2. Test all endpoints with the deployed contract
3. Proceed to `04_BLOCKSCOUT_EXPLORER.md` to set up the explorer
