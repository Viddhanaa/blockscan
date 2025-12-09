# Viddhana Blockscan - Deployment Guide

## Prerequisites

- Ubuntu 20.04+ or Debian 11+
- Docker & Docker Compose
- Node.js 18+
- PM2 (for API management)
- Cloudflared (for tunnel)

---

## 1. Install Dependencies

```bash
# Docker
curl -fsSL https://get.docker.com | sh
sudo usermod -aG docker $USER

# Node.js 18
curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash -
sudo apt install -y nodejs

# PM2
npm install -g pm2

# Cloudflared
curl -L https://github.com/cloudflare/cloudflared/releases/latest/download/cloudflared-linux-amd64 -o cloudflared
sudo mv cloudflared /usr/local/bin/
sudo chmod +x /usr/local/bin/cloudflared
```

---

## 2. Clone Repository

```bash
cd /home/$USER
git clone https://github.com/viddhana/blockscan.git VIddhana_blockscan
cd VIddhana_blockscan
```

---

## 3. Start Blockchain Nodes

### Node 1

```bash
docker run -d \
  --name viddhana-node1 \
  -p 8545:8545 -p 8546:8546 -p 30303:30303 \
  -v $(pwd)/node1:/root/.ethereum \
  -v $(pwd)/config/genesis.json:/genesis.json \
  ethereum/client-go:v1.13.15 \
  --networkid 1337 \
  --http --http.addr 0.0.0.0 --http.port 8545 \
  --http.api eth,net,web3,txpool,debug,admin,personal \
  --http.corsdomain "*" \
  --ws --ws.addr 0.0.0.0 --ws.port 8546 \
  --ws.api eth,net,web3 \
  --syncmode full \
  --gcmode archive \
  --allow-insecure-unlock \
  --unlock 0xC6EF29019d6acB8F50F464A015CfeA63a8a45C15 \
  --password /root/.ethereum/password.txt \
  --mine --miner.etherbase 0xC6EF29019d6acB8F50F464A015CfeA63a8a45C15
```

### Node 2

```bash
docker run -d \
  --name viddhana-node2 \
  -p 8547:8545 -p 8548:8546 -p 30304:30303 \
  -v $(pwd)/node2:/root/.ethereum \
  -v $(pwd)/config/genesis.json:/genesis.json \
  ethereum/client-go:v1.13.15 \
  --networkid 1337 \
  --http --http.addr 0.0.0.0 --http.port 8545 \
  --http.api eth,net,web3,txpool,debug,admin,personal \
  --http.corsdomain "*" \
  --ws --ws.addr 0.0.0.0 --ws.port 8546 \
  --ws.api eth,net,web3 \
  --syncmode full \
  --gcmode archive \
  --allow-insecure-unlock \
  --unlock 0x24E63eFDaBB8103e5125e8Ed3428773bbFA72ec4 \
  --password /root/.ethereum/password.txt \
  --mine --miner.etherbase 0x24E63eFDaBB8103e5125e8Ed3428773bbFA72ec4
```

---

## 4. Create Docker Network

```bash
docker network create viddhana-network
docker network connect viddhana-network viddhana-node1
```

---

## 5. Start Blockscout Database

```bash
# PostgreSQL
docker run -d \
  --name viddhana-db \
  --network viddhana-network \
  -e POSTGRES_USER=blockscout \
  -e POSTGRES_PASSWORD=blockscout123 \
  -e POSTGRES_DB=blockscout \
  postgres:14

# Redis
docker run -d \
  --name viddhana-redis \
  --network viddhana-network \
  redis:alpine
```

---

## 6. Start Blockscout Backend

```bash
docker run -d \
  --name viddhana-blockscout-backend \
  --network viddhana-network \
  -p 14000:4000 \
  -e DATABASE_URL=postgresql://blockscout:blockscout123@viddhana-db:5432/blockscout \
  -e ETHEREUM_JSONRPC_VARIANT=geth \
  -e ETHEREUM_JSONRPC_HTTP_URL=http://viddhana-node1:8545 \
  -e ETHEREUM_JSONRPC_WS_URL=ws://viddhana-node1:8546 \
  -e SECRET_KEY_BASE=$(openssl rand -hex 32) \
  -e CHAIN_ID=1337 \
  -e NETWORK=Viddhana \
  -e API_V2_ENABLED=true \
  -e DISABLE_EXCHANGE_RATES=true \
  -e ECTO_USE_SSL=false \
  -e COIN=ETH \
  -e COIN_NAME=Ether \
  -e API_CORS_ORIGINS='*' \
  -e REDIS_URL=redis://viddhana-redis:6379 \
  blockscout/blockscout:latest \
  sh -c 'bin/blockscout eval "Elixir.Explorer.ReleaseTasks.create_and_migrate()" && bin/blockscout start'
```

---

## 7. Start Blockscout Frontend

