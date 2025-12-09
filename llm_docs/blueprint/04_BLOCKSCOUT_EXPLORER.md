# Phase 4: Blockscout Explorer Setup

## Overview
This document provides detailed instructions for deploying and configuring Blockscout as the block explorer for Viddhana Chain, with real-time updates and contract verification capabilities.

---

## Prerequisites

### System Requirements
```
- OS: Ubuntu 20.04+ or compatible Linux
- RAM: 8GB minimum (16GB recommended)
- Storage: 100GB+ SSD
- Docker 20.10+
- Docker Compose 2.0+
```

### Network Requirements
- Geth Node 1 running with RPC (port 8545) and WS (port 8546)
- Ports 4000 (Blockscout UI) and 4001 (API) available

---

## Architecture Overview

```
┌──────────────────────────────────────────────────────────────────┐
│                     BLOCKSCOUT STACK                             │
├──────────────────────────────────────────────────────────────────┤
│                                                                  │
│  ┌──────────────┐    ┌──────────────┐    ┌──────────────┐       │
│  │   Frontend   │◄──►│   Backend    │◄──►│   Indexer    │       │
│  │   (Next.js)  │    │   (Elixir)   │    │   (Elixir)   │       │
│  │   Port:3000  │    │   Port:4000  │    │              │       │
│  └──────────────┘    └──────────────┘    └──────┬───────┘       │
│                                                  │               │
│  ┌──────────────┐    ┌──────────────┐           │               │
│  │  PostgreSQL  │◄───┤    Redis     │           │               │
│  │   Port:5432  │    │   Port:6379  │           │               │
│  └──────────────┘    └──────────────┘           │               │
│                                                  │               │
│  ┌──────────────┐                               │               │
│  │ SC Verifier  │◄──────────────────────────────┘               │
│  │   Port:8050  │                                               │
│  └──────────────┘                                               │
│                                                                  │
└────────────────────────────┬─────────────────────────────────────┘
                             │
                             ▼ HTTP/WebSocket
                     ┌───────────────┐
                     │   GETH NODE   │
                     │  RPC: 8545    │
                     │  WS: 8546     │
                     └───────────────┘
```

---

## Step 1: Create Directory Structure

```bash
# Create Blockscout directory
mkdir -p ~/viddhana-chain/blockscout
cd ~/viddhana-chain/blockscout

# Create subdirectories
mkdir -p config
mkdir -p postgres-data
mkdir -p redis-data
mkdir -p logs
```

---

## Step 2: Environment Configuration

Create `~/viddhana-chain/blockscout/.env`:

```env
# ===========================================
# BLOCKSCOUT ENVIRONMENT CONFIGURATION
# Viddhana Chain - Private EVM Network
# ===========================================

# ============ DATABASE ============
DATABASE_URL=postgresql://blockscout:blockscout_password@postgres:5432/blockscout
POSTGRES_USER=blockscout
POSTGRES_PASSWORD=blockscout_password
POSTGRES_DB=blockscout

# ============ BLOCKCHAIN CONNECTION ============
ETHEREUM_JSONRPC_VARIANT=geth
ETHEREUM_JSONRPC_HTTP_URL=http://geth-node1:8545
ETHEREUM_JSONRPC_WS_URL=ws://geth-node1:8546
ETHEREUM_JSONRPC_TRACE_URL=http://geth-node1:8545

# ============ CHAIN CONFIGURATION ============
CHAIN_ID=1337
NETWORK=Viddhana
SUBNETWORK=Private
COIN=BTCD
COIN_NAME=BTC Diamond

# ============ NETWORK INFO ============
NETWORK_PATH=/
LOGO=/images/viddhana-logo.svg
LOGO_FOOTER=/images/viddhana-logo-footer.svg

# ============ FEATURE FLAGS ============
DISABLE_EXCHANGE_RATES=true
SHOW_PRICE_CHART=false
SHOW_TXS_CHART=true
ENABLE_TXS_STATS=true

# ============ CONTRACT VERIFICATION ============
MICROSERVICE_SC_VERIFIER_ENABLED=true
MICROSERVICE_SC_VERIFIER_URL=http://smart-contract-verifier:8050
MICROSERVICE_SC_VERIFIER_TYPE=sc_verifier

# ============ API CONFIGURATION ============
API_V2_ENABLED=true
DISABLE_WEBAPP=false
API_RATE_LIMIT=50
API_RATE_LIMIT_BY_KEY=10
API_RATE_LIMIT_BY_WHITELISTED_IP=50

# ============ INDEXER CONFIGURATION ============
INDEXER_DISABLE_INTERNAL_TRANSACTIONS_FETCHER=false
INDEXER_DISABLE_PENDING_TRANSACTIONS_FETCHER=false
INDEXER_DISABLE_BLOCK_REWARD_FETCHER=false
BLOCK_TRANSFORMER=clique
FIRST_BLOCK=0
TRACE_FIRST_BLOCK=0

# ============ REDIS ============
REDIS_URL=redis://redis:6379

# ============ SECRET KEY ============
SECRET_KEY_BASE=your_secret_key_base_at_least_64_characters_long_generate_with_openssl_rand_hex_32

# ============ POOL SIZE ============
POOL_SIZE=50
POOL_SIZE_API=10

# ============ ECTO TIMEOUT ============
ECTO_USE_SSL=false

# ============ UI CUSTOMIZATION ============
FOOTER_GITHUB_LINK=https://github.com/your-org/viddhana
FOOTER_DISCORD_LINK=
FOOTER_TELEGRAM_LINK=
FOOTER_TWITTER_LINK=

# ============ REALTIME ============
REALTIME_DISABLED=false
ETHEREUM_JSONRPC_WS_ENABLED=true

# ============ FRONTEND (NEW UI) ============
NEXT_PUBLIC_NETWORK_NAME=Viddhana Chain
NEXT_PUBLIC_NETWORK_SHORT_NAME=Viddhana
NEXT_PUBLIC_NETWORK_ID=1337
NEXT_PUBLIC_NETWORK_CURRENCY_NAME=BTC Diamond
NEXT_PUBLIC_NETWORK_CURRENCY_SYMBOL=BTCD
NEXT_PUBLIC_NETWORK_CURRENCY_DECIMALS=18
NEXT_PUBLIC_API_HOST=localhost
NEXT_PUBLIC_API_BASE_PATH=/
NEXT_PUBLIC_STATS_API_HOST=http://localhost:4000
NEXT_PUBLIC_NETWORK_RPC_URL=http://localhost:8545
NEXT_PUBLIC_IS_TESTNET=true
NEXT_PUBLIC_HOMEPAGE_CHARTS=['daily_txs']
NEXT_PUBLIC_HAS_BEACON_CHAIN=false
NEXT_PUBLIC_NETWORK_VERIFICATION_TYPE=validation
NEXT_PUBLIC_FEATURED_NETWORKS=[]
```

---

## Step 3: Docker Compose Configuration

Create `~/viddhana-chain/blockscout/docker-compose.yml`:

```yaml
version: '3.9'

services:
  # ============ DATABASE ============
  postgres:
    image: postgres:15-alpine
    container_name: blockscout-postgres
    restart: unless-stopped
    environment:
      POSTGRES_USER: ${POSTGRES_USER:-blockscout}
      POSTGRES_PASSWORD: ${POSTGRES_PASSWORD:-blockscout_password}
      POSTGRES_DB: ${POSTGRES_DB:-blockscout}
    volumes:
      - ./postgres-data:/var/lib/postgresql/data
    ports:
      - "5432:5432"
    healthcheck:
      test: ["CMD-SHELL", "pg_isready -U blockscout"]
      interval: 10s
      timeout: 5s
      retries: 5
    networks:
      - blockscout-network

  # ============ REDIS ============
  redis:
    image: redis:7-alpine
    container_name: blockscout-redis
    restart: unless-stopped
    command: redis-server --appendonly yes
    volumes:
      - ./redis-data:/data
    ports:
      - "6379:6379"
    healthcheck:
      test: ["CMD", "redis-cli", "ping"]
      interval: 10s
      timeout: 5s
      retries: 5
    networks:
      - blockscout-network

  # ============ SMART CONTRACT VERIFIER ============
  smart-contract-verifier:
    image: ghcr.io/blockscout/smart-contract-verifier:latest
    container_name: blockscout-verifier
    restart: unless-stopped
    environment:
      SMART_CONTRACT_VERIFIER__SERVER__HTTP__ADDR=0.0.0.0:8050
      SMART_CONTRACT_VERIFIER__SOLIDITY__ENABLED=true
      SMART_CONTRACT_VERIFIER__SOLIDITY__COMPILERS_DIR=/tmp/solidity-compilers
      SMART_CONTRACT_VERIFIER__SOLIDITY__REFRESH_VERSIONS_SCHEDULE=0 0 * * * *
      SMART_CONTRACT_VERIFIER__VYPER__ENABLED=true
      SMART_CONTRACT_VERIFIER__VYPER__COMPILERS_DIR=/tmp/vyper-compilers
      SMART_CONTRACT_VERIFIER__SOURCIFY__ENABLED=false
    ports:
      - "8050:8050"
    networks:
      - blockscout-network

  # ============ BLOCKSCOUT BACKEND ============
  blockscout:
    image: blockscout/blockscout:latest
    container_name: blockscout-backend
    restart: unless-stopped
    depends_on:
      postgres:
        condition: service_healthy
      redis:
        condition: service_healthy
      smart-contract-verifier:
        condition: service_started
    env_file:
      - .env
    environment:
      DATABASE_URL: ${DATABASE_URL}
      ETHEREUM_JSONRPC_VARIANT: ${ETHEREUM_JSONRPC_VARIANT}
      ETHEREUM_JSONRPC_HTTP_URL: ${ETHEREUM_JSONRPC_HTTP_URL}
      ETHEREUM_JSONRPC_WS_URL: ${ETHEREUM_JSONRPC_WS_URL}
      ETHEREUM_JSONRPC_TRACE_URL: ${ETHEREUM_JSONRPC_TRACE_URL}
      CHAIN_ID: ${CHAIN_ID}
      NETWORK: ${NETWORK}
      SUBNETWORK: ${SUBNETWORK}
      COIN: ${COIN}
      COIN_NAME: ${COIN_NAME}
      MICROSERVICE_SC_VERIFIER_ENABLED: ${MICROSERVICE_SC_VERIFIER_ENABLED}
      MICROSERVICE_SC_VERIFIER_URL: ${MICROSERVICE_SC_VERIFIER_URL}
      MICROSERVICE_SC_VERIFIER_TYPE: ${MICROSERVICE_SC_VERIFIER_TYPE}
      SECRET_KEY_BASE: ${SECRET_KEY_BASE}
      DISABLE_EXCHANGE_RATES: ${DISABLE_EXCHANGE_RATES}
      SHOW_PRICE_CHART: ${SHOW_PRICE_CHART}
      BLOCK_TRANSFORMER: ${BLOCK_TRANSFORMER}
      INDEXER_DISABLE_INTERNAL_TRANSACTIONS_FETCHER: ${INDEXER_DISABLE_INTERNAL_TRANSACTIONS_FETCHER}
      REDIS_URL: ${REDIS_URL}
      ECTO_USE_SSL: ${ECTO_USE_SSL}
      POOL_SIZE: ${POOL_SIZE}
      POOL_SIZE_API: ${POOL_SIZE_API}
    command: bash -c "bin/blockscout eval \"Elixir.Explorer.ReleaseTasks.create_and_migrate()\" && bin/blockscout start"
    ports:
      - "4000:4000"
    volumes:
      - ./logs:/app/logs
    extra_hosts:
      - "host.docker.internal:host-gateway"
    networks:
      - blockscout-network

  # ============ BLOCKSCOUT FRONTEND (NEW UI) ============
  frontend:
    image: ghcr.io/blockscout/frontend:latest
    container_name: blockscout-frontend
    restart: unless-stopped
    depends_on:
      - blockscout
    environment:
      NEXT_PUBLIC_API_HOST: blockscout
      NEXT_PUBLIC_API_PORT: 4000
      NEXT_PUBLIC_API_PROTOCOL: http
      NEXT_PUBLIC_STATS_API_HOST: http://blockscout:4000
      NEXT_PUBLIC_NETWORK_NAME: ${NEXT_PUBLIC_NETWORK_NAME:-Viddhana Chain}
      NEXT_PUBLIC_NETWORK_SHORT_NAME: ${NEXT_PUBLIC_NETWORK_SHORT_NAME:-Viddhana}
      NEXT_PUBLIC_NETWORK_ID: ${NEXT_PUBLIC_NETWORK_ID:-1337}
      NEXT_PUBLIC_NETWORK_CURRENCY_NAME: ${NEXT_PUBLIC_NETWORK_CURRENCY_NAME:-BTC Diamond}
      NEXT_PUBLIC_NETWORK_CURRENCY_SYMBOL: ${NEXT_PUBLIC_NETWORK_CURRENCY_SYMBOL:-BTCD}
      NEXT_PUBLIC_NETWORK_CURRENCY_DECIMALS: 18
      NEXT_PUBLIC_NETWORK_RPC_URL: ${NEXT_PUBLIC_NETWORK_RPC_URL:-http://localhost:8545}
      NEXT_PUBLIC_IS_TESTNET: 'true'
      NEXT_PUBLIC_HOMEPAGE_CHARTS: '["daily_txs"]'
      NEXT_PUBLIC_HAS_BEACON_CHAIN: 'false'
      NEXT_PUBLIC_NETWORK_VERIFICATION_TYPE: validation
      NEXT_PUBLIC_VISUALIZE_API_HOST: ''
      NEXT_PUBLIC_CONTRACT_INFO_API_HOST: ''
    ports:
      - "3000:3000"
    networks:
      - blockscout-network

networks:
  blockscout-network:
    driver: bridge
    external: false
```

