# Viddhana Blockscan - Complete File Structure

## Overview
This document provides the complete file and folder structure for the Viddhana Blockscan project after full implementation.

---

## Root Project Structure

```
viddhana-chain/
│
├── README.md                          # Project documentation
├── .gitignore                         # Git ignore file
├── .env.example                       # Environment template
│
├── config/                            # Shared configuration
│   ├── genesis.json                   # Genesis block configuration
│   └── password.txt                   # Node account passwords
│
├── node1/                             # Geth Node 1
│   ├── data/                          # Blockchain data
│   │   ├── geth/                      # Geth database
│   │   └── keystore/                  # Account keys
│   └── geth.log                       # Node logs
│
├── node2/                             # Geth Node 2
│   ├── data/                          # Blockchain data
│   │   ├── geth/                      # Geth database
│   │   └── keystore/                  # Account keys
│   └── geth.log                       # Node logs
│
├── contracts/                         # Smart Contracts (Hardhat)
│   ├── contracts/
│   │   └── ViddhanaKYC.sol
│   ├── scripts/
│   │   ├── deploy.js
│   │   ├── interact.js
│   │   └── export-abi.js
│   ├── test/
│   │   └── ViddhanaKYC.test.js
│   ├── deployments/
│   │   └── viddhana.json
│   ├── abi/
│   │   └── ViddhanaKYC.json
│   ├── hardhat.config.js
│   ├── package.json
│   └── .env
│
├── api/                               # Middleware API (Node.js)
│   ├── src/
│   │   ├── index.js
│   │   ├── config/
│   │   │   └── index.js
│   │   ├── routes/
│   │   │   ├── rpc.js
│   │   │   └── api.js
│   │   ├── services/
│   │   │   └── kyc.service.js
│   │   ├── middleware/
│   │   │   ├── auth.js
│   │   │   └── validator.js
│   │   └── utils/
│   │       └── logger.js
│   ├── abi/
│   │   └── ViddhanaKYC.json
│   ├── logs/
│   │   ├── error.log
│   │   └── combined.log
│   ├── Dockerfile
│   ├── package.json
│   └── .env
│
├── api-python/                        # Middleware API (Python - Alternative)
│   ├── app/
│   │   ├── __init__.py
│   │   ├── main.py
│   │   ├── config.py
│   │   ├── routes/
│   │   │   ├── __init__.py
│   │   │   ├── rpc.py
│   │   │   └── api.py
│   │   ├── services/
│   │   │   ├── __init__.py
│   │   │   └── kyc_service.py
│   │   └── middleware/
│   │       ├── __init__.py
│   │       └── auth.py
│   ├── abi/
│   │   └── ViddhanaKYC.json
│   ├── run.py
│   ├── Dockerfile
│   ├── requirements.txt
│   └── .env
│
├── blockscout/                        # Blockscout Explorer
│   ├── docker-compose.yml
│   ├── .env
│   ├── postgres-data/                 # PostgreSQL data (gitignore)
│   ├── redis-data/                    # Redis data (gitignore)
│   ├── logs/                          # Application logs
│   ├── assets/                        # Custom assets
│   │   ├── logo.svg
│   │   ├── logo-dark.svg
│   │   ├── icon.svg
│   │   ├── favicon.ico
│   │   └── custom.css
│   ├── config/
│   │   └── logrotate.conf
│   └── scripts/
│       ├── health_check.sh
│       └── backup_db.sh
│
├── blockscout-frontend/               # Custom Frontend (Optional)
│   ├── components/
│   │   ├── Header/
│   │   │   └── CustomHeader.tsx
│   │   ├── KYCBadge/
│   │   │   └── KYCBadge.tsx
│   │   ├── Stats/
│   │   │   └── CustomStatsCards.tsx
│   │   └── AddNetworkButton.tsx
│   ├── theme/
│   │   └── custom-theme.ts
│   ├── public/
│   │   ├── logo.svg
│   │   └── favicon.ico
│   ├── .env.local
│   ├── Dockerfile.custom
│   └── package.json
│
├── scripts/                           # Utility scripts
│   ├── start_node1.sh
│   ├── start_node2.sh
│   ├── stop_all.sh
│   ├── setup.sh
│   └── generate_extradata.sh
│
├── backups/                           # Database backups (gitignore)
│   └── blockscout_YYYYMMDD.sql.gz
│
└── docs/                              # Additional documentation
    └── API_REFERENCE.md
```