```bash
docker run -d \
  --name viddhana-blockscout-frontend \
  --network host \
  -e PORT=13000 \
  -e HOSTNAME=0.0.0.0 \
  -e NEXT_PUBLIC_API_HOST=scan.viddhana.com \
  -e NEXT_PUBLIC_API_PROTOCOL=https \
  -e NEXT_PUBLIC_API_WEBSOCKET_PROTOCOL=wss \
  -e NEXT_PUBLIC_NETWORK_NAME=Viddhana \
  -e NEXT_PUBLIC_NETWORK_SHORT_NAME=VID \
  -e NEXT_PUBLIC_NETWORK_ID=1337 \
  -e NEXT_PUBLIC_NETWORK_CURRENCY_NAME=Ether \
  -e NEXT_PUBLIC_NETWORK_CURRENCY_SYMBOL=ETH \
  -e NEXT_PUBLIC_NETWORK_CURRENCY_DECIMALS=18 \
  -e NEXT_PUBLIC_IS_TESTNET=true \
  -e NEXT_PUBLIC_APP_HOST=scan.viddhana.com \
  -e NEXT_PUBLIC_APP_PROTOCOL=https \
  ghcr.io/blockscout/frontend:latest
```

---

## 8. Start Nginx Proxy

Create `nginx/nginx.conf`:

```nginx
events {
    worker_connections 1024;
}

http {
    upstream frontend {
        server host.docker.internal:13000;
    }
    
    resolver 127.0.0.11 valid=30s;

    upstream backend {
        server viddhana-blockscout-backend:4000;
    }

    server {
        listen 80;
        server_name localhost scan.viddhana.com;

        location /api/ {
            proxy_pass http://backend/api/;
            proxy_http_version 1.1;
            proxy_set_header Host $host;
            proxy_set_header X-Forwarded-Proto https;
            add_header 'Access-Control-Allow-Origin' '*' always;
        }

        location /socket/ {
            proxy_pass http://backend/socket/;
            proxy_http_version 1.1;
            proxy_set_header Upgrade $http_upgrade;
            proxy_set_header Connection "upgrade";
        }

        location / {
            proxy_pass http://frontend/;
            proxy_http_version 1.1;
            proxy_set_header Host $host;
            proxy_set_header X-Forwarded-Proto https;
            proxy_set_header Upgrade $http_upgrade;
            proxy_set_header Connection "upgrade";
        }
    }
}
```

Start nginx:

```bash
docker run -d \
  --name viddhana-nginx \
  --network viddhana-network \
  --add-host=host.docker.internal:host-gateway \
  -p 15000:80 \
  -v $(pwd)/nginx/nginx.conf:/etc/nginx/nginx.conf:ro \
  nginx:alpine
```

---

## 9. Deploy KYC Contract

```bash
cd contracts
npm install
npx hardhat run scripts/deploy.js --network viddhana
```

---

## 10. Start KYC API

```bash
cd api
npm install

# Create .env
cat > .env << EOF
PORT=3001
NODE_ENV=production
RPC_URL=http://localhost:8545
CHAIN_ID=1337
KYC_CONTRACT_ADDRESS=0x066eB73F28c48B5ef07CB82E0522e233794C451e
ADMIN_PRIVATE_KEY=0x...
API_KEY=your-secure-api-key
CORS_ORIGIN=*
EOF

# Start with PM2
pm2 start src/index.js --name viddhana-api
pm2 save
```

---

## 11. Setup Cloudflare Tunnel

### Login to Cloudflare

```bash
cloudflared tunnel login
```

### Create Tunnel

```bash
cloudflared tunnel create blockscan
```

### Configure Tunnel

Create `/etc/cloudflared/config.yml`:

```yaml
tunnel: blockscan
credentials-file: /etc/cloudflared/blockscan.json
protocol: quic

ingress:
  - hostname: scan.viddhana.com
    service: http://127.0.0.1:15000
  - hostname: rpc.viddhana.com
    service: http://127.0.0.1:8545
  - hostname: api.viddhana.com
    service: http://127.0.0.1:3001
  - service: http_status:404
```

### Create DNS Records

```bash
cloudflared tunnel route dns blockscan scan.viddhana.com
cloudflared tunnel route dns blockscan rpc.viddhana.com
cloudflared tunnel route dns blockscan api.viddhana.com
```

### Install as Service

```bash
sudo cloudflared service install
sudo systemctl enable cloudflared
sudo systemctl start cloudflared
```

---

## 12. Verify Deployment

```bash
# Check all containers
docker ps --filter "name=viddhana"

# Test Explorer
curl -s https://scan.viddhana.com/api/v2/stats | jq

# Test RPC
curl -s https://rpc.viddhana.com \
  -X POST -H "Content-Type: application/json" \
  -d '{"jsonrpc":"2.0","method":"eth_blockNumber","params":[],"id":1}'

# Test KYC API
curl -s https://api.viddhana.com/health
```

---

## Maintenance

### Auto-restart on Reboot

```bash
# Docker containers
docker update --restart unless-stopped \
  viddhana-node1 viddhana-node2 \
  viddhana-db viddhana-redis \
  viddhana-blockscout-backend \
  viddhana-blockscout-frontend \
  viddhana-nginx

# PM2
pm2 startup
pm2 save

# Cloudflared (already enabled as service)
```

### Monitoring

```bash
# Check resources
docker stats --filter "name=viddhana"

# Check disk usage
docker system df
```

---

## Rollback

### Stop All Services

```bash
docker stop $(docker ps -q --filter "name=viddhana")
pm2 stop viddhana-api
sudo systemctl stop cloudflared
```

### Restore from Backup

```bash
# Restore database
docker exec -i viddhana-db psql -U blockscout blockscout < backup.sql

# Restore node data
docker cp ./node1-backup/. viddhana-node1:/root/.ethereum/
```

---

*Last updated: December 6, 2025*
