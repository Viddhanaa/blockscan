# Viddhana Blockscan

A private Ethereum-based blockchain network with Proof of Authority (Clique) consensus, KYC smart contracts, and Blockscout block explorer.

## Live URLs

| Service | URL | Description |
|---------|-----|-------------|
| **Block Explorer** | https://scan.viddhana.com | Blockscout Explorer |
| **RPC Endpoint** | https://rpc.viddhana.com | JSON-RPC API |
| **KYC API** | https://api.viddhana.com | KYC REST API |
| **WebSocket** | wss://wss.viddhana.com | Direct WebSocket to backend |
| **Main Website** | https://viddhana.com | Main website |
| **Documentation** | https://docs.viddhana.com | Documentation site |

## Architecture

```
                                    Internet
                                        │
                              ┌─────────┴─────────┐
                              │  Cloudflare       │
                              │  Tunnel           │
                              └────────┬──────────┘
                                       │
        ┌──────────────────────────────┼──────────────────────────────┐
        │                              │                              │
        ▼                              ▼                              ▼
┌───────────────┐           ┌─────────────────┐           ┌───────────────┐
│ scan.viddhana │           │ rpc.viddhana    │           │ api.viddhana  │
│ .com          │           │ .com            │           │ .com          │
│ (Explorer)    │           │ (RPC)           │           │ (KYC API)     │
└───────┬───────┘           └────────┬────────┘           └───────┬───────┘
        │                            │                            │
        ▼                            │                            ▼
┌───────────────┐                    │                   ┌───────────────┐
│ Nginx :15000  │                    │                   │ Express.js    │
│ Reverse Proxy │                    │                   │ :3001         │
└───────┬───────┘                    │                   └───────┬───────┘
        │                            │                            │
   ┌────┴────┐                       │                            │
   ▼         ▼                       ▼                            ▼
┌──────┐ ┌────────┐         ┌─────────────────┐          ┌───────────────┐
│Front │ │Backend │◄───────►│   Geth Node 1   │◄────────►│ ViddhanaKYC   │
│:13000│ │:14000  │         │   :8545         │          │ Contract      │
└──────┘ └────┬───┘         └────────┬────────┘          └───────────────┘
              │                      │
              ▼                      │
        ┌──────────┐          ┌──────┴──────┐
        │PostgreSQL│          │             │
        │ + Redis  │    ┌─────────┐   ┌─────────┐
        └──────────┘    │ Node 1  │◄─►│ Node 2  │
                        │ :8545   │   │ :8547   │
                        └─────────┘   └─────────┘
```

## Quick Start

### Connect MetaMask

1. Open MetaMask > Settings > Networks > Add Network
2. Fill in:
   - **Network Name**: `Viddhana`
   - **RPC URL**: `https://rpc.viddhana.com`
   - **Chain ID**: `1337`
   - **Currency Symbol**: `ETH`
   - **Block Explorer**: `https://scan.viddhana.com`

### API Usage

```bash
# Check KYC Status
curl "https://api.viddhana.com/rpc/check_kyc?address=0xYourAddress"

# Get Blockchain Stats
curl https://scan.viddhana.com/api/v2/stats
```

## Network Details

| Parameter | Value |
|-----------|-------|
| Network Name | Viddhana |
| Chain ID | 1337 |
| Consensus | Clique (Proof-of-Authority) |
| Block Time | ~5 seconds |
| Currency | ETH |

### Key Addresses

| Name | Address |
|------|---------|
| Validator 1 | `0xC6EF29019d6acB8F50F464A015CfeA63a8a45C15` |
| Validator 2 | `0x24E63eFDaBB8103e5125e8Ed3428773bbFA72ec4` |
| KYC Contract | `0x066eB73F28c48B5ef07CB82E0522e233794C451e` |

## Project Structure

```
viddhana-blockscan/
├── api/                    # KYC middleware API
│   ├── src/
│   └── package.json
├── blockscout/             # Block explorer configs
├── config/                 # Blockchain configuration
│   └── genesis.json
├── contracts/              # Smart contracts
│   ├── contracts/
│   │   └── ViddhanaKYC.sol
│   └── deployments/
├── docs/                   # Documentation
│   ├── DOCUMENTATION.md    # Full documentation
│   ├── QUICKSTART.md       # Quick start guide
│   └── DEPLOYMENT.md       # Deployment guide
├── nginx/                  # Nginx proxy config
├── node1/                  # Validator node 1 data
├── node2/                  # Validator node 2 data
├── scripts/                # Utility scripts
└── docker-compose.yml
```

## Services

| Container | Port | Purpose |
|-----------|------|---------|
| viddhana-node1 | 8545, 8546, 30303 | Primary validator |
| viddhana-node2 | 8547, 8548, 30304 | Secondary validator |
| viddhana-blockscout-backend | 4000, 14000 | Explorer indexer & API |
| viddhana-blockscout-frontend | 13000 | Explorer UI |
| viddhana-nginx | 15000 | Reverse proxy |
| viddhana-kyc-api | 3001 | KYC middleware API |
| viddhana-ws-relay | 16000 | WebSocket relay |
| viddhana-db | 5432 | PostgreSQL database |
| viddhana-redis | 6379 | Redis cache |

## Local Development

```bash
# Check services status
docker ps --filter "name=viddhana"

# View logs
docker logs viddhana-node1 -f
docker logs viddhana-blockscout-backend -f

# Restart services
docker restart viddhana-blockscout-backend

# Access local explorer
open http://localhost:15000
```

## Documentation

- **[Full Documentation](docs/DOCUMENTATION.md)** - Complete technical documentation
- **[Quick Start](docs/QUICKSTART.md)** - Quick reference guide
- **[Deployment Guide](docs/DEPLOYMENT.md)** - How to deploy from scratch

## API Reference

### KYC API Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/health` | Health check |
| GET | `/rpc/check_kyc?address=` | Check KYC status |
| POST | `/api/approve_kyc` | Approve KYC (requires API key) |
| POST | `/api/revoke_kyc` | Revoke KYC (requires API key) |

### Blockscout API

| Endpoint | Description |
|----------|-------------|
| `/api/v2/stats` | Blockchain statistics |
| `/api/v2/blocks` | Latest blocks |
| `/api/v2/transactions` | Latest transactions |
| `/api/v2/addresses/:address` | Address details |

## Troubleshooting

### Check Service Status

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
docker logs viddhana-blockscout-backend -f  # Indexer logs
docker logs viddhana-node1 -f               # Node logs
pm2 logs viddhana-api                       # API logs
```

### Restart Services

```bash
docker restart viddhana-blockscout-backend
docker restart viddhana-blockscout-frontend
sudo systemctl restart cloudflared
```

## License

MIT License - See LICENSE file for details.

## Support

- **Email**: support@viddhana.com
- **GitHub**: https://github.com/viddhana

---

*Last updated: December 9, 2025*