---

## Detailed File Descriptions

### Root Level

| File/Folder | Purpose |
|-------------|---------|
| `README.md` | Project overview and quick start guide |
| `.gitignore` | Exclude sensitive/generated files |
| `.env.example` | Template for environment variables |
| `config/` | Shared blockchain configuration |

### config/

| File | Purpose |
|------|---------|
| `genesis.json` | Genesis block with Clique PoA config, chain ID, pre-allocated funds |
| `password.txt` | Password for unlocking sealer accounts |

### node1/ & node2/

| Path | Purpose |
|------|---------|
| `data/geth/` | LevelDB blockchain database |
| `data/keystore/` | Encrypted account keys (UTC--*) |
| `geth.log` | Node runtime logs |

### contracts/

| Path | Purpose |
|------|---------|
| `contracts/ViddhanaKYC.sol` | KYC registry smart contract |
| `scripts/deploy.js` | Deployment script |
| `scripts/interact.js` | Contract interaction examples |
| `scripts/export-abi.js` | ABI extraction script |
| `test/ViddhanaKYC.test.js` | Unit tests |
| `deployments/viddhana.json` | Deployment addresses and info |
| `abi/ViddhanaKYC.json` | Contract ABI for middleware |
| `hardhat.config.js` | Hardhat network configuration |
| `.env` | Private keys (never commit!) |

### api/ (Node.js)

| Path | Purpose |
|------|---------|
| `src/index.js` | Express app entry point |
| `src/config/index.js` | Environment configuration |
| `src/routes/rpc.js` | Public RPC endpoints |
| `src/routes/api.js` | Admin API endpoints |
| `src/services/kyc.service.js` | Smart contract interaction logic |
| `src/middleware/auth.js` | API key authentication |
| `src/middleware/validator.js` | Input validation |
| `src/utils/logger.js` | Winston logging setup |
| `abi/ViddhanaKYC.json` | Copy of contract ABI |
| `logs/` | Application logs |
| `Dockerfile` | Container build file |
| `.env` | Environment variables |

### api-python/ (Alternative)

| Path | Purpose |
|------|---------|
| `app/main.py` | FastAPI application |
| `app/config.py` | Configuration settings |
| `app/routes/rpc.py` | Public RPC endpoints |
| `app/routes/api.py` | Admin API endpoints |
| `app/services/kyc_service.py` | Contract interaction |
| `run.py` | Uvicorn runner |
| `requirements.txt` | Python dependencies |

### blockscout/

| Path | Purpose |
|------|---------|
| `docker-compose.yml` | Full Blockscout stack |
| `.env` | Blockscout configuration |
| `postgres-data/` | PostgreSQL persistent storage |
| `redis-data/` | Redis persistent storage |
| `logs/` | Application logs |
| `assets/logo.svg` | Custom branding logo |
| `assets/custom.css` | CSS overrides |
| `scripts/health_check.sh` | Service monitoring |
| `scripts/backup_db.sh` | Database backup |

### blockscout-frontend/ (Optional Custom Build)

| Path | Purpose |
|------|---------|
| `components/` | Custom React components |
| `theme/custom-theme.ts` | Chakra UI theme overrides |
| `public/` | Static assets |
| `.env.local` | Frontend environment |
| `Dockerfile.custom` | Custom build image |

### scripts/

| File | Purpose |
|------|---------|
| `start_node1.sh` | Start Geth Node 1 |
| `start_node2.sh` | Start Geth Node 2 |
| `stop_all.sh` | Stop all services |
| `setup.sh` | Initial setup script |
| `generate_extradata.sh` | Generate genesis extraData |

---

## .gitignore Template

```gitignore
# Environment files
.env
.env.local
*.env

# Private keys
password.txt
**/keystore/*

# Node modules
node_modules/
__pycache__/
*.pyc
venv/

# Build artifacts
build/
dist/
artifacts/
cache/
*.egg-info/

# Blockchain data
node1/data/geth/
node2/data/geth/
blockscout/postgres-data/
blockscout/redis-data/

# Logs
*.log
logs/

# Backups
backups/

# IDE
.vscode/
.idea/
*.swp
*.swo

# OS
.DS_Store
Thumbs.db

# Test coverage
coverage/
.nyc_output/

# Misc
*.bak
*.tmp
```

