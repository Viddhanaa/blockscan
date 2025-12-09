# Viddhana Blockscan Documentation

## Overview

Viddhana Blockscan is a complete blockchain infrastructure solution consisting of:

- **Private Blockchain**: 2-node Clique Proof-of-Authority (PoA) Geth network
- **Block Explorer**: Blockscout-based explorer with full indexing capabilities
- **KYC Smart Contract**: On-chain KYC verification system
- **KYC API**: RESTful middleware for KYC operations

---

## Table of Contents

1. [Architecture](#architecture)
2. [Access URLs](#access-urls)
3. [Blockchain Network](#blockchain-network)
4. [Blockscout Explorer](#blockscout-explorer)
5. [KYC System](#kyc-system)
6. [API Reference](#api-reference)
7. [Docker Services](#docker-services)
8. [Configuration](#configuration)
9. [Management Commands](#management-commands)
10. [Troubleshooting](#troubleshooting)

---

## Architecture

```
                                    Internet
                                        │
                                        ▼
                              ┌─────────────────┐
                              │  Cloudflare     │
                              │  Tunnel         │
                              └────────┬────────┘
                                       │
        ┌──────────────────────────────┼──────────────────────────────┐
        │                              │                              │
        ▼                              ▼                              ▼
┌───────────────┐           ┌─────────────────┐           ┌───────────────┐
│ scan.viddhana │           │ rpc.viddhana    │           │ api.viddhana  │
│ .com          │           │ .com            │           │ .com          │
│ (Explorer)    │           │ (RPC)           │           │ (KYC API)     │
└───────┬───────┘           └────────┬────────┘           └───────┬───────┘
        │                            │                            │
        ▼                            ▼                            ▼
┌───────────────┐           ┌─────────────────┐           ┌───────────────┐
│ Nginx Proxy   │           │                 │           │ Express.js    │
│ :15000        │           │   Geth Node 1   │           │ KYC API       │
└───────┬───────┘           │   :8545         │           │ :3001         │
        │                   │                 │           └───────┬───────┘
   ┌────┴────┐              └────────┬────────┘                   │
   │         │                       │                            │
   ▼         ▼                       │                            ▼
┌──────┐ ┌────────┐                  │                   ┌───────────────┐
│Front │ │Backend │                  │                   │ ViddhanaKYC   │
│end   │ │:14000  │◄─────────────────┤                   │ Contract      │
│:13000│ └────┬───┘                  │                   └───────────────┘
└──────┘      │                      │
              │               ┌──────┴──────┐
              ▼               │             │
        ┌──────────┐    ┌─────────┐   ┌─────────┐
        │PostgreSQL│    │ Node 1  │◄─►│ Node 2  │
        │ Redis    │    │ :8545   │   │ :8547   │
        └──────────┘    └─────────┘   └─────────┘
```

---

## Access URLs

### Production (via Cloudflare Tunnel)

| Service | URL | Description |
|---------|-----|-------------|
| Block Explorer | https://scan.viddhana.com | Blockscout Explorer UI |
| RPC Endpoint | https://rpc.viddhana.com | JSON-RPC API |
| KYC API | https://api.viddhana.com | KYC REST API |
| WebSocket | wss://wss.viddhana.com | Direct WebSocket to backend |
| WebSocket via Nginx | wss://ws.viddhana.com | WebSocket through Nginx |
| Main Website | https://viddhana.com | Main website |
| Documentation | https://docs.viddhana.com | Documentation site |

### Local Development

| Service | URL | Description |
|---------|-----|-------------|
| Block Explorer | http://localhost:15000 | Blockscout via Nginx |
| Blockscout API | http://localhost:14000/api/v2 | Blockscout Backend API |
| RPC Node 1 | http://localhost:8545 | Primary Geth Node |
| RPC Node 2 | http://localhost:8547 | Secondary Geth Node |
| WebSocket Node 1 | ws://localhost:8546 | Primary WebSocket |
| WebSocket Node 2 | ws://localhost:8548 | Secondary WebSocket |
| KYC API | http://localhost:3001 | KYC Middleware API |

---

## Blockchain Network

### Network Configuration

| Parameter | Value |
|-----------|-------|
| Network Name | Viddhana |
| Chain ID | 1337 |
| Consensus | Clique (Proof-of-Authority) |
| Block Time | ~5 seconds |
| Gas Limit | 30,000,000 |
| Currency Symbol | ETH |

### Validator Nodes

#### Node 1 (Primary)
- **Address**: `0xC6EF29019d6acB8F50F464A015CfeA63a8a45C15`
- **RPC Port**: 8545
- **WebSocket Port**: 8546
- **P2P Port**: 30303
- **Container**: `viddhana-node1`

#### Node 2 (Secondary)
- **Address**: `0x24E63eFDaBB8103e5125e8Ed3428773bbFA72ec4`
- **RPC Port**: 8547
- **WebSocket Port**: 8548
- **P2P Port**: 30304
- **Container**: `viddhana-node2`

### Connecting via MetaMask

1. Open MetaMask > Networks > Add Network
2. Enter the following:
   - **Network Name**: Viddhana
   - **RPC URL**: https://rpc.viddhana.com (or http://localhost:8545)
   - **Chain ID**: 1337
   - **Currency Symbol**: ETH
   - **Block Explorer URL**: https://scan.viddhana.com

### RPC Methods

```bash
# Get current block number
curl -X POST https://rpc.viddhana.com \
  -H "Content-Type: application/json" \
  -d '{"jsonrpc":"2.0","method":"eth_blockNumber","params":[],"id":1}'

# Get balance
curl -X POST https://rpc.viddhana.com \
  -H "Content-Type: application/json" \
  -d '{"jsonrpc":"2.0","method":"eth_getBalance","params":["0xC6EF29019d6acB8F50F464A015CfeA63a8a45C15","latest"],"id":1}'

# Get peer count
curl -X POST https://rpc.viddhana.com \
  -H "Content-Type: application/json" \
  -d '{"jsonrpc":"2.0","method":"net_peerCount","params":[],"id":1}'
```

---

## Blockscout Explorer

### Features

- Real-time block and transaction indexing
- Address balance tracking
- Smart contract verification
- Token tracking (ERC-20, ERC-721, ERC-1155)
- API access for developers
- GraphQL support

### Explorer Pages

| Page | URL |
|------|-----|
| Home | https://scan.viddhana.com |
| Blocks | https://scan.viddhana.com/blocks |
| Transactions | https://scan.viddhana.com/txs |
| Accounts | https://scan.viddhana.com/accounts |
| Tokens | https://scan.viddhana.com/tokens |
| Verified Contracts | https://scan.viddhana.com/verified-contracts |
| API Docs | https://scan.viddhana.com/api-docs |

### Blockscout API Examples

```bash
# Get blockchain stats
curl https://scan.viddhana.com/api/v2/stats

# Get latest blocks
curl https://scan.viddhana.com/api/v2/blocks

# Get transactions
curl https://scan.viddhana.com/api/v2/transactions

# Get address info
curl https://scan.viddhana.com/api/v2/addresses/0xC6EF29019d6acB8F50F464A015CfeA63a8a45C15

# Search
curl "https://scan.viddhana.com/api/v2/search?q=0x..."
```

---

## KYC System

### Smart Contract

| Property | Value |
|----------|-------|
| Contract Name | ViddhanaKYC |
| Address | `0x066eB73F28c48B5ef07CB82E0522e233794C451e` |
| Network | Viddhana (Chain ID: 1337) |
| Deployer | `0xC6EF29019d6acB8F50F464A015CfeA63a8a45C15` |

### Contract Functions

```solidity
// Check if address is KYC approved
function isApproved(address _address) public view returns (bool)

// Approve KYC for an address (admin only)
function approveKYC(address _address) public onlyAdmin

// Revoke KYC for an address (admin only)
function revokeKYC(address _address) public onlyAdmin

// Get KYC status details
function getKYCStatus(address _address) public view returns (bool approved, uint256 timestamp)
```

### Contract ABI

```json
[
  {
    "inputs": [{"name": "_address", "type": "address"}],
    "name": "isApproved",
    "outputs": [{"name": "", "type": "bool"}],
    "stateMutability": "view",
    "type": "function"
  },
  {
    "inputs": [{"name": "_address", "type": "address"}],
    "name": "approveKYC",
    "outputs": [],
    "stateMutability": "nonpayable",
    "type": "function"
  },
  {
    "inputs": [{"name": "_address", "type": "address"}],
    "name": "revokeKYC",
    "outputs": [],
    "stateMutability": "nonpayable",
    "type": "function"
  }
]
```

---

## API Reference

### KYC API

**Base URL**: `https://api.viddhana.com` (or `http://localhost:3001`)

#### Authentication

All POST endpoints require API key authentication:

```
Header: X-API-Key: viddhana-api-key-2024
```

#### Endpoints

##### Health Check

```http
GET /health
```

Response:
```json
{
  "status": "healthy",
  "timestamp": "2025-12-06T16:00:00.000Z"
}
```

##### Check KYC Status

```http
GET /rpc/check_kyc?address=0x...
```

Response:
```json
{
  "success": true,
  "data": {
    "address": "0x...",
    "isApproved": true,
    "timestamp": 1733500000
  }
}
```

##### Approve KYC

```http
POST /api/approve_kyc
Content-Type: application/json
X-API-Key: viddhana-api-key-2024

{
  "address": "0x..."
}
```

Response:
```json
{
  "success": true,
  "data": {
    "address": "0x...",
    "transactionHash": "0x...",
    "blockNumber": 123
  }
}
```

##### Revoke KYC

```http
POST /api/revoke_kyc
Content-Type: application/json
X-API-Key: viddhana-api-key-2024

{
  "address": "0x..."
}
```

Response:
```json
{
  "success": true,
  "data": {
    "address": "0x...",
    "transactionHash": "0x...",
    "blockNumber": 124
  }
}
```

#### Error Responses

```json
{
  "success": false,
  "error": {
    "code": "INVALID_ADDRESS",
    "message": "Invalid Ethereum address format"
  }
}
```

---

## Docker Services

### Container Overview

| Container | Image | Ports | Purpose |
|-----------|-------|-------|---------|
| viddhana-node1 | ethereum/client-go:v1.13.15 | 8545, 8546, 30303 | Primary validator |
| viddhana-node2 | ethereum/client-go:v1.13.15 | 8547, 8548, 30304 | Secondary validator |
| viddhana-blockscout-backend | blockscout/blockscout:latest | 4000, 14000 | Explorer backend/indexer |
| viddhana-blockscout-frontend | ghcr.io/blockscout/frontend:latest | 13000 | Explorer frontend |
| viddhana-nginx | nginx:alpine | 15000 | Reverse proxy |
| viddhana-kyc-api | custom | 3001 | KYC middleware API |
| viddhana-ws-relay | custom | 16000 | WebSocket relay (bypasses Cloudflare HTTP/2) |
| viddhana-db | postgres:14 | 5432 | Blockscout database |
| viddhana-redis | redis:alpine | 6379 | Blockscout cache |

### Docker Networks

| Network | Purpose |
|---------|---------|
| viddhana-network | Internal communication between Blockscout services |
| bridge | Node containers and external access |

### Management Commands

```bash
# View all containers
docker ps --filter "name=viddhana"

# View logs
docker logs viddhana-node1 -f
docker logs viddhana-blockscout-backend -f
docker logs viddhana-blockscout-frontend -f

# Restart a service
docker restart viddhana-blockscout-backend

# Stop all services
docker stop $(docker ps -q --filter "name=viddhana")

# Start all services
docker start $(docker ps -aq --filter "name=viddhana")
```

---

## Configuration

### File Locations

| File | Purpose |
|------|---------|
| `/home/realcodes/VIddhana_blockscan/.env` | Main environment variables |
| `/home/realcodes/VIddhana_blockscan/api/.env` | KYC API configuration |
| `/home/realcodes/VIddhana_blockscan/config/genesis.json` | Blockchain genesis config |
| `/home/realcodes/VIddhana_blockscan/nginx/nginx.conf` | Nginx reverse proxy config |
| `/etc/cloudflared/config.yml` | Cloudflare tunnel config |

### Environment Variables

#### Main `.env`

```env
# Blockchain
CHAIN_ID=1337
NETWORK_NAME=Viddhana

# Node 1
NODE1_ADDRESS=0xC6EF29019d6acB8F50F464A015CfeA63a8a45C15
NODE1_RPC_PORT=8545
NODE1_WS_PORT=8546
NODE1_P2P_PORT=30303

# Node 2
NODE2_ADDRESS=0x24E63eFDaBB8103e5125e8Ed3428773bbFA72ec4
NODE2_RPC_PORT=8547
NODE2_WS_PORT=8548
NODE2_P2P_PORT=30304

# Blockscout
BLOCKSCOUT_BACKEND_PORT=14000
BLOCKSCOUT_FRONTEND_PORT=13000

# Database
POSTGRES_USER=blockscout
POSTGRES_PASSWORD=blockscout123
POSTGRES_DB=blockscout
```

#### API `.env`

```env
PORT=3001
NODE_ENV=development
RPC_URL=http://localhost:8545
CHAIN_ID=1337
KYC_CONTRACT_ADDRESS=0x066eB73F28c48B5ef07CB82E0522e233794C451e
ADMIN_PRIVATE_KEY=0x...
API_KEY=viddhana-api-key-2024
CORS_ORIGIN=*
```

---

## Management Commands

### Blockchain Operations

```bash
# Check node sync status
curl -X POST http://localhost:8545 \
  -H "Content-Type: application/json" \
  -d '{"jsonrpc":"2.0","method":"eth_syncing","params":[],"id":1}'

# Check peer count
curl -X POST http://localhost:8545 \
  -H "Content-Type: application/json" \
  -d '{"jsonrpc":"2.0","method":"net_peerCount","params":[],"id":1}'

# Get current block
curl -X POST http://localhost:8545 \
  -H "Content-Type: application/json" \
  -d '{"jsonrpc":"2.0","method":"eth_blockNumber","params":[],"id":1}'
```

### Blockscout Operations

```bash
# Check indexing status
curl http://localhost:14000/api/v2/stats

# Force reindex (requires backend restart)
docker restart viddhana-blockscout-backend
```

### Cloudflare Tunnel

```bash
# Check tunnel status
cloudflared tunnel list

# Restart tunnel
sudo systemctl restart cloudflared

# View tunnel logs
sudo journalctl -u cloudflared -f
```

### PM2 (KYC API)

```bash
# Check API status
pm2 status viddhana-api

# View logs
pm2 logs viddhana-api

# Restart API
pm2 restart viddhana-api
```

---

## Troubleshooting

### Common Issues

#### 1. Blockscout shows "No data"

**Cause**: SSR cannot reach the API endpoint.

**Solution**:
```bash
# Check if backend is running
curl http://localhost:14000/api/v2/stats

# Check nginx proxy
docker logs viddhana-nginx

# Restart frontend
docker restart viddhana-blockscout-frontend
```

#### 2. Nodes not syncing

**Cause**: Nodes cannot find each other.

**Solution**:
```bash
# Check peer connections
docker exec viddhana-node1 geth attach --exec "admin.peers" /root/.ethereum/geth.ipc

# Manually add peer
docker exec viddhana-node1 geth attach --exec "admin.addPeer('enode://...')" /root/.ethereum/geth.ipc
```

#### 3. KYC API returns 500 error

**Cause**: Contract connection issue.

**Solution**:
```bash
# Check RPC connectivity
curl http://localhost:8545 -X POST -H "Content-Type: application/json" \
  -d '{"jsonrpc":"2.0","method":"eth_chainId","params":[],"id":1}'

# Check API logs
pm2 logs viddhana-api --lines 50
```

#### 4. Cloudflare tunnel not working

**Cause**: Tunnel disconnected or config error.

**Solution**:
```bash
# Check tunnel status
sudo systemctl status cloudflared

# Check config
cat /etc/cloudflared/config.yml

# Restart tunnel
sudo systemctl restart cloudflared
```

### Logs Location

| Service | Log Command |
|---------|-------------|
| Node 1 | `docker logs viddhana-node1 -f` |
| Node 2 | `docker logs viddhana-node2 -f` |
| Blockscout Backend | `docker logs viddhana-blockscout-backend -f` |
| Blockscout Frontend | `docker logs viddhana-blockscout-frontend -f` |
| Nginx | `docker logs viddhana-nginx -f` |
| KYC API | `pm2 logs viddhana-api -f` |
| Cloudflare Tunnel | `sudo journalctl -u cloudflared -f` |

---

## Security Considerations

### Private Keys

- **NEVER** commit private keys to version control
- Store admin private key securely
- Use environment variables for sensitive data

### API Security

- API key required for write operations
- Rate limiting enabled (100 requests per 15 minutes)
- CORS configured for allowed origins

### Network Security

- RPC endpoints exposed only via Cloudflare Tunnel
- Internal services communicate via Docker networks
- Firewall rules recommended for production

---

## Backup and Recovery

### Database Backup

```bash
# Backup Blockscout database
docker exec viddhana-db pg_dump -U blockscout blockscout > backup.sql

# Restore
docker exec -i viddhana-db psql -U blockscout blockscout < backup.sql
```

### Blockchain Data Backup

```bash
# Backup node data
docker cp viddhana-node1:/root/.ethereum ./node1-backup
docker cp viddhana-node2:/root/.ethereum ./node2-backup
```

---

## Contact & Support

- **Documentation**: https://docs.viddhana.com
- **GitHub**: https://github.com/viddhana
- **Email**: support@viddhana.com

---

*Last updated: December 9, 2025*
