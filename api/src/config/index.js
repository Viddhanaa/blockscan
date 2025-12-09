const path = require('path');

// Only load .env file in development - in production, use system environment variables
if (process.env.NODE_ENV !== 'production') {
  require('dotenv').config({ path: path.join(__dirname, '../../.env') });
}

const config = {
  // Server
  port: parseInt(process.env.PORT, 10) || 3000,
  nodeEnv: process.env.NODE_ENV || 'development',

  // Blockchain - HTTP RPC
  rpcUrl: process.env.RPC_URL || 'http://localhost:8545',
  chainId: parseInt(process.env.CHAIN_ID, 10) || 1337,
  kycContractAddress: process.env.KYC_CONTRACT_ADDRESS,
  adminPrivateKey: process.env.ADMIN_PRIVATE_KEY,

  // Blockchain - WebSocket RPC
  wsUrl: process.env.WS_URL || null,
  wsReconnectInterval: parseInt(process.env.WS_RECONNECT_INTERVAL, 10) || 5000,
  wsMaxReconnectAttempts: parseInt(process.env.WS_MAX_RECONNECT_ATTEMPTS, 10) || 10,

  // Security
  apiKey: process.env.API_KEY,

  // CORS
  cors: {
    origin: process.env.CORS_ORIGIN || '*',
    methods: process.env.CORS_METHODS || 'GET,POST,PUT,DELETE,OPTIONS',
    allowedHeaders: process.env.CORS_ALLOWED_HEADERS || 'Content-Type,Authorization,X-API-Key',
  },

  // Rate Limiting
  rateLimit: {
    windowMs: parseInt(process.env.RATE_LIMIT_WINDOW_MS, 10) || 15 * 60 * 1000, // 15 minutes
    maxRequests: parseInt(process.env.RATE_LIMIT_MAX_REQUESTS, 10) || 100,
  },

  // Logging
  logLevel: process.env.LOG_LEVEL || 'info',
};

// Validation - check config values directly
const validateConfig = () => {
  if (!config.kycContractAddress) {
    console.error('Error: KYC_CONTRACT_ADDRESS is required');
    process.exit(1);
  }

  // Enforce security-critical env vars in production
  if (config.nodeEnv === 'production') {
    const missingProdVars = [];
    if (!config.adminPrivateKey) missingProdVars.push('ADMIN_PRIVATE_KEY');
    if (!config.apiKey) missingProdVars.push('API_KEY');

    if (missingProdVars.length > 0) {
      console.error(`Error: Missing required production environment variables: ${missingProdVars.join(', ')}`);
      process.exit(1);
    }
  }
};

validateConfig();

module.exports = config;