---

## Environment Files Reference

### config/.env.example (Root)
```env
# Blockchain
CHAIN_ID=1337
NETWORK_NAME=Viddhana Chain

# Signer Addresses (fill after account creation)
SIGNER_ADDRESS_1=0x...
SIGNER_ADDRESS_2=0x...
```

### contracts/.env
```env
OWNER_PRIVATE_KEY=0x...
RPC_URL=http://localhost:8545
```

### api/.env
```env
PORT=3000
NODE_ENV=development
RPC_URL=http://localhost:8545
CHAIN_ID=1337
KYC_CONTRACT_ADDRESS=0x...
ADMIN_PRIVATE_KEY=0x...
API_KEY=your_secret_api_key
```

### blockscout/.env
```env
DATABASE_URL=postgresql://blockscout:password@postgres:5432/blockscout
ETHEREUM_JSONRPC_HTTP_URL=http://geth-node1:8545
ETHEREUM_JSONRPC_WS_URL=ws://geth-node1:8546
CHAIN_ID=1337
NETWORK=Viddhana
COIN=BTCD
SECRET_KEY_BASE=...
```

---

## Docker Network Diagram

```
┌─────────────────────────────────────────────────────────────────┐
│                    viddhana-network                             │
│                                                                 │
│  ┌───────────────┐                                             │
│  │  geth-node1   │◄──────────────────────────────────────────┐ │
│  │   :8545/8546  │                                           │ │
│  └───────────────┘                                           │ │
│         ▲                                                    │ │
│         │                                                    │ │
│  ┌──────┴────────┐  ┌────────────────┐  ┌────────────────┐  │ │
│  │   postgres    │  │     redis      │  │   verifier     │  │ │
│  │    :5432      │  │     :6379      │  │     :8050      │  │ │
│  └───────────────┘  └────────────────┘  └────────────────┘  │ │
│         ▲                  ▲                   ▲             │ │
│         │                  │                   │             │ │
│         └──────────────────┼───────────────────┘             │ │
│                            │                                 │ │
│                     ┌──────┴──────┐                         │ │
│                     │  blockscout │                         │ │
│                     │    :4000    │─────────────────────────┘ │
│                     └─────────────┘                           │
│                            ▲                                  │
│                            │                                  │
│                     ┌──────┴──────┐                          │
│                     │  frontend   │                          │
│                     │    :3000    │                          │
│                     └─────────────┘                          │
│                                                               │
│  ┌───────────────┐                                           │
│  │   kyc-api     │ (Middleware)                              │
│  │    :3001      │───────────────────────► geth-node1        │
│  └───────────────┘                                           │
│                                                               │
└─────────────────────────────────────────────────────────────────┘
```

---

## Quick Commands Reference

### Blockchain
```bash
# Start Node 1
./scripts/start_node1.sh

# Start Node 2
./scripts/start_node2.sh

# Attach to Node 1 console
geth attach ~/viddhana-chain/node1/data/geth.ipc
```

### Smart Contracts
```bash
cd ~/viddhana-chain/contracts

# Compile
npx hardhat compile

# Test
npx hardhat test

# Deploy
npx hardhat run scripts/deploy.js --network viddhana
```

### Middleware API
```bash
cd ~/viddhana-chain/api

# Development
npm run dev

# Production
npm start
```

### Blockscout
```bash
cd ~/viddhana-chain/blockscout

# Start all services
docker-compose up -d

# View logs
docker-compose logs -f

# Stop
docker-compose down
```

---

## Checklist: Files to Create

| Phase | Files | Count |
|-------|-------|-------|
| Phase 1 | genesis.json, password.txt, start scripts | 5 |
| Phase 2 | ViddhanaKYC.sol, deploy.js, test.js, hardhat.config.js | 6 |
| Phase 3 | All API files (Node.js or Python) | 10-12 |
| Phase 4 | docker-compose.yml, .env, scripts | 5 |
| Phase 5 | Logo assets, custom.css | 5 |

**Total estimated files: ~35-40**

---

_End of File Structure Document_
