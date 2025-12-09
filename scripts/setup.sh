#!/bin/bash

# Viddhana Blockscan - One-Click Setup Script
# Creates accounts and initializes both nodes for Clique PoA network

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_DIR="$(dirname "$SCRIPT_DIR")"
CONFIG_DIR="$PROJECT_DIR/config"
NODE1_DATA="$PROJECT_DIR/node1/data"
NODE2_DATA="$PROJECT_DIR/node2/data"
GENESIS_FILE="$CONFIG_DIR/genesis.json"
PASSWORD_FILE="$CONFIG_DIR/password.txt"

echo "=========================================="
echo "  Viddhana Blockscan - Network Setup"
echo "=========================================="
echo ""

# Check if geth is installed
if ! command -v geth &> /dev/null; then
    echo "Error: geth is not installed or not in PATH"
    echo "Please install go-ethereum first:"
    echo "  Ubuntu: sudo add-apt-repository -y ppa:ethereum/ethereum && sudo apt-get update && sudo apt-get install ethereum"
    echo "  macOS: brew tap ethereum/ethereum && brew install ethereum"
    exit 1
fi

GETH_VERSION=$(geth version | head -1)
echo "Using: $GETH_VERSION"
echo ""

# Create directories if they don't exist
mkdir -p "$NODE1_DATA"
mkdir -p "$NODE2_DATA"
mkdir -p "$CONFIG_DIR"

# Check if password file exists
if [ ! -f "$PASSWORD_FILE" ]; then
    echo "Creating password file..."
    if [ -z "${VIDDHANA_PASSWORD:-}" ]; then
        read -s -p "Enter node password: " VIDDHANA_PASSWORD
        echo
    fi
    echo "$VIDDHANA_PASSWORD" > "$PASSWORD_FILE"
    chmod 600 "$PASSWORD_FILE"
fi

# Clean up existing data (optional - comment out to preserve)
if [ -d "$NODE1_DATA/geth" ] || [ -d "$NODE1_DATA/keystore" ] || [ -d "$NODE2_DATA/geth" ] || [ -d "$NODE2_DATA/keystore" ]; then
    echo "WARNING: This will delete existing node data!"
    echo "  - $NODE1_DATA/geth"
    echo "  - $NODE1_DATA/keystore"
    echo "  - $NODE2_DATA/geth"
    echo "  - $NODE2_DATA/keystore"
    read -p "Are you sure you want to continue? (y/N): " confirm
    if [ "${confirm,,}" != "y" ]; then
        echo "Aborted."
        exit 1
    fi
    echo "Cleaning up existing node data..."
    rm -rf "$NODE1_DATA/geth" "$NODE1_DATA/keystore"
    rm -rf "$NODE2_DATA/geth" "$NODE2_DATA/keystore"
fi

# Create accounts for both nodes
echo ""
echo "Creating account for Node 1..."
ACCOUNT1=$(geth --datadir "$NODE1_DATA" account new --password "$PASSWORD_FILE" 2>&1 | grep -oP '(?<=Public address of the key:   )0x[a-fA-F0-9]+')
echo "Node 1 account: $ACCOUNT1"

echo ""
echo "Creating account for Node 2..."
ACCOUNT2=$(geth --datadir "$NODE2_DATA" account new --password "$PASSWORD_FILE" 2>&1 | grep -oP '(?<=Public address of the key:   )0x[a-fA-F0-9]+')
echo "Node 2 account: $ACCOUNT2"

# Store accounts for reference with restrictive permissions
echo "$ACCOUNT1" > "$PROJECT_DIR/node1/account.txt"
chmod 600 "$PROJECT_DIR/node1/account.txt"
echo "$ACCOUNT2" > "$PROJECT_DIR/node2/account.txt"
chmod 600 "$PROJECT_DIR/node2/account.txt"

# Generate proper extraData for Clique
echo ""
echo "Generating Clique extraData..."

# Remove 0x prefix for extraData
ADDR1="${ACCOUNT1#0x}"
ADDR2="${ACCOUNT2#0x}"

# Convert to lowercase
ADDR1=$(echo "$ADDR1" | tr '[:upper:]' '[:lower:]')
ADDR2=$(echo "$ADDR2" | tr '[:upper:]' '[:lower:]')

# Clique extraData format:
# - 32 bytes vanity (64 hex chars of zeros)
# - N * 20 bytes signer addresses (N * 40 hex chars)
# - 65 bytes seal (130 hex chars of zeros for genesis)
VANITY="0000000000000000000000000000000000000000000000000000000000000000"
SEAL="0000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000"
EXTRADATA="0x${VANITY}${ADDR1}${ADDR2}${SEAL}"

echo "extraData: $EXTRADATA"

# Update genesis.json with real signer addresses
echo ""
echo "Updating genesis.json..."

cat > "$GENESIS_FILE" << EOF
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
  "extradata": "$EXTRADATA",
  "alloc": {
    "$ACCOUNT1": {
      "balance": "1000000000000000000000000"
    },
    "$ACCOUNT2": {
      "balance": "1000000000000000000000000"
    }
  }
}
EOF

echo "Genesis file updated: $GENESIS_FILE"

# Initialize both nodes with genesis
echo ""
echo "Initializing Node 1..."
geth --datadir "$NODE1_DATA" init "$GENESIS_FILE"

echo ""
echo "Initializing Node 2..."
geth --datadir "$NODE2_DATA" init "$GENESIS_FILE"

echo ""
echo "=========================================="
echo "  Setup Complete!"
echo "=========================================="
echo ""
echo "Node 1:"
echo "  Account: $ACCOUNT1"
echo "  Data Dir: $NODE1_DATA"
echo "  HTTP RPC: http://localhost:8545"
echo "  WS RPC: ws://localhost:8546"
echo "  P2P Port: 30303"
echo ""
echo "Node 2:"
echo "  Account: $ACCOUNT2"
echo "  Data Dir: $NODE2_DATA"
echo "  HTTP RPC: http://localhost:8555"
echo "  P2P Port: 30304"
echo ""
echo "Next steps:"
echo "  1. Start Node 1: ./scripts/start_node1.sh"
echo "  2. Get Node 1's enode URL from logs or console"
echo "  3. Save enode to node1/enode.txt"
echo "  4. Start Node 2: ./scripts/start_node2.sh"
echo ""
echo "To get enode URL, attach to Node 1 and run:"
echo "  geth attach $NODE1_DATA/geth.ipc"
echo "  > admin.nodeInfo.enode"
echo ""
