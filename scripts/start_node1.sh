#!/bin/bash

# Viddhana Blockscan - Node 1 Startup Script
# Primary sealer node with full RPC/WS enabled

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_DIR="$(dirname "$SCRIPT_DIR")"
NODE_DIR="$PROJECT_DIR/node1"
DATA_DIR="$NODE_DIR/data"
CONFIG_DIR="$PROJECT_DIR/config"

# Check if data directory exists
if [ ! -d "$DATA_DIR/geth" ]; then
    echo "Error: Node 1 not initialized. Run setup.sh first."
    exit 1
fi

# Get the first account as the signer
SIGNER=$(geth --datadir "$DATA_DIR" account list 2>/dev/null | head -1 | grep -oP '(?<={)[^}]+')

if [ -z "$SIGNER" ]; then
    echo "Error: No account found. Run setup.sh first."
    exit 1
fi

echo "Starting Node 1 (Primary Sealer)..."
echo "Signer address: 0x$SIGNER"
echo "Data directory: $DATA_DIR"
echo "HTTP RPC: http://localhost:8545"
echo "WebSocket: ws://localhost:8546"

geth \
    --datadir "$DATA_DIR" \
    --networkid 1337 \
    --port 30303 \
    --http \
    --http.addr "127.0.0.1" \
    --http.port 8545 \
    --http.corsdomain "https://viddhana.com" \
    --http.vhosts "localhost,viddhana.com" \
    --http.api "eth,net,web3,miner,clique,txpool" \
    --ws \
    --ws.addr "127.0.0.1" \
    --ws.port 8546 \
    --ws.origins "https://viddhana.com" \
    --ws.api "eth,net,web3,miner,clique,txpool" \
    --mine \
    --miner.etherbase "0x$SIGNER" \
    --unlock "0x$SIGNER" \
    --password "$CONFIG_DIR/password.txt" \
    --syncmode "full" \
    --gcmode "archive" \
    --nodiscover \
    --verbosity 3 \
    --authrpc.port 8551 \
    --authrpc.addr "localhost" \
    --authrpc.vhosts "localhost" \
    2>&1 | tee "$NODE_DIR/node1.log" &

NODE_PID=$!
echo "Node 1 started with PID: $NODE_PID"

# Health check - wait for RPC to be available
echo "Waiting for node to be ready..."
for i in {1..30}; do
    if curl -s -X POST -H "Content-Type: application/json" \
        --data '{"jsonrpc":"2.0","method":"eth_blockNumber","params":[],"id":1}' \
        http://127.0.0.1:8545 > /dev/null 2>&1; then
        echo "Node 1 is ready and accepting connections!"
        exit 0
    fi
    sleep 1
done
echo "Warning: Node may not be fully ready. Check logs at $NODE_DIR/node1.log"
