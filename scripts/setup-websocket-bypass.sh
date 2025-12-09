#!/bin/bash
# =============================================================================
# WebSocket Bypass Cloudflare Setup Script
# =============================================================================
# Vấn đề: Cloudflare Free plan không hỗ trợ WebSocket qua HTTP/2
# Giải pháp: Bypass Cloudflare cho WebSocket endpoint
# =============================================================================

echo "=== WebSocket Bypass Setup ==="
echo ""

# Bước 1: Lấy SSL certificate từ Let's Encrypt
echo "[1/4] Checking SSL certificate..."
if [ ! -f "/etc/letsencrypt/live/ws.viddhana.com/fullchain.pem" ]; then
    echo "Getting Let's Encrypt certificate for ws.viddhana.com..."
    echo "NOTE: Bạn cần đổi ws.viddhana.com sang DNS-only trong Cloudflare trước!"
    echo ""
    echo "Chạy lệnh sau sau khi đổi DNS:"
    echo "sudo certbot certonly --standalone -d ws.viddhana.com"
else
    echo "Certificate already exists!"
fi

# Bước 2: Cập nhật Nginx config
echo ""
echo "[2/4] Updating Nginx configuration..."

# Bước 3: Cập nhật cloudflared config để không route ws.viddhana.com
echo ""
echo "[3/4] Updating cloudflared config..."
echo "Remove ws.viddhana.com from cloudflared config since it will be DNS-only"

# Bước 4: Hướng dẫn cấu hình Cloudflare
echo ""
echo "[4/4] Cloudflare Configuration Instructions:"
echo ""
echo "1. Go to Cloudflare Dashboard → viddhana.com → DNS"
echo "2. Find ws.viddhana.com record"
echo "3. Click the orange cloud to make it gray (DNS-only)"
echo "4. Point it to: $(curl -s ifconfig.me)"
echo ""
echo "OR disable HTTP/2 for entire domain:"
echo "1. Go to Cloudflare Dashboard → viddhana.com → Speed → Optimization"
echo "2. Under 'Protocol Optimization'"
echo "3. Toggle OFF 'HTTP/2'"
echo ""