---

## Step 4: Network Integration

### 4.1 If Geth is Running via Docker

Update the `blockscout-network` to connect with Geth:

```yaml
# Add to docker-compose.yml under networks section
networks:
  blockscout-network:
    driver: bridge
  viddhana-network:
    external: true
    name: viddhana-chain_viddhana-network
```

Update each service to include both networks:
```yaml
services:
  blockscout:
    # ... other config
    networks:
      - blockscout-network
      - viddhana-network
```

### 4.2 If Geth is Running Locally

Update `.env` with host machine IP:
```env
ETHEREUM_JSONRPC_HTTP_URL=http://host.docker.internal:8545
ETHEREUM_JSONRPC_WS_URL=ws://host.docker.internal:8546
ETHEREUM_JSONRPC_TRACE_URL=http://host.docker.internal:8545
```

---

## Step 5: Generate Secret Key

```bash
# Generate a secure secret key
openssl rand -hex 32

# Output example: a1b2c3d4e5f6...
# Copy this to SECRET_KEY_BASE in .env
```

---

## Step 6: Deploy Blockscout

### 6.1 Start Services

```bash
cd ~/viddhana-chain/blockscout

# Pull latest images
docker-compose pull

# Start in background
docker-compose up -d

# View logs
docker-compose logs -f

# View specific service logs
docker-compose logs -f blockscout
docker-compose logs -f frontend
```

### 6.2 Check Service Status

```bash
# Check all containers
docker-compose ps

# Expected output:
# NAME                      STATUS
# blockscout-postgres       running (healthy)
# blockscout-redis          running (healthy)
# blockscout-verifier       running
# blockscout-backend        running
# blockscout-frontend       running
```

### 6.3 Verify Endpoints

