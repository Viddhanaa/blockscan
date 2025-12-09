# Phase 5: Frontend Customization

## Overview
This document provides detailed instructions for customizing the Blockscout frontend to match the Viddhana Blockscan design, including theming, branding, and KYC badge integration.

---

## Design Specification

### Target Design 

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                           HEADER (Blue Gradient)                            │
│  ┌────────────────┐                                    ┌─────────────────┐  │
│  │ Viddhana       │  [Search: Address / Tx / Block]    │ Connect Wallet  │  │
│  │ Blockscan      │                                    └─────────────────┘  │
│  └────────────────┘                                                         │
├─────────────────────────────────────────────────────────────────────────────┤
│                           STATS CARDS                                       │
│  ┌─────────┐  ┌─────────┐  ┌─────────┐  ┌─────────┐  ┌─────────┐           │
│  │ Blocks  │  │ Avg Time│  │  Txns   │  │Addresses│  │   Gas   │           │
│  │ 12,345  │  │  5.0s   │  │ 45,678  │  │  1,234  │  │ 11 Gwei │           │
│  └─────────┘  └─────────┘  └─────────┘  └─────────┘  └─────────┘           │
├─────────────────────────────────────────────────────────────────────────────┤
│     LATEST BLOCKS              │        LATEST TRANSACTIONS                │
│  ┌──────────────────────┐      │  ┌──────────────────────┐                 │
│  │ Block #12345         │      │  │ 0xabc...def          │                 │
│  │ Validator: 0x123     │      │  │ From: 0x... To: 0x.. │                 │
│  │ Txns: 5 | 2 sec ago  │      │  │ Value: 1.5 BTCD      │                 │
│  └──────────────────────┘      │  └──────────────────────┘                 │
└─────────────────────────────────────────────────────────────────────────────┘
```

### Color Palette

| Element | Color Code | Description |
|---------|------------|-------------|
| Primary Gradient Start | `#4A90E2` | Ocean blue |
| Primary Gradient End | `#00C6FF` | Light cyan |
| Background | `#F5F7FA` | Light gray |
| Card Background | `#FFFFFF` | White |
| Text Primary | `#333333` | Dark gray |
| Text Secondary | `#666666` | Medium gray |
| Success/KYC Badge | `#28A745` | Green |
| Border | `#E5E5E5` | Light border |

---

## Customization Approach

There are two approaches to customize Blockscout:

1. **Environment Variables** (Simple) - Basic branding via configuration
2. **Custom Frontend Build** (Advanced) - Full UI customization

---

## Approach 1: Environment Variable Customization

### Step 1: Update Environment Variables

Edit `~/viddhana-chain/blockscout/.env`:

```env
# ============ BRANDING ============
NEXT_PUBLIC_NETWORK_NAME=Viddhana Blockscan
NEXT_PUBLIC_NETWORK_SHORT_NAME=Viddhana
NEXT_PUBLIC_NETWORK_LOGO=https://your-domain.com/logo.svg
NEXT_PUBLIC_NETWORK_LOGO_DARK=https://your-domain.com/logo-dark.svg
NEXT_PUBLIC_NETWORK_ICON=https://your-domain.com/icon.svg

# ============ COLORS ============
NEXT_PUBLIC_THEME_COLOR_SCHEME_DEFAULT=light

# ============ HOMEPAGE ============
NEXT_PUBLIC_HOMEPAGE_CHARTS=["daily_txs"]
NEXT_PUBLIC_HOMEPAGE_PLATE_BACKGROUND=linear-gradient(90deg, #4A90E2 0%, #00C6FF 100%)
NEXT_PUBLIC_HOMEPAGE_PLATE_TEXT_COLOR=rgba(255, 255, 255, 1)

# ============ FOOTER ============
NEXT_PUBLIC_FOOTER_LINKS=[{"text":"GitHub","url":"https://github.com/your-org"}]

# ============ FEATURES ============
NEXT_PUBLIC_HAS_BEACON_CHAIN=false
NEXT_PUBLIC_IS_TESTNET=true
NEXT_PUBLIC_VIEWS_ADDRESS_IDENTICON_TYPE=gradient_avatar

# ============ API ENDPOINTS ============
NEXT_PUBLIC_API_HOST=localhost
NEXT_PUBLIC_API_PORT=4000
NEXT_PUBLIC_API_PROTOCOL=http

# ============ WALLET CONNECT ============
NEXT_PUBLIC_WALLET_CONNECT_PROJECT_ID=your_wallet_connect_project_id
NEXT_PUBLIC_NETWORK_RPC_URL=http://localhost:8545
```

