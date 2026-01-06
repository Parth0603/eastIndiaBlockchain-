import jwt from 'jsonwebtoken';
import { ethers } from 'ethers';

/**
 * Middleware to verify JWT token and extract user information
 */
export const authenticateToken = (req, res, next) => {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1]; // Bearer TOKEN

  if (!token) {
    return res.status(401).json({
      success: false,
      message: 'Access token required'
    });
  }

  jwt.verify(token, process.env.JWT_SECRET, (err, user) => {
    if (err) {
      return res.status(403).json({
        success: false,
        message: 'Invalid or expired token'
      });
    }
    
    req.user = user;
    next();
  });
};

/**
 * Middleware to verify wallet signature
 */
export const verifySignature = (req, res, next) => {
  try {
    const { address, signature, message } = req.body;

    if (!address || !signature || !message) {
      return res.status(400).json({
        success: false,
        message: 'Address, signature, and message are required'
      });
    }

    // Verify the signature
    const recoveredAddress = ethers.verifyMessage(message, signature);
    
    if (recoveredAddress.toLowerCase() !== address.toLowerCase()) {
      return res.status(401).json({
        success: false,
        message: 'Invalid signature'
      });
    }

    // Check if message is recent (within 5 minutes)
    const messageData = JSON.parse(message);
    const timestamp = messageData.timestamp;
    const now = Date.now();
    const fiveMinutes = 5 * 60 * 1000;

    if (now - timestamp > fiveMinutes) {
      return res.status(401).json({
        success: false,
        message: 'Message expired'
      });
    }

    req.verifiedAddress = address.toLowerCase();
    next();
  } catch (error) {
    console.error('Signature verification error:', error);
    return res.status(401).json({
      success: false,
      message: 'Signature verification failed'
    });
  }
};

/**
 * Role-based access control middleware
 */
export const requireRole = (roles) => {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({
        success: false,
        message: 'Authentication required'
      });
    }

    const userRole = req.user.role;
    const allowedRoles = Array.isArray(roles) ? roles : [roles];

    if (!allowedRoles.includes(userRole)) {
      return res.status(403).json({
        success: false,
        message: `Access denied. Required role: ${allowedRoles.join(' or ')}`
      });
    }

    next();
  };
};

/**
 * Admin only access middleware
 */
export const requireAdmin = requireRole('admin');

/**
 * Verifier or Admin access middleware
 */
export const requireVerifier = requireRole(['admin', 'verifier']);

/**
 * Beneficiary access middleware
 */
export const requireBeneficiary = requireRole(['admin', 'beneficiary']);

/**
 * Vendor access middleware
 */
export const requireVendor = requireRole(['admin', 'vendor']);