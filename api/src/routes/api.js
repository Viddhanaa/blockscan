const express = require('express');
const router = express.Router();
const kycService = require('../services/kyc.service');
const { adminAuth } = require('../middleware/auth');
const { validateAddress, validateAddresses } = require('../middleware/validator');
const logger = require('../utils/logger');

/**
 * @route GET /api/kyc_info
 * @desc Get detailed KYC information for an address
 * @access Public
 * @query {string} address - Ethereum address to query
 */
router.get('/kyc_info', validateAddress, async (req, res) => {
  try {
    const { validatedAddress } = req;
    
    const kycInfo = await kycService.getKYCInfo(validatedAddress);
    
    logger.info(`KYC info retrieved for ${validatedAddress}`);
    
    res.json({
      success: true,
      data: kycInfo,
    });
  } catch (error) {
    logger.error('Error in kyc_info:', error);
    res.status(500).json({
      success: false,
      error: 'Internal Server Error',
      message: 'Failed to retrieve KYC information',
    });
  }
});

/**
 * @route GET /api/stats
 * @desc Get KYC statistics
 * @access Public
 */
router.get('/stats', async (req, res) => {
  try {
    const [totalKYCCount, owner] = await Promise.all([
      kycService.getTotalKYCCount(),
      kycService.getOwner(),
    ]);
    
    res.json({
      success: true,
      data: {
        totalKYCApproved: totalKYCCount,
        contractAddress: kycService.contract.target,
        contractOwner: owner,
      },
    });
  } catch (error) {
    logger.error('Error in stats:', error);
    res.status(500).json({
      success: false,
      error: 'Internal Server Error',
      message: 'Failed to retrieve statistics',
    });
  }
});

/**
 * @route POST /api/approve_kyc
 * @desc Approve KYC for an address
 * @access Admin only
 * @body {string} address - Ethereum address to approve
 */
router.post('/approve_kyc', adminAuth, validateAddress, async (req, res) => {
  try {
    const { validatedAddress } = req;
    
    const result = await kycService.setKYC(validatedAddress, true);
    
    logger.info(`KYC approved for ${validatedAddress}`);
    
    res.json({
      success: true,
      message: 'KYC approved successfully',
      data: {
        address: validatedAddress,
        ...result,
      },
    });
  } catch (error) {
    logger.error('Error in approve_kyc:', error);
    res.status(500).json({
      success: false,
      error: 'Internal Server Error',
      message: error.message || 'Failed to approve KYC',
    });
  }
});

/**
 * @route POST /api/revoke_kyc
 * @desc Revoke KYC for an address
 * @access Admin only
 * @body {string} address - Ethereum address to revoke
 */
router.post('/revoke_kyc', adminAuth, validateAddress, async (req, res) => {
  try {
    const { validatedAddress } = req;
    
    const result = await kycService.setKYC(validatedAddress, false);
    
    logger.info(`KYC revoked for ${validatedAddress}`);
    
    res.json({
      success: true,
      message: 'KYC revoked successfully',
      data: {
        address: validatedAddress,
        ...result,
      },
    });
  } catch (error) {
    logger.error('Error in revoke_kyc:', error);
    res.status(500).json({
      success: false,
      error: 'Internal Server Error',
      message: error.message || 'Failed to revoke KYC',
    });
  }
});

/**
 * @route POST /api/batch_kyc
 * @desc Batch set KYC status for multiple addresses
 * @access Admin only
 * @body {string[]} addresses - Array of Ethereum addresses
 * @body {boolean} approve - Whether to approve (true) or revoke (false)
 */
router.post('/batch_kyc', adminAuth, validateAddresses, async (req, res) => {
  try {
    const { validatedAddresses } = req;
    const { approve } = req.body;
    
    if (typeof approve !== 'boolean') {
      return res.status(400).json({
        success: false,
        error: 'Bad Request',
        message: 'approve field must be a boolean',
      });
    }
    
    const result = await kycService.batchSetKYC(validatedAddresses, approve);
    
    logger.info(`Batch KYC ${approve ? 'approved' : 'revoked'} for ${validatedAddresses.length} addresses`);
    
    res.json({
      success: true,
      message: `KYC ${approve ? 'approved' : 'revoked'} for ${validatedAddresses.length} addresses`,
      data: {
        addresses: validatedAddresses,
        ...result,
      },
    });
  } catch (error) {
    logger.error('Error in batch_kyc:', error);
    res.status(500).json({
      success: false,
      error: 'Internal Server Error',
      message: error.message || 'Failed to batch update KYC',
    });
  }
});

module.exports = router;
