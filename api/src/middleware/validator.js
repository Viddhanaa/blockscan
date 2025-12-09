const { ethers } = require('ethers');
const logger = require('../utils/logger');

/**
 * Validate a single Ethereum address
 */
const validateAddress = (req, res, next) => {
  const address = req.query.address || req.body.address;

  if (!address) {
    return res.status(400).json({
      success: false,
      error: 'Bad Request',
      message: 'Address is required',
    });
  }

  if (!ethers.isAddress(address)) {
    logger.warn(`Invalid address provided: ${address}`);
    return res.status(400).json({
      success: false,
      error: 'Bad Request',
      message: 'Invalid Ethereum address format',
    });
  }

  // Normalize to checksum address
  req.validatedAddress = ethers.getAddress(address);
  next();
};

/**
 * Validate an array of Ethereum addresses
 */
const validateAddresses = (req, res, next) => {
  const { addresses } = req.body;

  if (!addresses) {
    return res.status(400).json({
      success: false,
      error: 'Bad Request',
      message: 'Addresses array is required',
    });
  }

  if (!Array.isArray(addresses)) {
    return res.status(400).json({
      success: false,
      error: 'Bad Request',
      message: 'Addresses must be an array',
    });
  }

  if (addresses.length === 0) {
    return res.status(400).json({
      success: false,
      error: 'Bad Request',
      message: 'Addresses array cannot be empty',
    });
  }

  if (addresses.length > 100) {
    return res.status(400).json({
      success: false,
      error: 'Bad Request',
      message: 'Maximum 100 addresses allowed per request',
    });
  }

  const invalidAddresses = [];
  const validatedAddresses = [];

  for (const address of addresses) {
    if (!ethers.isAddress(address)) {
      invalidAddresses.push(address);
    } else {
      validatedAddresses.push(ethers.getAddress(address));
    }
  }

  if (invalidAddresses.length > 0) {
    logger.warn(`Invalid addresses provided: ${invalidAddresses.join(', ')}`);
    return res.status(400).json({
      success: false,
      error: 'Bad Request',
      message: 'Invalid Ethereum address format',
      invalidAddresses,
    });
  }

  req.validatedAddresses = validatedAddresses;
  next();
};

module.exports = {
  validateAddress,
  validateAddresses,
};
