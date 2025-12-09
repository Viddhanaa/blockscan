const { ethers } = require('ethers');
const config = require('../config');
const logger = require('../utils/logger');
const kycArtifact = require('../../abi/ViddhanaKYC.json');
const kycAbi = kycArtifact.abi || kycArtifact;

// Validate ABI format at module load time
if (!Array.isArray(kycAbi)) {
  throw new Error('Invalid ABI format: expected array, got ' + typeof kycAbi);
}

class KYCService {
  constructor() {
    this.provider = null;
    this.wsProvider = null;
    this.contract = null;
    this.wallet = null;
    this.contractWithSigner = null;
    this.initialized = false;
    this.wsReconnectAttempts = 0;
    this.wsMaxReconnectAttempts = parseInt(process.env.WS_MAX_RECONNECT_ATTEMPTS, 10) || 10;
    this.wsReconnectInterval = parseInt(process.env.WS_RECONNECT_INTERVAL, 10) || 5000;
    this.wsReconnectTimer = null;
    this.isReconnecting = false;
  }

  async initialize() {
    if (this.initialized) return;

    try {
      // Connect to the blockchain via HTTP RPC (primary)
      this.provider = new ethers.JsonRpcProvider(config.rpcUrl);
      
      // Verify connection
      const network = await this.provider.getNetwork();
      logger.info(`Connected to network: ${network.name} (chainId: ${network.chainId})`);

      // Initialize WebSocket provider for real-time updates if WS_URL is configured
      if (config.wsUrl) {
        await this.initializeWebSocketProvider();
      }

      // Create read-only contract instance
      this.contract = new ethers.Contract(
        config.kycContractAddress,
        kycAbi,
        this.provider
      );

      // Create wallet and contract with signer for write operations
      if (config.adminPrivateKey) {
        this.wallet = new ethers.Wallet(config.adminPrivateKey, this.provider);
        this.contractWithSigner = this.contract.connect(this.wallet);
        logger.info(`Admin wallet initialized: ${this.wallet.address}`);
      } else {
        logger.warn('No admin private key configured - write operations will be unavailable');
      }

      this.initialized = true;
      logger.info('KYC Service initialized successfully');
    } catch (error) {
      logger.error('Failed to initialize KYC Service:', error);
      throw error;
    }
  }

  /**
   * Initialize WebSocket provider with automatic reconnection
   */
  async initializeWebSocketProvider() {
    try {
      logger.info(`Connecting to WebSocket: ${config.wsUrl}`);
      
      this.wsProvider = new ethers.WebSocketProvider(config.wsUrl);
      
      // Handle WebSocket events
      this.wsProvider.websocket.on('open', () => {
        logger.info('WebSocket connection established');
        this.wsReconnectAttempts = 0;
        this.isReconnecting = false;
      });

      this.wsProvider.websocket.on('close', (code, reason) => {
        logger.warn(`WebSocket closed: code=${code}, reason=${reason}`);
        this.handleWebSocketDisconnect();
      });

      this.wsProvider.websocket.on('error', (error) => {
        logger.error('WebSocket error:', error.message);
        this.handleWebSocketDisconnect();
      });

      // Verify WebSocket connection
      const wsNetwork = await this.wsProvider.getNetwork();
      logger.info(`WebSocket connected to network: ${wsNetwork.name} (chainId: ${wsNetwork.chainId})`);
      
      // Setup event listeners for KYC contract updates
      this.setupContractEventListeners();
      
    } catch (error) {
      logger.error('Failed to initialize WebSocket provider:', error.message);
      // Don't throw - fall back to HTTP provider
      this.scheduleWebSocketReconnect();
    }
  }

  /**
   * Handle WebSocket disconnection
   */
  handleWebSocketDisconnect() {
    if (this.isReconnecting) return;
    this.isReconnecting = true;
    
    // Clean up existing WebSocket provider
    if (this.wsProvider) {
      try {
        this.wsProvider.destroy();
      } catch (e) {
        // Ignore cleanup errors
      }
      this.wsProvider = null;
    }
    
    this.scheduleWebSocketReconnect();
  }

  /**
   * Schedule WebSocket reconnection with exponential backoff
   */
  scheduleWebSocketReconnect() {
    if (this.wsReconnectAttempts >= this.wsMaxReconnectAttempts) {
      logger.error(`WebSocket reconnection failed after ${this.wsMaxReconnectAttempts} attempts. Using HTTP fallback.`);
      this.isReconnecting = false;
      return;
    }

    // Clear any existing timer
    if (this.wsReconnectTimer) {
      clearTimeout(this.wsReconnectTimer);
    }

    // Exponential backoff: 5s, 10s, 20s, 40s... up to 5 minutes max
    const delay = Math.min(
      this.wsReconnectInterval * Math.pow(2, this.wsReconnectAttempts),
      5 * 60 * 1000
    );

    logger.info(`Scheduling WebSocket reconnection in ${delay / 1000}s (attempt ${this.wsReconnectAttempts + 1}/${this.wsMaxReconnectAttempts})`);

    this.wsReconnectTimer = setTimeout(async () => {
      this.wsReconnectAttempts++;
      await this.initializeWebSocketProvider();
    }, delay);
  }

  /**
   * Setup contract event listeners for real-time updates
   */
  setupContractEventListeners() {
    if (!this.wsProvider || !config.kycContractAddress) return;

    try {
      const wsContract = new ethers.Contract(
        config.kycContractAddress,
        kycAbi,
        this.wsProvider
      );

      // Listen for KYC status updates
      wsContract.on('KYCUpdated', (address, status, timestamp, event) => {
        logger.info(`[WS Event] KYC Updated: address=${address}, status=${status}, timestamp=${timestamp}`);
      });

      // Listen for batch KYC updates
      wsContract.on('BatchKYCUpdated', (addresses, status, timestamp, event) => {
        logger.info(`[WS Event] Batch KYC Updated: count=${addresses.length}, status=${status}`);
      });

      logger.info('Contract event listeners initialized');
    } catch (error) {
      logger.error('Failed to setup contract event listeners:', error.message);
    }
  }