### Step 2: Create Custom Logo Assets

Create logo files:
- `logo.svg` - Main logo (recommended: 200x50px)
- `logo-dark.svg` - Logo for dark mode
- `icon.svg` - Small icon (32x32px)
- `favicon.ico` - Browser favicon

Example simple SVG logo:

```xml
<!-- logo.svg -->
<svg width="200" height="50" xmlns="http://www.w3.org/2000/svg">
  <defs>
    <linearGradient id="grad1" x1="0%" y1="0%" x2="100%" y2="0%">
      <stop offset="0%" style="stop-color:#4A90E2;stop-opacity:1" />
      <stop offset="100%" style="stop-color:#00C6FF;stop-opacity:1" />
    </linearGradient>
  </defs>
  <text x="10" y="35" font-family="Arial, sans-serif" font-size="24" font-weight="bold" fill="url(#grad1)">
    Viddhana Blockscan
  </text>
</svg>
```

### Step 3: Host Assets

Option A: Use external hosting:
```env
NEXT_PUBLIC_NETWORK_LOGO=https://your-cdn.com/viddhana/logo.svg
```

Option B: Mount local files via Docker volume:
```yaml
# In docker-compose.yml under frontend service
volumes:
  - ./assets:/app/public/assets
```

Then reference:
```env
NEXT_PUBLIC_NETWORK_LOGO=/assets/logo.svg
```

---

## Approach 2: Custom Frontend Build

For deeper customization, build a custom frontend.

### Step 1: Clone Blockscout Frontend

```bash
cd ~/viddhana-chain
git clone https://github.com/blockscout/frontend.git blockscout-frontend
cd blockscout-frontend
```

### Step 2: Install Dependencies

```bash
# Install Node.js 18+
nvm install 18
nvm use 18

# Install dependencies
npm install
```

### Step 3: Create Custom Theme

Create `theme/custom-theme.ts`:

```typescript
// theme/custom-theme.ts
import { extendTheme } from '@chakra-ui/react';

const viddhanaTheme = extendTheme({
  colors: {
    blue: {
      50: '#E6F3FF',
      100: '#B3D9FF',
      200: '#80BFFF',
      300: '#4DA5FF',
      400: '#1A8BFF',
      500: '#4A90E2',  // Primary
      600: '#3B73B5',
      700: '#2C5688',
      800: '#1D395B',
      900: '#0E1C2E',
    },
    cyan: {
      500: '#00C6FF',
    },
  },
  styles: {
    global: {
      body: {
        bg: '#F5F7FA',
      },
    },
  },
  components: {
    Button: {
      baseStyle: {
        fontWeight: 'semibold',
      },
      variants: {
        solid: {
          bg: 'linear-gradient(90deg, #4A90E2 0%, #00C6FF 100%)',
          color: 'white',
          _hover: {
            bg: 'linear-gradient(90deg, #3B73B5 0%, #00A3CC 100%)',
          },
        },
      },
    },
    Card: {
      baseStyle: {
        container: {
          bg: 'white',
          borderRadius: '12px',
          boxShadow: '0 2px 8px rgba(0,0,0,0.08)',
        },
      },
    },
  },
});

export default viddhanaTheme;
```

### Step 4: Customize Header Component

Edit `ui/shared/Header.tsx` or create override:

