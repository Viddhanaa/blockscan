#!/bin/bash

# Viddhana Blockscan - Node 2 Startup Script
# Secondary node that connects to Node 1 as bootnode

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_DIR="$(dirname "$SCRIPT_DIR")"
NODE_DIR="$PROJECT_DIR/node2"
DATA_DIR="$NODE_DIR/data"
CONFIG_DIR="$PROJECT_DIR/config"
NODE1_ENODE_FILE="$PROJECT_DIR/node1/enode.txt"

# Check if data directory exists
if [ ! -d "$DATA_DIR/geth" ]; then
    echo "Error: Node 2 not initialized. Run setup.sh first."
    exit 1
fi

# Get the account as the signer
SIGNER=$(geth --datadir "$DATA_DIR" account list 2>/dev/null | head -1 | grep -oP '(?<={)[^}]+')

if [ -z "$SIGNER" ]; then
    echo "Error: No account found. Run setup.sh first."
    exit 1
fi

# Get Node 1's enode URL for bootnode connection
BOOTNODE=""
if [ -f "$NODE1_ENODE_FILE" ]; then
    BOOTNODE=$(cat "$NODE1_ENODE_FILE")
    echo "Using bootnode: $BOOTNODE"
else
    echo "Warning: Node 1 enode file not found. You may need to add peer manually."
    echo "To get Node 1's enode, run in Node 1's geth console: admin.nodeInfo.enode"
fi

echo "Starting Node 2 (Secondary Sealer)..."
echo "Signer address: 0x$SIGNER"
echo "Data directory: $DATA_DIR"
echo "P2P Port: 30304"

# Build bootnode argument if available
BOOTNODE_ARG=""
if [ -n "$BOOTNODE" ]; then
    BOOTNODE_ARG="--bootnodes $BOOTNODE"
fi

geth \
    --datadir "$DATA_DIR" \
    --networkid 1337 \
    --port 30304 \
    --http \
    --http.addr "127.0.0.1" \
    --http.port 8555 \
    --http.corsdomain "https://viddhana.com" \
    --http.vhosts "localhost,viddhana.com" \
    --http.api "eth,net,web3,miner,clique,txpool" \
    --mine \
    --miner.etherbase "0x$SIGNER" \
    --unlock "0x$SIGNER" \
    --password "$CONFIG_DIR/password.txt" \
    --syncmode "full" \
    --gcmode "archive" \
    --verbosity 3 \
    --authrpc.port 8552 \
    --authrpc.addr "localhost" \
    --authrpc.vhosts "localhost" \
    $BOOTNODE_ARG \
    2>&1 | tee "$NODE_DIR/node2.log" &

NODE_PID=$!
echo "Node 2 started with PID: $NODE_PID"

# Health check - wait for RPC to be available
echo "Waiting for node to be ready..."
for i in {1..30}; do
    if curl -s -X POST -H "Content-Type: application/json" \
        --data '{"jsonrpc":"2.0","method":"eth_blockNumber","params":[],"id":1}' \
        http://127.0.0.1:8555 > /dev/null 2>&1; then
        echo "Node 2 is ready and accepting connections!"
        exit 0
    fi
    sleep 1
done
echo "Warning: Node may not be fully ready. Check logs at $NODE_DIR/node2.log"
