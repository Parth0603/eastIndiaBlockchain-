import express from 'express';
import jwt from 'jsonwebtoken';
import { body, validationResult } from 'express-validator';

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

    const { address, signature, message } = req.body;

    // TODO: Verify signature with Web3
    // For now, we'll create a mock authentication
    
    // Generate JWT token
    const token = jwt.sign(
      { 
        address: address.toLowerCase(),
        role: 'user' // Default role, will be determined by smart contract
      },
      process.env.JWT_SECRET,
      { expiresIn: process.env.JWT_EXPIRES_IN || '7d' }
    );

    res.json({
      success: true,
      data: {
        token,
        user: {
          address: address.toLowerCase(),
          role: 'user'
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
router.get('/profile', async (req, res) => {
  try {
    // TODO: Get user profile from database and blockchain
    res.json({
      success: true,
      data: {
        address: req.user?.address,
        role: req.user?.role || 'user'
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
router.post('/logout', (req, res) => {
  // Since we're using JWT, logout is handled client-side
  res.json({
    success: true,
    message: 'Logged out successfully'
  });
});

export default router;