```tsx
// components/Header/CustomHeader.tsx
import React from 'react';
import { Box, Flex, Input, Button, Image } from '@chakra-ui/react';

const CustomHeader: React.FC = () => {
  return (
    <Box
      as="header"
      bg="linear-gradient(90deg, #4A90E2 0%, #00C6FF 100%)"
      py={4}
      px={8}
    >
      <Flex align="center" justify="space-between" maxW="1400px" mx="auto">
        {/* Logo */}
        <Flex align="center">
          <Image src="/logo.svg" alt="Viddhana Blockscan" h="40px" />
        </Flex>

        {/* Search Bar */}
        <Box flex="1" maxW="600px" mx={8}>
          <Input
            placeholder="Search by address / txn hash / block / token..."
            bg="white"
            borderRadius="full"
            size="lg"
            _focus={{ boxShadow: '0 0 0 3px rgba(255,255,255,0.3)' }}
          />
        </Box>

        {/* Connect Wallet */}
        <Button
          bg="white"
          color="blue.500"
          borderRadius="full"
          px={6}
          _hover={{ bg: 'gray.100' }}
        >
          Connect Wallet
        </Button>
      </Flex>
    </Box>
  );
};

export default CustomHeader;
```

### Step 5: Add KYC Badge Component

Create `components/KYCBadge/KYCBadge.tsx`:

```tsx
import React, { useEffect, useState } from 'react';
import { Badge, Tooltip, HStack, Icon } from '@chakra-ui/react';
import { CheckCircleIcon } from '@chakra-ui/icons';

interface KYCBadgeProps {
  address: string;
  kycApiUrl?: string;
}

const KYCBadge: React.FC<KYCBadgeProps> = ({ 
  address, 
  kycApiUrl = 'http://localhost:3000' 
}) => {
  const [isKYC, setIsKYC] = useState<boolean | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const checkKYC = async () => {
      try {
        const response = await fetch(
          `${kycApiUrl}/rpc/check_kyc?address=${address}`
        );
        const data = await response.json();
        setIsKYC(data.data?.is_kyc || false);
      } catch (error) {
        console.error('KYC check failed:', error);
        setIsKYC(null);
      } finally {
        setLoading(false);
      }
    };

    if (address) {
      checkKYC();
    }
  }, [address, kycApiUrl]);

  if (loading || isKYC === null) {
    return null;
  }

  if (!isKYC) {
    return null;
  }

  return (
    <Tooltip label="KYC Verified Address" placement="top">
      <Badge
        colorScheme="green"
        variant="subtle"
        px={2}
        py={1}
        borderRadius="full"
        display="flex"
        alignItems="center"
      >
        <HStack spacing={1}>
          <Icon as={CheckCircleIcon} boxSize={3} />
          <span>KYC</span>
        </HStack>
      </Badge>
    </Tooltip>
  );
};

export default KYCBadge;
```

### Step 6: Integrate KYC Badge in Address Display

Modify address display component to include badge:

```tsx
// In address display component
import KYCBadge from 'components/KYCBadge/KYCBadge';

const AddressDisplay: React.FC<{ address: string }> = ({ address }) => {
  return (
    <HStack spacing={2}>
      <AddressEntity address={address} />
      <KYCBadge address={address} />
    </HStack>
  );
};
```

### Step 7: Custom Homepage Stats Cards

Create `components/Stats/CustomStatsCards.tsx`:

```tsx
import React from 'react';
import { SimpleGrid, Box, Stat, StatLabel, StatNumber, Icon } from '@chakra-ui/react';
import { FaCube, FaClock, FaExchangeAlt, FaWallet, FaGasPump } from 'react-icons/fa';

interface StatCardProps {
  label: string;
  value: string | number;
  icon: React.ElementType;
}

const StatCard: React.FC<StatCardProps> = ({ label, value, icon }) => (
  <Box
    bg="white"
    p={6}
    borderRadius="xl"
    boxShadow="0 2px 8px rgba(0,0,0,0.08)"
    textAlign="center"
  >
    <Icon as={icon} boxSize={8} color="blue.500" mb={3} />
    <Stat>
      <StatLabel color="gray.500" fontSize="sm">{label}</StatLabel>
      <StatNumber fontSize="2xl" fontWeight="bold" color="gray.800">
        {value}
      </StatNumber>
    </Stat>
  </Box>
);

interface StatsData {
  totalBlocks: number;
  avgBlockTime: string;
  totalTransactions: number;
  totalAddresses: number;
  gasPrice: string;
}

const CustomStatsCards: React.FC<{ stats: StatsData }> = ({ stats }) => {
  return (
    <SimpleGrid columns={{ base: 2, md: 3, lg: 5 }} spacing={4} p={6}>
      <StatCard 
        label="Total Blocks" 
        value={stats.totalBlocks.toLocaleString()} 
        icon={FaCube} 
      />
      <StatCard 
        label="Avg Block Time" 
        value={stats.avgBlockTime} 
        icon={FaClock} 
      />
      <StatCard 
        label="Total Transactions" 
        value={stats.totalTransactions.toLocaleString()} 
        icon={FaExchangeAlt} 
      />
      <StatCard 
        label="Wallet Addresses" 
        value={stats.totalAddresses.toLocaleString()} 
        icon={FaWallet} 
      />
      <StatCard 
        label="Gas Price" 
        value={stats.gasPrice} 
        icon={FaGasPump} 
      />
    </SimpleGrid>
  );
};

export default CustomStatsCards;
```

