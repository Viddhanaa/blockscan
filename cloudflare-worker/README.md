# Cloudflare Worker: WebSocket Proxy

This Cloudflare Worker handles WebSocket connections for Blockscout, bypassing the HTTP/2 WebSocket limitation on Cloudflare Free plan.

## Problem
- Cloudflare Free plan uses HTTP/2 by default
- HTTP/2 doesn't support traditional WebSocket upgrade (needs RFC 8441)
- Browsers negotiate HTTP/2 automatically, causing WebSocket to fail with 426

## Solution
This Worker intercepts WebSocket requests and proxies them using Cloudflare's native WebSocket support.

## Deployment Steps

### 1. Install Wrangler CLI
```bash
npm install -g wrangler
```

### 2. Login to Cloudflare
```bash
wrangler login
```

### 3. Get your Account ID and Zone ID
```bash
# List your accounts
wrangler whoami

# Or find in Cloudflare Dashboard:
# - Account ID: Dashboard sidebar (bottom)
# - Zone ID: Domain Overview page (right sidebar)
```

### 4. Update wrangler.toml
Edit `wrangler.toml` and uncomment/update:
```toml
account_id = "your-account-id"
zone_id = "your-zone-id"

routes = [
  { pattern = "scan.viddhana.com/socket/*", zone_name = "viddhana.com" }
]
```

### 5. Deploy the Worker
```bash
cd /home/realcodes/VIddhana_blockscan/cloudflare-worker
wrangler deploy
```

### 6. Configure Route in Cloudflare Dashboard
If routes don't work via wrangler.toml:
1. Go to Cloudflare Dashboard → Workers & Pages
2. Select the deployed worker
3. Go to "Triggers" tab
4. Add route: `scan.viddhana.com/socket/*`

## Testing
```bash
# Test WebSocket connection
curl -i -N \
  -H "Connection: Upgrade" \
  -H "Upgrade: websocket" \
  -H "Sec-WebSocket-Version: 13" \
  -H "Sec-WebSocket-Key: $(openssl rand -base64 16)" \
  "https://scan.viddhana.com/socket/v2/websocket?vsn=2.0.0"
```

## Alternative: Durable Objects (Pro Plan)
For more robust WebSocket handling, consider using Durable Objects (requires Cloudflare Pro or higher).
