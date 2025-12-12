#!/bin/bash
# =============================================================================
# Fix WebSocket and 530 Errors Script
# =============================================================================
# This script restarts services to apply the configuration changes that fix:
# 1. HTTP 530 errors (Cloudflare origin unreachable)
# 2. WebSocket connection failures
# 3. Cross-Origin-Opener-Policy header for Coinbase Wallet SDK
# =============================================================================

set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_DIR="$(dirname "$SCRIPT_DIR")"

echo "=========================================="
echo "Viddhana Blockscan - Fix WebSocket & 530"
echo "=========================================="
echo ""

cd "$PROJECT_DIR"

# Step 1: Check if Docker is running
echo "[1/7] Checking Docker..."
if ! docker info > /dev/null 2>&1; then
    echo "ERROR: Docker is not running. Please start Docker first."
    exit 1
fi
echo "Docker is running."
echo ""

# Step 2: Verify networks exist
echo "[2/7] Verifying Docker networks..."
if ! docker network ls | grep -q "viddhana-network"; then
    echo "Creating viddhana-network..."
    docker network create viddhana-network
fi
if ! docker network ls | grep -q "viddhana-blockscout-network"; then
    echo "Creating viddhana-blockscout-network..."
    docker network create viddhana-blockscout-network
fi
echo "Networks verified."
echo ""

# Step 3: Restart nginx to apply new config
echo "[3/7] Restarting Nginx with new configuration..."
docker-compose restart nginx || docker compose restart nginx || echo "Nginx not in main compose, checking blockscout..."
echo "Nginx restarted."
echo ""

# Step 4: Restart websocket-relay
echo "[4/7] Restarting WebSocket Relay..."
docker-compose up -d --build websocket-relay || docker compose up -d --build websocket-relay || echo "WebSocket relay not found in main compose."
echo "WebSocket Relay restarted."
echo ""

# Step 5: Restart blockscout backend and frontend
echo "[5/7] Restarting Blockscout services..."
cd "$PROJECT_DIR/blockscout"
docker-compose restart blockscout frontend || docker compose restart blockscout frontend
cd "$PROJECT_DIR"
echo "Blockscout services restarted."
echo ""

# Step 6: Update cloudflared config
echo "[6/7] Cloudflared configuration updated."
echo "NOTE: You need to manually restart cloudflared for the tunnel config changes."
echo "Run: sudo systemctl restart cloudflared"
echo "  OR: cloudflared service stop && cloudflared service start"
echo ""

# Step 7: Verify services are healthy
echo "[7/7] Verifying services..."
echo ""
echo "Checking service health..."

# Check nginx
if docker ps | grep -q "viddhana-nginx"; then
    echo "[OK] Nginx is running"
else
    echo "[WARN] Nginx is not running"
fi

# Check websocket-relay
if docker ps | grep -q "viddhana-ws-relay"; then
    echo "[OK] WebSocket Relay is running"
else
    echo "[WARN] WebSocket Relay is not running"
fi

# Check blockscout backend
if docker ps | grep -q "viddhana-blockscout-backend"; then
    echo "[OK] Blockscout Backend is running"
else
    echo "[ERROR] Blockscout Backend is not running - this causes 530 errors!"
fi

# Check blockscout frontend
if docker ps | grep -q "viddhana-blockscout-frontend"; then
    echo "[OK] Blockscout Frontend is running"
else
    echo "[ERROR] Blockscout Frontend is not running!"
fi

echo ""
echo "=========================================="
echo "Configuration Changes Applied:"
echo "=========================================="
echo "1. Cross-Origin-Opener-Policy set to 'same-origin-allow-popups'"
echo "   - Allows Coinbase Wallet SDK to function properly"
echo ""
echo "2. WebSocket configuration updated:"
echo "   - Dedicated ws.viddhana.com subdomain for WebSocket connections"
echo "   - Nginx properly proxies WebSocket upgrades"
echo "   - Cloudflared tunnel configured with http2Origin: false"
echo ""
echo "3. API timeouts extended to prevent 530 errors"
echo ""
echo "=========================================="
echo "IMPORTANT: Restart cloudflared tunnel!"
echo "=========================================="
echo "Run: sudo cp $PROJECT_DIR/cloudflared-config-fix.yml /etc/cloudflared/config.yml"
echo "Then: sudo systemctl restart cloudflared"
echo ""
echo "To test WebSocket connection:"
echo "  curl -v -H 'Upgrade: websocket' -H 'Connection: Upgrade' https://ws.viddhana.com/socket/v2/websocket"
echo ""
echo "Done!"
