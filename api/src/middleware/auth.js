const crypto = require('crypto');
const config = require('../config');
const logger = require('../utils/logger');

/**
 * Admin authentication middleware
 * Checks for valid API key in X-API-Key header
 */
const adminAuth = (req, res, next) => {
  const apiKey = req.headers['x-api-key'];

  // Check if API key is configured - REJECT requests if not configured
  if (!config.apiKey) {
    logger.error('API_KEY not configured - rejecting request');
    return res.status(500).json({
      success: false,
      error: 'Internal Server Error',
      message: 'Server authentication is not properly configured',
    });
  }

  // Check if API key is provided
  if (!apiKey) {
    logger.warn(`Unauthorized access attempt from ${req.ip} - missing API key`);
    return res.status(401).json({
      success: false,
      error: 'Unauthorized',
      message: 'API key is required. Provide it in the X-API-Key header.',
    });
  }

  // Validate API key using timing-safe comparison to prevent timing attacks
  const providedKeyBuffer = Buffer.from(apiKey);
  const configKeyBuffer = Buffer.from(config.apiKey);
  
  const isValidKey = providedKeyBuffer.length === configKeyBuffer.length &&
    crypto.timingSafeEqual(providedKeyBuffer, configKeyBuffer);

  if (!isValidKey) {
    logger.warn(`Unauthorized access attempt from ${req.ip} - invalid API key`);
    return res.status(403).json({
      success: false,
      error: 'Forbidden',
      message: 'Invalid API key',
    });
  }

  logger.debug(`Admin authenticated from ${req.ip}`);
  next();
};

module.exports = { adminAuth };
