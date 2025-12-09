#!/bin/bash

# Viddhana Blockscan - Generate extraData for Clique PoA Genesis
# 
# Clique extraData format:
# - 32 bytes vanity (zeros)
# - 20 bytes per signer address (concatenated)
# - 65 bytes signature (zeros for genesis)
#
# Usage: ./generate_extradata.sh <signer1_address> [signer2_address] ...
# Addresses should be without 0x prefix

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_DIR="$(dirname "$SCRIPT_DIR")"
CONFIG_DIR="$PROJECT_DIR/config"

# Check if addresses are provided
if [ $# -eq 0 ]; then
    echo "Usage: $0 <signer1_address> [signer2_address] ..."
    echo "Example: $0 abc123...def 789ghi...xyz"
    echo ""
    echo "Auto-detecting from node data directories..."
    
    # Try to auto-detect signer addresses from node data
    SIGNER1=""
    SIGNER2=""
    
    if [ -d "$PROJECT_DIR/node1/data/keystore" ]; then
        SIGNER1=$(geth --datadir "$PROJECT_DIR/node1/data" account list 2>/dev/null | head -1 | grep -oP '(?<={)[^}]+')
    fi
    
    if [ -d "$PROJECT_DIR/node2/data/keystore" ]; then
        SIGNER2=$(geth --datadir "$PROJECT_DIR/node2/data" account list 2>/dev/null | head -1 | grep -oP '(?<={)[^}]+')
    fi
    
    if [ -z "$SIGNER1" ] && [ -z "$SIGNER2" ]; then
        echo "Error: No accounts found. Please provide addresses or run setup.sh first."
        exit 1
    fi
    
    SIGNERS=()
    [ -n "$SIGNER1" ] && SIGNERS+=("$SIGNER1")
    [ -n "$SIGNER2" ] && SIGNERS+=("$SIGNER2")
    
    echo "Found signers: ${SIGNERS[*]}"
else
    SIGNERS=("$@")
fi

# Generate extraData
# 32 bytes vanity (64 hex chars)
VANITY="0000000000000000000000000000000000000000000000000000000000000000"

# Concatenate signer addresses (each 20 bytes = 40 hex chars)
SIGNERS_HEX=""
for addr in "${SIGNERS[@]}"; do
    # Remove 0x prefix if present
    clean_addr="${addr#0x}"
    # Ensure lowercase
    clean_addr=$(echo "$clean_addr" | tr '[:upper:]' '[:lower:]')
    # Validate length (should be 40 chars)
    if [ ${#clean_addr} -ne 40 ]; then
        echo "Error: Invalid address length for $addr (expected 40 hex chars, got ${#clean_addr})"
        exit 1
    fi
    # Validate hex format
    if ! [[ "$clean_addr" =~ ^[0-9a-f]{40}$ ]]; then
        echo "Error: Invalid hex address format for $addr"
        exit 1
    fi
    SIGNERS_HEX="${SIGNERS_HEX}${clean_addr}"
done

# 65 bytes seal (130 hex chars) - zeros for genesis
SEAL="0000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000"

# Combine all parts
EXTRADATA="0x${VANITY}${SIGNERS_HEX}${SEAL}"

echo ""
echo "Generated extraData:"
echo "$EXTRADATA"
echo ""
echo "Copy this value to your genesis.json 'extradata' field."

# Optionally save to file
EXTRADATA_FILE="$CONFIG_DIR/extradata.txt"
echo "$EXTRADATA" > "$EXTRADATA_FILE"
echo "Saved to: $EXTRADATA_FILE"

# Also output the alloc section for genesis.json
echo ""
echo "Alloc section for genesis.json:"
echo "{"
for i in "${!SIGNERS[@]}"; do
    addr="${SIGNERS[$i]}"
    clean_addr="${addr#0x}"
    clean_addr=$(echo "$clean_addr" | tr '[:upper:]' '[:lower:]')
    if [ $i -lt $((${#SIGNERS[@]} - 1)) ]; then
        echo "  \"0x${clean_addr}\": { \"balance\": \"1000000000000000000000000\" },"
    else
        echo "  \"0x${clean_addr}\": { \"balance\": \"1000000000000000000000000\" }"
    fi
done
echo "}"
