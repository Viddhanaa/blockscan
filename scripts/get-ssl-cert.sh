#!/bin/bash
# Script để lấy Let's Encrypt SSL certificate cho ws.viddhana.com

set -euo pipefail

# Check if running as root
if [ "$(id -u)" -ne 0 ]; then
    echo "Error: This script must be run as root"
    exit 1
fi

echo "=== Getting Let's Encrypt SSL Certificate ==="

# Stop system nginx
echo "[1/5] Stopping nginx..."
systemctl stop nginx

# Kiểm tra port 80 đã free
sleep 2
if ss -tlnp | grep -q ":80 "; then
    echo "Port 80 still in use! Check what's using it:"
    ss -tlnp | grep :80
    exit 1
fi

# Get certificate
echo "[2/5] Getting certificate for ws.viddhana.com..."
certbot certonly --standalone -d ws.viddhana.com \
  --non-interactive --agree-tos --email admin@viddhana.com

if [ $? -ne 0 ]; then
    echo "Failed to get certificate!"
    systemctl start nginx
    exit 1
fi

# Copy certificates to nginx ssl directory
echo "[3/5] Copying certificates..."
cp /etc/letsencrypt/live/ws.viddhana.com/fullchain.pem /home/realcodes/VIddhana_blockscan/nginx/ssl/ws.crt
cp /etc/letsencrypt/live/ws.viddhana.com/privkey.pem /home/realcodes/VIddhana_blockscan/nginx/ssl/ws.key
chown realcodes:realcodes /home/realcodes/VIddhana_blockscan/nginx/ssl/*
# Set proper permissions: 644 for certs, 600 for private keys
chmod 644 /home/realcodes/VIddhana_blockscan/nginx/ssl/ws.crt
chmod 600 /home/realcodes/VIddhana_blockscan/nginx/ssl/ws.key

# Start nginx system
echo "[4/5] Starting nginx..."
systemctl start nginx

# Start docker nginx
echo "[5/5] Starting docker nginx..."
docker start viddhana-nginx

echo ""
echo "=== DONE! ==="
echo "SSL certificate installed successfully!"
echo ""
echo "Test with:"
echo "curl -v https://ws.viddhana.com/socket/v2/websocket?vsn=2.0.0"
