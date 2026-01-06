import express from 'express';
import jwt from 'jsonwebtoken';
import { body, validationResult } from 'express-validator';
import { ethers } from 'ethers';
import { verifySignature, authenticateToken } from '../middleware/auth.js';
import blockchainService from '../services/blockchain.js';
import User from '../models/User.js';

const router = express.Router();

/**
 * @route   POST /api/auth/connect
 * @desc    Authenticate user with wallet signature
 * @access  Public
 */
router.post('/connect', [
  body('address').isEthereumAddress().withMessage('Invalid Ethereum address'),
  body('signature').notEmpty().withMessage('Signature is required'),
  body('message').notEmpty().withMessage('Message is required'),
  verifySignature
], async (req, res) => {
  try {
    // Check for validation errors
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        errors: errors.array()
      });
    }

    const { address } = req.body;
    const verifiedAddress = req.verifiedAddress;

    // Get user role from blockchain
    let role = await blockchainService.getUserRole(verifiedAddress);

    // Find or create user in database
    let user = await User.findOne({ address: verifiedAddress });
    
    // If blockchain role is 'user' (default), check database for specific roles
    if (role === 'user' && user) {
      // Check if user has vendor registration
      const Vendor = (await import('../models/Vendor.js')).default;
      const vendorRecord = await Vendor.findOne({ address: verifiedAddress });
      if (vendorRecord) {
        role = 'vendor';
      }
      
      // Check if user has beneficiary application
      const Beneficiary = (await import('../models/Beneficiary.js')).default;
      const beneficiaryRecord = await Beneficiary.findOne({ address: verifiedAddress });
      if (beneficiaryRecord) {
        role = 'beneficiary';
      }
      
      // Use existing database role if available
      if (user.role && user.role !== 'user') {
        role = user.role;
      }
    }

    if (!user) {
      user = new User({
        address: verifiedAddress,
        role,
        lastLogin: new Date()
      });
      await user.save();
    } else {
      // Update last login and role
      user.lastLogin = new Date();
      user.role = role;
      await user.save();
    }

    // Generate JWT token
    const token = jwt.sign(
      { 
        address: verifiedAddress,
        role,
        userId: user._id
      },
      process.env.JWT_SECRET,
      { expiresIn: process.env.JWT_EXPIRES_IN || '7d' }
    );

    res.json({
      success: true,
      data: {
        token,
        user: {
          address: verifiedAddress,
          role,
          id: user._id
        }
      }
    });

  } catch (error) {
    console.error('Authentication error:', error);
    res.status(500).json({
      success: false,
      message: 'Authentication failed'
    });
  }
});

/**
 * @route   GET /api/auth/profile
 * @desc    Get user profile
 * @access  Private
 */
router.get('/profile', authenticateToken, async (req, res) => {
  try {
    const user = await User.findById(req.user.userId);
    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

    // Get updated role from blockchain
    const currentRole = await blockchainService.getUserRole(user.address);
    
    // Update role if it changed
    if (user.role !== currentRole) {
      user.role = currentRole;
      await user.save();
    }

    // Get token balance if user is beneficiary
    let tokenBalance = null;
    let allocation = null;
    
    if (currentRole === 'beneficiary') {
      tokenBalance = await blockchainService.getTokenBalance(user.address);
      allocation = await blockchainService.getBeneficiaryAllocation(user.address);
    }

    res.json({
      success: true,
      data: {
        id: user._id,
        address: user.address,
        role: currentRole,
        tokenBalance,
        allocation,
        createdAt: user.createdAt,
        lastLogin: user.lastLogin
      }
    });
  } catch (error) {
    console.error('Profile fetch error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch profile'
    });
  }
});

/**
 * @route   POST /api/auth/logout
 * @desc    Logout user
 * @access  Private
 */
router.post('/logout', authenticateToken, (req, res) => {
  // Since we're using JWT, logout is handled client-side
  // We could implement token blacklisting here if needed
  res.json({
    success: true,
    message: 'Logged out successfully'
  });
});

/**
 * @route   GET /api/auth/nonce
 * @desc    Get nonce for wallet signature
 * @access  Public
 */
router.get('/nonce/:address', async (req, res) => {
  try {
    const { address } = req.params;
    
    if (!ethers.isAddress(address)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid Ethereum address'
      });
    }

    const nonce = Math.floor(Math.random() * 1000000);
    const timestamp = Date.now();
    
    const message = JSON.stringify({
      domain: 'disaster-relief.app',
      address: address.toLowerCase(),
      statement: 'Sign this message to authenticate with Disaster Relief Platform',
      nonce,
      timestamp,
      version: '1'
    });

    res.json({
      success: true,
      data: {
        message,
        nonce,
        timestamp
      }
    });
  } catch (error) {
    console.error('Nonce generation error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to generate nonce'
    });
  }
});

export default router;