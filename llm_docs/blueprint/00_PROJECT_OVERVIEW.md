# Viddhana Blockscan - Project Overview

## Quick Reference
| Attribute | Value |
|-----------|-------|
| Project Name | Viddhana Blockscan |
| Chain Type | Private EVM (Geth) |
| Consensus | Clique (Proof of Authority) |
| Chain ID | 1337 |
| Native Coin | BTCD (BTC Diamond) |
| Block Time | 5 seconds |
| Nodes | 2 (Sealer/Bootnode + Peer) |

---

## 1. System Architecture

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                           VIDDHANA BLOCKSCAN SYSTEM                         │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                             │
│  ┌─────────────────┐     ┌─────────────────┐                               │
│  │   GETH NODE 1   │◄───►│   GETH NODE 2   │                               │
│  │ (Sealer/Boot)   │     │   (Peer/Seal)   │                               │
│  │   Port: 30303   │     │   Port: 30304   │                               │
│  │   RPC: 8545     │     │                 │                               │
│  │   WS: 8546      │     │                 │                               │
│  └────────┬────────┘     └─────────────────┘                               │
│           │                                                                 │
│           │ HTTP/WS                                                         │
│           ▼                                                                 │
│  ┌─────────────────────────────────────────┐                               │
│  │           BLOCKSCOUT EXPLORER           │                               │
│  │   - Real-time block/tx tracking         │                               │
│  │   - Contract verification               │                               │
│  │   - Read/Write contract interaction     │                               │
│  │   - Custom Viddhana UI Theme            │                               │
│  └────────┬────────────────────────────────┘                               │
│           │                                                                 │
│           │ API                                                             │
│           ▼                                                                 │
│  ┌─────────────────────────────────────────┐                               │
│  │         MIDDLEWARE API (KYC)            │                               │
│  │   - GET /rpc/check_kyc                  │                               │
│  │   - POST /api/approve_kyc               │                               │
│  │   - Interacts with ViddhanaKYC.sol      │                               │
│  └────────┬────────────────────────────────┘                               │
│           │                                                                 │
│           │ Web3                                                            │
│           ▼                                                                 │
│  ┌─────────────────────────────────────────┐                               │
│  │       SMART CONTRACTS (EVM)             │                               │
│  │   - ViddhanaKYC.sol (System Contract)   │                               │
│  │   - User-deployed contracts             │                               │
│  └─────────────────────────────────────────┘                               │
│                                                                             │
└─────────────────────────────────────────────────────────────────────────────┘
```

---

## 2. Technology Stack

| Layer | Technology | Purpose |
|-------|------------|---------|
| Blockchain | Go-Ethereum (Geth) | Private EVM chain with Clique PoA |
| Smart Contracts | Solidity ^0.8.0 | On-chain KYC registry |
| Explorer | Blockscout | Block/Tx explorer with contract verification |
| Middleware | Node.js OR Python | Custom KYC API wrapper |
| Frontend | Blockscout + Custom CSS | Themed explorer UI |
| Database | PostgreSQL | Blockscout data storage |
| Containerization | Docker + Docker Compose | Deployment orchestration |

---

## 3. Core Components

### 3.1 Blockchain Layer (Geth)
- **2-Node Private Network** with Clique PoA consensus
- **Node 1**: Primary sealer, RPC/WS endpoint, bootnode
- **Node 2**: Secondary sealer, peer node for redundancy
- **Pre-allocated funds** for admin wallet

### 3.2 Smart Contract Layer
- **ViddhanaKYC.sol**: On-chain KYC registry
  - `setKYC(address, bool)` - Owner-only KYC update
  - `isKYC(address)` - Public KYC status check
  - `kycStatus` mapping - Address to KYC status

### 3.3 Middleware API Layer
- **Custom RPC-like endpoints** for KYC operations
- Wraps smart contract calls
- Provides REST API interface

### 3.4 Explorer Layer (Blockscout)
- Real-time block and transaction tracking via WebSocket
- Contract source code verification
- Read/Write contract interaction UI
- Custom Viddhana branding

---

## 4. Implementation Phases

| Phase | Component | Document Reference |
|-------|-----------|-------------------|
| Phase 1 | Blockchain Network Setup | `01_GETH_BLOCKCHAIN_SETUP.md` |
| Phase 2 | KYC Smart Contract | `02_KYC_SMART_CONTRACT.md` |
| Phase 3 | Middleware API | `03_MIDDLEWARE_API.md` |
| Phase 4 | Blockscout Explorer | `04_BLOCKSCOUT_EXPLORER.md` |
| Phase 5 | Frontend Customization | `05_FRONTEND_CUSTOMIZATION.md` |

---

## 5. Key Features

### 5.1 Native Coin (BTCD)
- Name: BTC Diamond
- Symbol: BTCD
- Decimals: 18
- Pre-minted supply allocated to admin

### 5.2 KYC System
- On-chain registry (immutable, auditable)
- API endpoints for integration
- Badge display in explorer

### 5.3 Real-Time Updates
- WebSocket connection between Geth and Blockscout
- Live block/transaction feeds
- No page refresh required

### 5.4 Contract Verification
- Source code upload and verification
- Bytecode matching
- Auto-generated Read/Write UI

---

## 6. Network Configuration Summary

```json
{
  "chainId": 1337,
  "networkName": "Viddhana Chain",
  "nativeCoin": {
    "name": "BTC Diamond",
    "symbol": "BTCD",
    "decimals": 18
  },
  "consensus": "Clique (PoA)",
  "blockTime": "5 seconds",
  "nodes": {
    "node1": {
      "role": "Sealer/Bootnode/RPC",
      "p2pPort": 30303,
      "rpcPort": 8545,
      "wsPort": 8546
    },
    "node2": {
      "role": "Sealer/Peer",
      "p2pPort": 30304
    }
  }
}
```

---

## 7. Prerequisites for Implementation

### System Requirements
- Ubuntu 20.04+ or compatible Linux
- Docker 20.10+ and Docker Compose 2.0+
- 4GB+ RAM per node
- 50GB+ SSD storage

### Software Requirements
- Go 1.19+ (if building Geth from source)
- Node.js 18+ (for middleware)
- Python 3.10+ (alternative middleware)
- Git

### Knowledge Requirements
- Basic understanding of EVM and Ethereum
- Docker containerization
- Solidity smart contracts
- REST API development

---

## 8. Document Navigation

| Document | Description |
|----------|-------------|
| `00_PROJECT_OVERVIEW.md` | This file - Project summary |
| `01_GETH_BLOCKCHAIN_SETUP.md` | Step-by-step blockchain setup |
| `02_KYC_SMART_CONTRACT.md` | Smart contract implementation |
| `03_MIDDLEWARE_API.md` | API server implementation |
| `04_BLOCKSCOUT_EXPLORER.md` | Explorer deployment |
| `05_FRONTEND_CUSTOMIZATION.md` | UI/UX customization |
| `FILE_STRUCTURE.md` | Complete project file structure |
| `TRACKER.md` | LLM Agent task tracker |

---

## 9. Success Criteria

- [ ] 2-node Geth network running with Clique PoA
- [ ] BTCD coin functional for transactions
- [ ] ViddhanaKYC contract deployed and verified
- [ ] Middleware API operational
- [ ] Blockscout explorer with real-time updates
- [ ] Custom Viddhana UI theme applied
- [ ] Contract Read/Write functionality working
- [ ] KYC badge integration complete
