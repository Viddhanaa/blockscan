const express = require('express');
const router = express.Router();
const kycService = require('../services/kyc.service');
const { validateAddress } = require('../middleware/validator');
const logger = require('../utils/logger');

/**
 * @route GET /rpc/check_kyc
 * @desc Check if an address has KYC approval (public endpoint)
 * @access Public
 * @query {string} address - Ethereum address to check
 */
router.get('/check_kyc', validateAddress, async (req, res) => {
  try {
    const { validatedAddress } = req;
    
    const isApproved = await kycService.checkKYC(validatedAddress);
    
    logger.info(`KYC check for ${validatedAddress}: ${isApproved}`);
    
    res.json({
      success: true,
      data: {
        address: validatedAddress,
        isKYCApproved: isApproved,
      },
    });
  } catch (error) {
    logger.error('Error in check_kyc:', error);
    res.status(500).json({
      success: false,
      error: 'Internal Server Error',
      message: 'Failed to check KYC status',
    });
  }
});

module.exports = router;