### Step 8: Build Custom Frontend

```bash
# Create .env.local with your configuration
cp .env.example .env.local
# Edit .env.local with your settings

# Build
npm run build

# Test locally
npm run start
```

### Step 9: Create Docker Image

Create `Dockerfile.custom`:

```dockerfile
FROM node:18-alpine AS builder

WORKDIR /app

COPY package*.json ./
RUN npm ci

COPY . .
RUN npm run build

FROM node:18-alpine AS runner

WORKDIR /app

ENV NODE_ENV production

COPY --from=builder /app/public ./public
COPY --from=builder /app/.next/standalone ./
COPY --from=builder /app/.next/static ./.next/static

EXPOSE 3000

ENV PORT 3000
ENV HOSTNAME "0.0.0.0"

CMD ["node", "server.js"]
```

Build and use:

```bash
# Build custom image
docker build -f Dockerfile.custom -t viddhana-frontend:latest .

# Update docker-compose.yml to use custom image
# services:
#   frontend:
#     image: viddhana-frontend:latest
```

---

## CSS Override Method

For simpler CSS-only customization without rebuilding:

### Step 1: Create Custom CSS File

Create `~/viddhana-chain/blockscout/assets/custom.css`:

```css
/* Viddhana Blockscan Custom Styles */

/* Header Gradient */
.chakra-ui-dark header,
.chakra-ui-light header {
  background: linear-gradient(90deg, #4A90E2 0%, #00C6FF 100%) !important;
}

/* Primary Button Color */
.chakra-button[data-variant="solid"] {
  background: linear-gradient(90deg, #4A90E2 0%, #00C6FF 100%) !important;
}

/* Card Styling */
.chakra-card {
  border-radius: 12px !important;
  box-shadow: 0 2px 8px rgba(0,0,0,0.08) !important;
}

/* Stats Cards */
.stats-card {
  background: white !important;
  border-radius: 16px !important;
  padding: 24px !important;
}

/* Search Bar */
.search-input {
  border-radius: 50px !important;
  background: white !important;
}

/* KYC Badge Styling */
.kyc-badge {
  background-color: #28A745 !important;
  color: white !important;
  border-radius: 20px !important;
  padding: 4px 12px !important;
  font-size: 12px !important;
  font-weight: 600 !important;
}

.kyc-badge::before {
  content: "✓ ";
}

/* Address with KYC */
.address-verified::after {
  content: " ✓ KYC";
  background: #28A745;
  color: white;
  border-radius: 10px;
  padding: 2px 8px;
  font-size: 10px;
  margin-left: 8px;
}

/* Footer Styling */
footer {
  background: #1a1a2e !important;
}

/* Transaction Card */
.tx-card {
  border-left: 4px solid #4A90E2 !important;
}

/* Block Card */
.block-card {
  border-left: 4px solid #00C6FF !important;
}
```

### Step 2: Inject CSS via Docker

Update `docker-compose.yml`:

```yaml
frontend:
  image: ghcr.io/blockscout/frontend:latest
  volumes:
    - ./assets/custom.css:/app/public/custom.css:ro
  environment:
    - NEXT_PUBLIC_CUSTOM_CSS=/custom.css
```

---

## MetaMask Integration

### Add Network Button Component

