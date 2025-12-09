# Phase 1: Geth Blockchain Setup

## Overview
This document provides step-by-step instructions for setting up a 2-node private Ethereum network using Go-Ethereum (Geth) with Clique Proof of Authority consensus.

---

## Prerequisites

### System Requirements
```
- OS: Ubuntu 20.04+ (or compatible Linux)
- RAM: 4GB minimum per node
- Storage: 50GB+ SSD
- Network: Open ports 30303, 8545, 8546
```

### Software Installation

#### Option A: Install Geth via PPA (Recommended)
```bash
# Add Ethereum PPA
sudo add-apt-repository -y ppa:ethereum/ethereum
sudo apt-get update

# Install Geth
sudo apt-get install -y ethereum

# Verify installation
geth version
```

#### Option B: Build from Source
```bash
# Install Go 1.19+
wget https://go.dev/dl/go1.21.0.linux-amd64.tar.gz
sudo tar -C /usr/local -xzf go1.21.0.linux-amd64.tar.gz
export PATH=$PATH:/usr/local/go/bin

# Clone and build Geth
git clone https://github.com/ethereum/go-ethereum.git
cd go-ethereum
make geth

# Add to PATH
sudo cp build/bin/geth /usr/local/bin/
```

#### Option C: Docker (Recommended for Production)
```bash
# Pull official Geth image
docker pull ethereum/client-go:latest
```

---

## Step 1: Create Project Directory Structure

```bash
# Create main project directory
mkdir -p ~/viddhana-chain
cd ~/viddhana-chain

# Create node directories
mkdir -p node1/data
mkdir -p node2/data

# Create shared config directory
mkdir -p config
```

**Expected Structure:**
```
viddhana-chain/
├── config/
│   ├── genesis.json
│   └── password.txt
├── node1/
│   └── data/
└── node2/
    └── data/
```

---

## Step 2: Create Sealer Accounts

### 2.1 Create Account for Node 1
```bash
# Create account for Node 1 (Primary Sealer)
geth --datadir ~/viddhana-chain/node1/data account new

# OUTPUT EXAMPLE:
# Your new key was generated
# Public address: 0xABCD1234...
# Path: ~/viddhana-chain/node1/data/keystore/UTC--...
```

**IMPORTANT: Save this address! It will be SIGNER_ADDRESS_1**

### 2.2 Create Account for Node 2
```bash
# Create account for Node 2 (Secondary Sealer)
geth --datadir ~/viddhana-chain/node2/data account new

# OUTPUT EXAMPLE:
# Public address: 0xEFGH5678...
```

**IMPORTANT: Save this address! It will be SIGNER_ADDRESS_2**

### 2.3 Create Password File
```bash
# Create password file (same password for both nodes for simplicity)
echo "your_secure_password_here" > ~/viddhana-chain/config/password.txt
chmod 600 ~/viddhana-chain/config/password.txt
```

---

## Step 3: Generate Genesis Configuration

### 3.1 Understanding the Genesis File

The genesis file defines:
- **chainId**: Unique network identifier (1337)
- **clique config**: PoA settings (block period, epoch)
- **alloc**: Pre-funded addresses
- **extraData**: Initial signer addresses (critical for PoA)

### 3.2 Create Genesis File

Create `~/viddhana-chain/config/genesis.json`:

```json
{
  "config": {
    "chainId": 1337,
    "homesteadBlock": 0,
    "eip150Block": 0,
    "eip155Block": 0,
    "eip158Block": 0,
    "byzantiumBlock": 0,
    "constantinopleBlock": 0,
    "petersburgBlock": 0,
    "istanbulBlock": 0,
    "berlinBlock": 0,
    "londonBlock": 0,
    "clique": {
      "period": 5,
      "epoch": 30000
    }
  },
  "difficulty": "1",
  "gasLimit": "30000000",
  "extradata": "0x0000000000000000000000000000000000000000000000000000000000000000<SIGNER_ADDRESS_1_WITHOUT_0x><SIGNER_ADDRESS_2_WITHOUT_0x>0000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000",
  "alloc": {
    "<SIGNER_ADDRESS_1>": {
      "balance": "1000000000000000000000000"
    },
    "<SIGNER_ADDRESS_2>": {
      "balance": "100000000000000000000000"
    }
  }
}
```

### 3.3 Generate extraData Field

The extraData format for Clique is:
- 32 bytes of zeros (vanity)
- Signer addresses (20 bytes each, no 0x prefix)
- 65 bytes of zeros (seal)

**Script to generate extraData:**
```bash
#!/bin/bash
# generate_extradata.sh

SIGNER1="ABCD1234..."  # Replace with actual address (no 0x)
SIGNER2="EFGH5678..."  # Replace with actual address (no 0x)

VANITY="0000000000000000000000000000000000000000000000000000000000000000"
SEAL="0000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000"

echo "0x${VANITY}${SIGNER1}${SIGNER2}${SEAL}"
```

### 3.4 Example Complete Genesis File