```bash
# Check backend API
curl http://localhost:4000/api/v2/stats

# Check frontend
curl http://localhost:3000

# Check contract verifier
curl http://localhost:8050/api/v1/status
```

---

## Step 7: Verify Real-Time Updates

### 7.1 WebSocket Connection Test

```bash
# Install wscat if needed
npm install -g wscat

# Connect to Blockscout WebSocket
wscat -c ws://localhost:4000/socket/websocket

# Send subscription message
{"topic":"blocks:new_block","event":"phx_join","payload":{},"ref":"1"}
```

### 7.2 Verify Block Indexing

```bash
# Check latest indexed block via API
curl http://localhost:4000/api/v2/blocks | jq '.items[0].height'

# Compare with Geth block number
curl -X POST -H "Content-Type: application/json" \
  --data '{"jsonrpc":"2.0","method":"eth_blockNumber","params":[],"id":1}' \
  http://localhost:8545
```

---

## Step 8: Contract Verification

### 8.1 Verify via Web UI

1. Navigate to `http://localhost:3000`
2. Search for contract address
3. Go to "Contract" tab
4. Click "Verify & Publish"
5. Fill in:
   - Contract Name: `ViddhanaKYC`
   - Compiler Version: `v0.8.19+commit.7dd6d404`
   - Optimization: Yes (200 runs)
   - Source Code: (paste flattened source)

### 8.2 Verify via API

```bash
# Flatten contract first
cd ~/viddhana-chain/contracts
npx hardhat flatten contracts/ViddhanaKYC.sol > ViddhanaKYC_flat.sol

# Submit for verification
curl -X POST http://localhost:4000/api/v2/smart-contracts/verification/via/flattened-code \
  -H "Content-Type: application/json" \
  -d '{
    "address_hash": "0x...",
    "name": "ViddhanaKYC",
    "compiler_version": "v0.8.19+commit.7dd6d404",
    "optimization": true,
    "optimization_runs": 200,
    "source_code": "..."
  }'
```

---

## Step 9: Configuration Reference

### Essential Environment Variables

| Variable | Description | Default |
|----------|-------------|---------|
| `ETHEREUM_JSONRPC_HTTP_URL` | Geth RPC endpoint | Required |
| `ETHEREUM_JSONRPC_WS_URL` | Geth WebSocket endpoint | Required |
| `CHAIN_ID` | Network chain ID | 1337 |
| `NETWORK` | Network name | Viddhana |
| `COIN` | Native coin symbol | BTCD |
| `COIN_NAME` | Native coin name | BTC Diamond |
| `BLOCK_TRANSFORMER` | Block type (clique for PoA) | clique |

### Feature Toggles

| Variable | Description | Recommended |
|----------|-------------|-------------|
| `DISABLE_EXCHANGE_RATES` | Disable price fetching | true |
| `SHOW_PRICE_CHART` | Show price chart | false |
| `SHOW_TXS_CHART` | Show transaction chart | true |
| `API_V2_ENABLED` | Enable API v2 | true |
| `MICROSERVICE_SC_VERIFIER_ENABLED` | Enable contract verification | true |

---

## Step 10: Monitoring & Maintenance

### 10.1 Health Check Script

Create `~/viddhana-chain/blockscout/health_check.sh`:

```bash
#!/bin/bash

echo "=== Blockscout Health Check ==="
echo ""

# Check containers
echo "Container Status:"
docker-compose ps --format "table {{.Name}}\t{{.Status}}"
echo ""

# Check backend API
echo "Backend API:"
BACKEND_STATUS=$(curl -s -o /dev/null -w "%{http_code}" http://localhost:4000/api/v2/stats)
if [ "$BACKEND_STATUS" == "200" ]; then
  echo "  Status: OK ($BACKEND_STATUS)"
else
  echo "  Status: ERROR ($BACKEND_STATUS)"
fi

# Check frontend
echo "Frontend:"
FRONTEND_STATUS=$(curl -s -o /dev/null -w "%{http_code}" http://localhost:3000)
if [ "$FRONTEND_STATUS" == "200" ]; then
  echo "  Status: OK ($FRONTEND_STATUS)"
else
  echo "  Status: ERROR ($FRONTEND_STATUS)"
fi

# Check indexing lag
echo ""
echo "Indexing Status:"
INDEXED_BLOCK=$(curl -s http://localhost:4000/api/v2/blocks | jq -r '.items[0].height')
GETH_BLOCK=$(curl -s -X POST -H "Content-Type: application/json" \
  --data '{"jsonrpc":"2.0","method":"eth_blockNumber","params":[],"id":1}' \
  http://localhost:8545 | jq -r '.result' | xargs printf "%d")
LAG=$((GETH_BLOCK - INDEXED_BLOCK))

echo "  Geth Block: $GETH_BLOCK"
echo "  Indexed Block: $INDEXED_BLOCK"
echo "  Lag: $LAG blocks"

if [ "$LAG" -gt 10 ]; then
  echo "  WARNING: Indexer is behind!"
fi
```

### 10.2 Log Rotation

Create `~/viddhana-chain/blockscout/logrotate.conf`:

```
/home/user/viddhana-chain/blockscout/logs/*.log {
    daily
    rotate 7
    compress
    delaycompress
    missingok
    notifempty
    copytruncate
}
```

### 10.3 Backup Database

```bash
#!/bin/bash
# backup_db.sh

BACKUP_DIR=~/viddhana-chain/backups
DATE=$(date +%Y%m%d_%H%M%S)

mkdir -p $BACKUP_DIR

docker exec blockscout-postgres pg_dump -U blockscout blockscout | gzip > $BACKUP_DIR/blockscout_$DATE.sql.gz

echo "Backup created: $BACKUP_DIR/blockscout_$DATE.sql.gz"

# Keep only last 7 days
find $BACKUP_DIR -name "blockscout_*.sql.gz" -mtime +7 -delete
```

---

## Step 11: Common Operations

### Restart Services

```bash
# Restart all
docker-compose restart

# Restart specific service
docker-compose restart blockscout

# Restart with fresh database (WARNING: loses all indexed data)
docker-compose down -v
docker-compose up -d
```

### Update Blockscout

```bash
# Pull latest images
docker-compose pull

# Recreate containers
docker-compose up -d --force-recreate
```

### View Container Resources

```bash
docker stats blockscout-backend blockscout-frontend blockscout-postgres
```

---

## Troubleshooting

### Issue: Indexer Not Starting

```bash
# Check logs
docker-compose logs blockscout | grep -i error

# Common fix: Database migration
docker-compose exec blockscout bin/blockscout eval "Elixir.Explorer.ReleaseTasks.create_and_migrate()"
```

### Issue: WebSocket Connection Failed

```bash
# Verify Geth WS is accessible
wscat -c ws://localhost:8546

# Check Blockscout config
docker-compose exec blockscout printenv | grep WS
```

### Issue: Contract Verification Failed

```bash
# Check verifier service
docker-compose logs smart-contract-verifier

# Verify compiler version matches exactly
# Use exact version string from https://solc-bin.ethereum.org/bin/list.json
```

### Issue: High Memory Usage

```bash
# Reduce pool size in .env
POOL_SIZE=30
POOL_SIZE_API=5

# Restart
docker-compose restart blockscout
```

---

## Checklist

- [ ] Docker and Docker Compose installed
- [ ] Directory structure created
- [ ] `.env` file configured
- [ ] Secret key generated
- [ ] `docker-compose.yml` created
- [ ] Network integration verified (Geth accessible)
- [ ] Services started
- [ ] All containers healthy
- [ ] Backend API responding
- [ ] Frontend accessible
- [ ] Real-time updates working
- [ ] Contract verification working
- [ ] Health check script created
- [ ] Backup script configured

---

## Next Steps

1. Customize the UI theme in `05_FRONTEND_CUSTOMIZATION.md`
2. Add custom branding and logos
3. Configure monitoring and alerts