```tsx
// components/AddNetworkButton.tsx
import React from 'react';
import { Button, useToast } from '@chakra-ui/react';

const VIDDHANA_CHAIN_CONFIG = {
  chainId: '0x539', // 1337 in hex
  chainName: 'Viddhana Chain',
  nativeCurrency: {
    name: 'BTC Diamond',
    symbol: 'BTCD',
    decimals: 18,
  },
  rpcUrls: ['http://localhost:8545'],
  blockExplorerUrls: ['http://localhost:3000'],
};

const AddNetworkButton: React.FC = () => {
  const toast = useToast();

  const addNetwork = async () => {
    if (!window.ethereum) {
      toast({
        title: 'MetaMask not found',
        description: 'Please install MetaMask extension',
        status: 'error',
      });
      return;
    }

    try {
      await window.ethereum.request({
        method: 'wallet_addEthereumChain',
        params: [VIDDHANA_CHAIN_CONFIG],
      });
      toast({
        title: 'Network Added',
        description: 'Viddhana Chain has been added to MetaMask',
        status: 'success',
      });
    } catch (error: any) {
      toast({
        title: 'Error',
        description: error.message,
        status: 'error',
      });
    }
  };

  return (
    <Button
      onClick={addNetwork}
      bg="linear-gradient(90deg, #4A90E2 0%, #00C6FF 100%)"
      color="white"
      borderRadius="full"
      _hover={{ opacity: 0.9 }}
    >
      Add Viddhana to MetaMask
    </Button>
  );
};

export default AddNetworkButton;
```

---

## Real-Time Updates Configuration

### WebSocket Configuration

Ensure WebSocket is properly configured for real-time updates:

```env
# Backend .env
ETHEREUM_JSONRPC_WS_URL=ws://geth-node1:8546
REALTIME_DISABLED=false

# Frontend .env
NEXT_PUBLIC_API_WEBSOCKET_PROTOCOL=ws
```

### Real-Time Event Subscriptions

The frontend automatically subscribes to:
- `blocks:new_block` - New block events
- `transactions:new_transaction` - New transaction events
- `addresses:*` - Address balance updates

---

## Testing Customizations

### Step 1: Visual Testing Checklist

- [ ] Header gradient matches design
- [ ] Logo displays correctly
- [ ] Search bar styling correct
- [ ] Stats cards layout correct
- [ ] Latest blocks/transactions display
- [ ] KYC badge shows for verified addresses
- [ ] Wallet connect button works
- [ ] Mobile responsive layout
- [ ] Dark mode (if enabled)

### Step 2: Functional Testing

```bash
# Test KYC badge API integration
curl "http://localhost:3000/rpc/check_kyc?address=0x..."

# Test WebSocket real-time updates
# Open browser console and check for WebSocket connection

# Test MetaMask integration
# Click "Add Network" and verify in MetaMask
```

---

## Deployment Checklist

- [ ] Custom theme colors applied
- [ ] Logo assets created and hosted
- [ ] Environment variables configured
- [ ] Custom CSS file created (if using CSS override)
- [ ] KYC badge component integrated
- [ ] MetaMask network config correct
- [ ] Real-time WebSocket working
- [ ] Mobile responsiveness verified
- [ ] Performance tested
- [ ] Docker image built (if custom build)

---

## Quick Reference: Environment Variables for Theming

| Variable | Description | Example |
|----------|-------------|---------|
| `NEXT_PUBLIC_HOMEPAGE_PLATE_BACKGROUND` | Header gradient | `linear-gradient(90deg, #4A90E2 0%, #00C6FF 100%)` |
| `NEXT_PUBLIC_HOMEPAGE_PLATE_TEXT_COLOR` | Header text color | `rgba(255, 255, 255, 1)` |
| `NEXT_PUBLIC_NETWORK_LOGO` | Main logo URL | `/assets/logo.svg` |
| `NEXT_PUBLIC_NETWORK_ICON` | Small icon | `/assets/icon.svg` |
| `NEXT_PUBLIC_NETWORK_NAME` | Display name | `Viddhana Blockscan` |

---

## Next Steps

1. Deploy and test customizations
2. Gather user feedback
3. Iterate on design
4. Check `TRACKER.md` for remaining tasks
