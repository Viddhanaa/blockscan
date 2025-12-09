# Hướng dẫn Fix WebSocket cho Viddhana Blockscan

## Vấn đề
- Cloudflare Free plan không hỗ trợ WebSocket qua HTTP/2
- Browser mặc định negotiate HTTP/2 với Cloudflare
- WebSocket cần HTTP/1.1 để hoạt động qua Cloudflare Free

## Cấu hình WebSocket hiện tại

### Các endpoint WebSocket có sẵn:

| Endpoint | Port | Mô tả |
|----------|------|-------|
| `ws://localhost:8546` | 8546 | Geth Node 1 WebSocket (local) |
| `ws://localhost:8548` | 8548 | Geth Node 2 WebSocket (local) |
| `wss://ws.viddhana.com/socket/` | 443 | Blockscout real-time updates |
| `wss://ws.viddhana.com/ws` | 443 | Geth Ethereum JSON-RPC WebSocket |
| `wss://ws.viddhana.com:8443/socket/` | 8443 | Alternative WSS port |
| `wss://ws.viddhana.com:8546/` | 8546 | Direct Geth WSS (SSL) |

### Nginx đã được cấu hình với:
- WebSocket upgrade headers
- Keepalive connections
- Geth upstream với failover (node1 → node2)
- SSL/TLS với modern ciphers
- Long timeout (24 giờ) cho persistent connections

## Giải pháp

### OPTION A: Tắt HTTP/2 trong Cloudflare (Nhanh nhất)

1. Đăng nhập Cloudflare Dashboard
2. Chọn domain `viddhana.com`
3. Vào **Speed** → **Optimization** → **Protocol Optimization**
4. Tắt **HTTP/2**
5. Chờ 5 phút và test lại

**Ưu điểm**: Nhanh, không cần thay đổi server
**Nhược điểm**: Ảnh hưởng performance toàn bộ domain

---

### OPTION B: Dùng ws.viddhana.com riêng (Khuyến nghị)

#### Bước 1: Đổi DNS ws.viddhana.com thành DNS-only

1. Đăng nhập Cloudflare Dashboard
2. Vào **DNS** → Tìm record `ws.viddhana.com`
3. Click icon đám mây màu cam → chuyển thành xám (DNS only)
4. Đổi IP thành: `103.199.19.95` (server của bạn)

#### Bước 2: Lấy SSL Certificate

```bash
# Stop nginx tạm để certbot dùng port 443
docker stop viddhana-nginx

# Lấy certificate
sudo certbot certonly --standalone -d ws.viddhana.com

# Start lại nginx
docker start viddhana-nginx
```

#### Bước 3: Cập nhật Nginx với Let's Encrypt cert

```bash
# Copy certificates
sudo cp /etc/letsencrypt/live/ws.viddhana.com/fullchain.pem /home/realcodes/VIddhana_blockscan/nginx/ssl/ws.crt
sudo cp /etc/letsencrypt/live/ws.viddhana.com/privkey.pem /home/realcodes/VIddhana_blockscan/nginx/ssl/ws.key
sudo chown realcodes:realcodes /home/realcodes/VIddhana_blockscan/nginx/ssl/*

# Reload nginx
docker exec viddhana-nginx nginx -s reload
```

#### Bước 4: Cấu hình Frontend sử dụng ws.viddhana.com

Cập nhật biến môi trường trong docker-compose hoặc .env:

```bash
# Trong blockscout/docker-compose.yml hoặc .env
NEXT_PUBLIC_API_HOST=ws.viddhana.com
NEXT_PUBLIC_API_PORT=443
NEXT_PUBLIC_API_PROTOCOL=https
NEXT_PUBLIC_API_WEBSOCKET_PROTOCOL=wss
```

Hoặc recreate container:

```bash
docker rm -f viddhana-blockscout-frontend

docker run -d \
  --name viddhana-blockscout-frontend \
  --network viddhana-blockscout-network \
  -p 13000:3000 \
  -e NEXT_PUBLIC_API_HOST=ws.viddhana.com \
  -e NEXT_PUBLIC_API_PORT=443 \
  -e NEXT_PUBLIC_API_PROTOCOL=https \
  -e NEXT_PUBLIC_API_WEBSOCKET_PROTOCOL=wss \
  -e NEXT_PUBLIC_NETWORK_NAME=Viddhana \
  -e NEXT_PUBLIC_NETWORK_SHORT_NAME=Viddhana \
  -e NEXT_PUBLIC_NETWORK_ID=1337 \
  -e NEXT_PUBLIC_NETWORK_CURRENCY_NAME="BTC Diamond" \
  -e NEXT_PUBLIC_NETWORK_CURRENCY_SYMBOL=BTCD \
  -e NEXT_PUBLIC_NETWORK_CURRENCY_DECIMALS=18 \
  -e NEXT_PUBLIC_HOMEPAGE_PLATE_BACKGROUND="linear-gradient(135deg, #1a1a2e 0%, #16213e 50%, #0f3460 100%)" \
  ghcr.io/blockscout/frontend:latest
```