```json
{
  "config": {
    "chainId": 1337,
    "homesteadBlock": 0,
    "eip150Block": 0,
    "eip155Block": 0,
    "eip158Block": 0,
    "byzantiumBlock": 0,
    "constantinopleBlock": 0,
    "petersburgBlock": 0,
    "istanbulBlock": 0,
    "berlinBlock": 0,
    "londonBlock": 0,
    "clique": {
      "period": 5,
      "epoch": 30000
    }
  },
  "difficulty": "1",
  "gasLimit": "30000000",
  "extradata": "0x0000000000000000000000000000000000000000000000000000000000000000abc123def456...789xyz...0000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000",
  "alloc": {
    "0xABC123...": {
      "balance": "1000000000000000000000000"
    },
    "0xDEF456...": {
      "balance": "100000000000000000000000"
    }
  }
}
```

---

## Step 4: Initialize Nodes

### 4.1 Initialize Node 1
```bash
geth --datadir ~/viddhana-chain/node1/data init ~/viddhana-chain/config/genesis.json

# Expected output:
# Successfully wrote genesis state
```

### 4.2 Initialize Node 2
```bash
geth --datadir ~/viddhana-chain/node2/data init ~/viddhana-chain/config/genesis.json

# Expected output:
# Successfully wrote genesis state
```

---

## Step 5: Start Node 1 (Primary Sealer/RPC)

### 5.1 Create Startup Script

Create `~/viddhana-chain/start_node1.sh`:

```bash
#!/bin/bash

DATADIR=~/viddhana-chain/node1/data
SIGNER_ADDRESS="0xYOUR_SIGNER_ADDRESS_1"
PASSWORD_FILE=~/viddhana-chain/config/password.txt

geth \
  --datadir $DATADIR \
  --networkid 1337 \
  --port 30303 \
  --http \
  --http.addr "0.0.0.0" \
  --http.port 8545 \
  --http.corsdomain "*" \
  --http.api "eth,net,web3,personal,miner,clique,txpool,debug,admin" \
  --http.vhosts "*" \
  --ws \
  --ws.addr "0.0.0.0" \
  --ws.port 8546 \
  --ws.origins "*" \
  --ws.api "eth,net,web3,personal,miner,clique,txpool,debug" \
  --syncmode "full" \
  --gcmode "archive" \
  --allow-insecure-unlock \
  --mine \
  --miner.etherbase $SIGNER_ADDRESS \
  --unlock $SIGNER_ADDRESS \
  --password $PASSWORD_FILE \
  --nodiscover \
  --verbosity 3 \
  2>&1 | tee ~/viddhana-chain/node1/geth.log
```

### 5.2 Make Executable and Run
```bash
chmod +x ~/viddhana-chain/start_node1.sh
~/viddhana-chain/start_node1.sh
```

### 5.3 Get Node 1 Enode URL
```bash
# In a new terminal, attach to Node 1
geth attach ~/viddhana-chain/node1/data/geth.ipc

# Get enode URL
> admin.nodeInfo.enode

# OUTPUT EXAMPLE:
# "enode://abc123...@127.0.0.1:30303"
```

**IMPORTANT: Save this enode URL for Node 2 connection!**

---

## Step 6: Start Node 2 (Peer/Sealer)

### 6.1 Create Startup Script

Create `~/viddhana-chain/start_node2.sh`:

```bash
#!/bin/bash

DATADIR=~/viddhana-chain/node2/data
SIGNER_ADDRESS="0xYOUR_SIGNER_ADDRESS_2"
PASSWORD_FILE=~/viddhana-chain/config/password.txt
BOOTNODE="enode://abc123...@NODE1_IP:30303"  # Replace with actual enode

geth \
  --datadir $DATADIR \
  --networkid 1337 \
  --port 30304 \
  --authrpc.port 8552 \
  --syncmode "full" \
  --allow-insecure-unlock \
  --mine \
  --miner.etherbase $SIGNER_ADDRESS \
  --unlock $SIGNER_ADDRESS \
  --password $PASSWORD_FILE \
  --bootnodes $BOOTNODE \
  --verbosity 3 \
  2>&1 | tee ~/viddhana-chain/node2/geth.log
```

### 6.2 Make Executable and Run
```bash
chmod +x ~/viddhana-chain/start_node2.sh
~/viddhana-chain/start_node2.sh
```

---

## Step 7: Docker Compose Setup (Production)

### 7.1 Create Docker Compose File

Create `~/viddhana-chain/docker-compose.yml`:

```yaml
version: '3.8'

services:
  geth-node1:
    image: ethereum/client-go:latest
    container_name: viddhana-node1
    restart: unless-stopped
    ports:
      - "30303:30303/tcp"
      - "30303:30303/udp"
      - "8545:8545"
      - "8546:8546"
    volumes:
      - ./node1/data:/root/.ethereum
      - ./config/genesis.json:/genesis.json:ro
      - ./config/password.txt:/password.txt:ro
    command: >
      --datadir /root/.ethereum
      --networkid 1337
      --port 30303
      --http --http.addr "0.0.0.0" --http.port 8545
      --http.corsdomain "*" --http.vhosts "*"
      --http.api "eth,net,web3,personal,miner,clique,txpool,debug,admin"
      --ws --ws.addr "0.0.0.0" --ws.port 8546
      --ws.origins "*"
      --ws.api "eth,net,web3,personal,miner,clique,txpool,debug"
      --syncmode "full"
      --gcmode "archive"
      --allow-insecure-unlock
      --mine
      --miner.etherbase "0xSIGNER_ADDRESS_1"
      --unlock "0xSIGNER_ADDRESS_1"
      --password /password.txt
      --nodiscover
    networks:
      - viddhana-network

  geth-node2:
    image: ethereum/client-go:latest
    container_name: viddhana-node2
    restart: unless-stopped
    ports:
      - "30304:30304/tcp"
      - "30304:30304/udp"
    volumes:
      - ./node2/data:/root/.ethereum
      - ./config/genesis.json:/genesis.json:ro
      - ./config/password.txt:/password.txt:ro
    command: >
      --datadir /root/.ethereum
      --networkid 1337
      --port 30304
      --syncmode "full"
      --allow-insecure-unlock
      --mine
      --miner.etherbase "0xSIGNER_ADDRESS_2"
      --unlock "0xSIGNER_ADDRESS_2"
      --password /password.txt
      --bootnodes "enode://NODE1_ENODE@geth-node1:30303"
    networks:
      - viddhana-network
    depends_on:
      - geth-node1

networks:
  viddhana-network:
    driver: bridge
```

### 7.2 Initialize and Run
```bash
# Initialize nodes first (before docker-compose up)
docker run --rm -v $(pwd)/node1/data:/root/.ethereum \
  -v $(pwd)/config/genesis.json:/genesis.json \
  ethereum/client-go:latest init /genesis.json

docker run --rm -v $(pwd)/node2/data:/root/.ethereum \
  -v $(pwd)/config/genesis.json:/genesis.json \
  ethereum/client-go:latest init /genesis.json

# Start the network
docker-compose up -d

# View logs
docker-compose logs -f
```

---

## Step 8: Verification

### 8.1 Check Node Status
```bash
# Check if RPC is responding
curl -X POST -H "Content-Type: application/json" \
  --data '{"jsonrpc":"2.0","method":"eth_blockNumber","params":[],"id":1}' \
  http://localhost:8545

# Expected: {"jsonrpc":"2.0","id":1,"result":"0x..."}
```

### 8.2 Check Peer Connection
```bash
# Attach to Node 1
geth attach http://localhost:8545

# Check peers
> admin.peers
# Should show Node 2 as connected peer

# Check mining status
> eth.mining
# Should return: true

# Check block number
> eth.blockNumber
# Should be increasing
```

### 8.3 Test Transaction
```bash
# In geth console
> eth.sendTransaction({from: eth.accounts[0], to: eth.accounts[0], value: 0})

# Check transaction
> eth.getTransaction("<tx_hash>")
```

---

## Troubleshooting

### Issue: Nodes Not Mining
```bash
# Check if signer is authorized
> clique.getSigners()

# Verify account is unlocked
> personal.listWallets
```

### Issue: Nodes Not Connecting
```bash
# Manually add peer
> admin.addPeer("enode://...")

# Check network ID matches
> net.version
```

### Issue: Genesis Mismatch
```bash
# Clear data and reinitialize
rm -rf ~/viddhana-chain/node1/data/geth
rm -rf ~/viddhana-chain/node2/data/geth

# Re-run init
geth --datadir ~/viddhana-chain/node1/data init ~/viddhana-chain/config/genesis.json
```

---

## Configuration Reference

### Geth Command Flags

| Flag | Description | Value |
|------|-------------|-------|
| `--networkid` | Network identifier | 1337 |
| `--port` | P2P port | 30303/30304 |
| `--http.port` | RPC HTTP port | 8545 |
| `--ws.port` | WebSocket port | 8546 |
| `--gcmode` | Garbage collection | archive |
| `--syncmode` | Sync mode | full |

### Clique PoA Settings

| Parameter | Value | Description |
|-----------|-------|-------------|
| period | 5 | Block time in seconds |
| epoch | 30000 | Blocks between checkpoints |

---

## Next Steps

After completing this setup:
1. Proceed to `02_KYC_SMART_CONTRACT.md` to deploy the KYC registry
2. Configure Blockscout to connect to your RPC endpoint
3. Set up monitoring and backup procedures

---

## Checklist

- [ ] Geth installed and verified
- [ ] Node directories created
- [ ] Sealer accounts created (save addresses!)
- [ ] Password file created
- [ ] Genesis file configured with correct extraData
- [ ] Node 1 initialized and running
- [ ] Node 2 initialized and connected
- [ ] RPC/WebSocket endpoints accessible
- [ ] Blocks being produced
- [ ] Test transaction successful
