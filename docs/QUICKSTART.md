# Viddhana Blockscan - Quick Start Guide

## Production URLs

| Service | URL |
|---------|-----|
| **Block Explorer** | https://scan.viddhana.com |
| **RPC Endpoint** | https://rpc.viddhana.com |
| **KYC API** | https://api.viddhana.com |

---

## Connect MetaMask

1. Open MetaMask > Settings > Networks > Add Network
2. Fill in:
   - **Network Name**: `Viddhana`
   - **RPC URL**: `https://rpc.viddhana.com`
   - **Chain ID**: `1337`
   - **Currency Symbol**: `ETH`
   - **Block Explorer**: `https://scan.viddhana.com`

---

## Quick API Examples

### Check KYC Status
```bash
curl "https://api.viddhana.com/rpc/check_kyc?address=0xYourAddress"
```

### Approve KYC (Admin)
```bash
curl -X POST https://api.viddhana.com/api/approve_kyc \
  -H "Content-Type: application/json" \
  -H "X-API-Key: viddhana-api-key-2024" \
  -d '{"address": "0xYourAddress"}'
```

### Get Blockchain Stats
```bash
curl https://scan.viddhana.com/api/v2/stats
```

### Get Latest Blocks
```bash
curl https://scan.viddhana.com/api/v2/blocks
```

---

## Local Development

### Start All Services
```bash
cd /home/realcodes/VIddhana_blockscan

# Start blockchain nodes
docker start viddhana-node1 viddhana-node2

# Start Blockscout
docker start viddhana-db viddhana-redis viddhana-blockscout-backend
docker start viddhana-blockscout-frontend viddhana-nginx

# Start KYC API
pm2 start viddhana-api
```

### Local URLs
- Explorer: http://localhost:15000
- RPC: http://localhost:8545
- API: http://localhost:3001

---

## Important Addresses

| Name | Address |
|------|---------|
| Node 1 (Validator) | `0xC6EF29019d6acB8F50F464A015CfeA63a8a45C15` |
| Node 2 (Validator) | `0x24E63eFDaBB8103e5125e8Ed3428773bbFA72ec4` |
| KYC Contract | `0x066eB73F28c48B5ef07CB82E0522e233794C451e` |

---

## Troubleshooting

### Check Services Status
```bash
# Docker containers
docker ps --filter "name=viddhana"

# KYC API
pm2 status viddhana-api

# Cloudflare Tunnel
sudo systemctl status cloudflared
```

### View Logs
```bash
# Blockchain node
docker logs viddhana-node1 -f

# Blockscout
docker logs viddhana-blockscout-backend -f

# KYC API
pm2 logs viddhana-api
```

### Restart Services
```bash
# Restart Blockscout
docker restart viddhana-blockscout-backend viddhana-blockscout-frontend

# Restart Cloudflare Tunnel
sudo systemctl restart cloudflared
```

---

For detailed documentation, see [DOCUMENTATION.md](./DOCUMENTATION.md)