#### Bước 5: Restart cloudflared

```bash
sudo systemctl restart cloudflared
```

---

### OPTION C: Upgrade Cloudflare Plan

Cloudflare Pro ($20/month) hỗ trợ WebSocket qua HTTP/2 (RFC 8441)

---

## Kiểm tra

### Test Blockscout WebSocket:
```bash
# Test WebSocket qua scan.viddhana.com (sau khi tắt HTTP/2)
curl -v --http1.1 -H "Connection: Upgrade" -H "Upgrade: websocket" \
  -H "Sec-WebSocket-Key: dGhlIHNhbXBsZSBub25jZQ==" \
  -H "Sec-WebSocket-Version: 13" \
  "https://scan.viddhana.com/socket/v2/websocket?vsn=2.0.0"

# Test WebSocket qua ws.viddhana.com (sau khi setup DNS-only)
curl -v -k -H "Connection: Upgrade" -H "Upgrade: websocket" \
  -H "Sec-WebSocket-Key: dGhlIHNhbXBsZSBub25jZQ==" \
  -H "Sec-WebSocket-Version: 13" \
  "https://ws.viddhana.com/socket/v2/websocket?vsn=2.0.0"
```

### Test Geth Ethereum WebSocket:
```bash
# Test Geth WebSocket via wss proxy
curl -v -k -H "Connection: Upgrade" -H "Upgrade: websocket" \
  -H "Sec-WebSocket-Key: dGhlIHNhbXBsZSBub25jZQ==" \
  -H "Sec-WebSocket-Version: 13" \
  "wss://ws.viddhana.com/ws"

# Test với wscat (cài: npm install -g wscat)
wscat -c "wss://ws.viddhana.com/ws"

# Gửi JSON-RPC request qua WebSocket
wscat -c "wss://ws.viddhana.com/ws" -x '{"jsonrpc":"2.0","method":"eth_blockNumber","params":[],"id":1}'
```

### Test KYC API WebSocket status:
```bash
# Check health endpoint (bao gồm WebSocket status)
curl -s http://localhost:3001/health | jq
```

Nếu thấy `HTTP/1.1 101 Switching Protocols` là thành công!

---

## Tóm tắt thay đổi đã thực hiện

1. ✅ Nginx đã được cấu hình lắng nghe:
   - Port 80 (HTTP)
   - Port 443 (HTTPS/WSS)
   - Port 8443 (Alternative WSS)
   - Port 8546 (Direct Geth WSS)
   
2. ✅ Nginx upstream với failover:
   - Geth WS: node1:8546 → node2:8546 (backup)
   - Geth RPC: node1:8545 → node2:8545 (backup)
   
3. ✅ KYC API đã có:
   - WebSocket provider với auto-reconnection
   - Exponential backoff (5s → 10s → 20s... max 5 phút)
   - Contract event listeners cho real-time updates
   - Health endpoint với WebSocket status

4. ⏳ Cần: Đổi ws.viddhana.com sang DNS-only trong Cloudflare Dashboard
5. ⏳ Cần: Lấy Let's Encrypt SSL certificate
6. ⏳ Cần: Restart cloudflared

---

## Troubleshooting

### WebSocket không kết nối được:
1. Check Nginx logs: `docker logs viddhana-nginx`
2. Check SSL certificate: `openssl s_client -connect ws.viddhana.com:443`
3. Check Geth node: `docker exec viddhana-node1 geth attach --exec "admin.nodeInfo"`

### KYC API WebSocket reconnecting liên tục:
1. Check API logs: `docker logs viddhana-kyc-api`
2. Verify Geth WS is running: `curl -X POST -H "Content-Type: application/json" --data '{"jsonrpc":"2.0","method":"eth_blockNumber","params":[],"id":1}' http://localhost:8545`

### Blockscout real-time không hoạt động:
1. Check browser console for WebSocket errors
2. Verify NEXT_PUBLIC_API_WEBSOCKET_PROTOCOL=wss
3. Check Blockscout backend logs: `docker logs viddhana-blockscout-backend`