  /**
   * Get the best available provider (prefer WebSocket if available)
   */
  getProvider() {
    if (this.wsProvider && this.wsProvider.websocket.readyState === 1) {
      return this.wsProvider;
    }
    return this.provider;
  }

  /**
   * Get WebSocket connection status
   */
  getWebSocketStatus() {
    return {
      enabled: !!config.wsUrl,
      connected: this.wsProvider && this.wsProvider.websocket.readyState === 1,
      reconnectAttempts: this.wsReconnectAttempts,
      maxReconnectAttempts: this.wsMaxReconnectAttempts,
    };
  }

  /**
   * Check if an address has KYC approval
   * @param {string} address - Ethereum address to check
   * @returns {Promise<boolean>} - True if KYC approved
   */
  async checkKYC(address) {
    await this.ensureInitialized();
    
    try {
      const isApproved = await this.contract.isKYC(address);
      logger.debug(`KYC check for ${address}: ${isApproved}`);
      return isApproved;
    } catch (error) {
      logger.error(`Error checking KYC for ${address}:`, error);
      throw error;
    }
  }

  /**
   * Get detailed KYC information for an address
   * @param {string} address - Ethereum address to query
   * @returns {Promise<object>} - KYC details
   */
  async getKYCInfo(address) {
    await this.ensureInitialized();
    
    try {
      const [isApproved, approvedAt] = await this.contract.getKYCInfo(address);
      
      return {
        address,
        isApproved,
        approvedAt: approvedAt > 0n ? new Date(Number(approvedAt) * 1000).toISOString() : null,
        approvedAtTimestamp: Number(approvedAt),
      };
    } catch (error) {
      logger.error(`Error getting KYC info for ${address}:`, error);
      throw error;
    }
  }

  /**
   * Set KYC status for an address
   * @param {string} address - Ethereum address
   * @param {boolean} status - KYC approval status
   * @returns {Promise<object>} - Transaction receipt
   */
  async setKYC(address, status) {
    await this.ensureInitialized();
    this.ensureSignerAvailable();

    try {
      logger.info(`Setting KYC for ${address} to ${status}`);
      
      const tx = await this.contractWithSigner.setKYC(address, status);
      logger.info(`Transaction sent: ${tx.hash}`);
      
      const receipt = await tx.wait();
      logger.info(`Transaction confirmed in block ${receipt.blockNumber}`);
      
      return {
        success: true,
        transactionHash: tx.hash,
        blockNumber: receipt.blockNumber,
        gasUsed: receipt.gasUsed.toString(),
      };
    } catch (error) {
      logger.error(`Error setting KYC for ${address}:`, error);
      throw this.parseContractError(error);
    }
  }

  /**
   * Batch set KYC status for multiple addresses
   * @param {string[]} addresses - Array of Ethereum addresses
   * @param {boolean} status - KYC approval status
   * @returns {Promise<object>} - Transaction receipt
   */
  async batchSetKYC(addresses, status) {
    await this.ensureInitialized();
    this.ensureSignerAvailable();

    try {
      logger.info(`Batch setting KYC for ${addresses.length} addresses to ${status}`);
      
      const tx = await this.contractWithSigner.batchSetKYC(addresses, status);
      logger.info(`Transaction sent: ${tx.hash}`);
      
      const receipt = await tx.wait();
      logger.info(`Transaction confirmed in block ${receipt.blockNumber}`);
      
      return {
        success: true,
        transactionHash: tx.hash,
        blockNumber: receipt.blockNumber,
        gasUsed: receipt.gasUsed.toString(),
        addressCount: addresses.length,
      };
    } catch (error) {
      logger.error(`Error batch setting KYC:`, error);
      throw this.parseContractError(error);
    }
  }

  /**
   * Get total count of KYC approved addresses
   * @returns {Promise<number>} - Total count
   */
  async getTotalKYCCount() {
    await this.ensureInitialized();
    
    try {
      const count = await this.contract.totalKYCCount();
      return Number(count);
    } catch (error) {
      logger.error('Error getting total KYC count:', error);
      throw error;
    }
  }

  /**
   * Get contract owner address
   * @returns {Promise<string>} - Owner address
   */
  async getOwner() {
    await this.ensureInitialized();
    
    try {
      return await this.contract.owner();
    } catch (error) {
      logger.error('Error getting contract owner:', error);
      throw error;
    }
  }

  /**
   * Ensure service is initialized
   */
  async ensureInitialized() {
    if (!this.initialized) {
      await this.initialize();
    }
  }

  /**
   * Ensure signer is available for write operations
   */
  ensureSignerAvailable() {
    if (!this.contractWithSigner) {
      throw new Error('Admin wallet not configured - cannot perform write operations');
    }
  }

  /**
   * Parse contract errors into user-friendly messages
   */
  parseContractError(error) {
    if (error.reason) {
      return new Error(`Contract error: ${error.reason}`);
    }
    if (error.code === 'INSUFFICIENT_FUNDS') {
      return new Error('Insufficient funds for transaction');
    }
    if (error.code === 'UNPREDICTABLE_GAS_LIMIT') {
      return new Error('Transaction would fail - check if address is valid and caller has permission');
    }
    return error;
  }
}

// Export singleton instance
module.exports = new KYCService();
