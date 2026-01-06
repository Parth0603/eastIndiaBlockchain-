import express from 'express';
import multer from 'multer';
import path from 'path';
import fs from 'fs';
import { authenticateToken } from '../middleware/auth.js';
import { requireVendor, requireVerifier, requireAdmin } from '../middleware/auth.js';
import Vendor from '../models/Vendor.js';
import User from '../models/User.js';
import Transaction from '../models/Transaction.js';
import { validateVendorRegistration, validateVendorUpdate } from '../services/validation.js';
import fraudDetectionService from '../services/fraudDetection.js';

const router = express.Router();

// Configure multer for file uploads
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    const uploadDir = 'backend/uploads/vendor-documents';
    if (!fs.existsSync(uploadDir)) {
      fs.mkdirSync(uploadDir, { recursive: true });
    }
    cb(null, uploadDir);
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, `${req.user.address}-${uniqueSuffix}${path.extname(file.originalname)}`);
  }
});

const upload = multer({
  storage,
  limits: {
    fileSize: 10 * 1024 * 1024, // 10MB limit
    files: 10 // Maximum 10 files
  },
  fileFilter: (req, file, cb) => {
    const allowedTypes = /jpeg|jpg|png|pdf|doc|docx/;
    const extname = allowedTypes.test(path.extname(file.originalname).toLowerCase());
    const mimetype = allowedTypes.test(file.mimetype);

    if (mimetype && extname) {
      return cb(null, true);
    } else {
      cb(new Error('Only images and documents are allowed'));
    }
  }
});

/**
 * @route   POST /api/vendors/register
 * @desc    Register as a vendor
 * @access  Private (Any authenticated user)
 */
router.post('/register',
  authenticateToken,
  upload.array('documents', 10),
  async (req, res) => {
    try {
      const vendorAddress = req.user.address;

      // Check if vendor already exists
      const existingVendor = await Vendor.findOne({ address: vendorAddress });
      if (existingVendor) {
        return res.status(400).json({
          success: false,
          message: 'Vendor registration already exists'
        });
      }

      // Validate input data
      const validationResult = validateVendorRegistration(req.body);
      if (!validationResult.isValid) {
        return res.status(400).json({
          success: false,
          message: 'Validation failed',
          errors: validationResult.errors
        });
      }

      // Process uploaded documents
      const documents = req.files ? req.files.map(file => ({
        filename: file.filename,
        originalName: file.originalname,
        path: file.path,
        mimetype: file.mimetype,
        size: file.size,
        documentType: req.body[`documentType_${file.fieldname}`] || 'other'
      })) : [];

      // Create vendor record
      const vendor = new Vendor({
        address: vendorAddress,
        businessName: req.body.businessName,
        businessType: req.body.businessType,
        businessLicense: req.body.businessLicense,
        description: req.body.description,
        email: req.body.email,
        phone: req.body.phone,
        address_line1: req.body.address_line1,
        address_line2: req.body.address_line2,
        city: req.body.city,
        state: req.body.state,
        zipCode: req.body.zipCode,
        country: req.body.country || 'US',
        requestedCategories: req.body.requestedCategories || [],
        documents
      });

      await vendor.save();

      // Update user role to vendor
      await User.findOneAndUpdate(
        { address: vendorAddress },
        { 
          role: 'vendor',
          'profile.name': req.body.businessName,
          'profile.email': req.body.email,
          'profile.verificationStatus': 'pending'
        },
        { upsert: true }
      );

      // Emit real-time notification
      const io = req.app.get('io');
      io.emit('vendor-registered', {
        vendorId: vendor._id,
        businessName: vendor.businessName,
        address: vendorAddress
      });

      res.status(201).json({
        success: true,
        message: 'Vendor registration submitted successfully',
        data: {
          vendorId: vendor._id,
          status: vendor.status,
          businessName: vendor.businessName
        }
      });

    } catch (error) {
      console.error('Vendor registration error:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to register vendor',
        error: error.message
      });
    }
  }
);

/**
 * @route   GET /api/vendors/profile
 * @desc    Get vendor profile
 * @access  Private (Vendor only)
 */
router.get('/profile',
  authenticateToken,
  requireVendor,
  async (req, res) => {
    try {
      const vendor = await Vendor.findOne({ address: req.user.address });
      
      if (!vendor) {
        return res.status(404).json({
          success: false,
          message: 'Vendor profile not found'
        });
      }

      res.json({
        success: true,
        data: vendor
      });

    } catch (error) {
      console.error('Get vendor profile error:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to get vendor profile',
        error: error.message
      });
    }
  }
);

/**
 * @route   PUT /api/vendors/profile
 * @desc    Update vendor profile
 * @access  Private (Vendor only)
 */
router.put('/profile',
  authenticateToken,
  requireVendor,
  upload.array('newDocuments', 5),
  async (req, res) => {
    try {
      const vendor = await Vendor.findOne({ address: req.user.address });
      
      if (!vendor) {
        return res.status(404).json({
          success: false,
          message: 'Vendor profile not found'
        });
      }

      // Validate update data
      const validationResult = validateVendorUpdate(req.body);
      if (!validationResult.isValid) {
        return res.status(400).json({
          success: false,
          message: 'Validation failed',
          errors: validationResult.errors
        });
      }

      // Process new documents if uploaded
      if (req.files && req.files.length > 0) {
        const newDocuments = req.files.map(file => ({
          filename: file.filename,
          originalName: file.originalname,
          path: file.path,
          mimetype: file.mimetype,
          size: file.size,
          documentType: req.body[`documentType_${file.fieldname}`] || 'other'
        }));
        vendor.documents.push(...newDocuments);
      }

      // Update allowed fields
      const allowedUpdates = [
        'businessName', 'businessType', 'businessLicense', 'description',
        'email', 'phone', 'address_line1', 'address_line2', 'city', 
        'state', 'zipCode', 'country', 'requestedCategories'
      ];

      allowedUpdates.forEach(field => {
        if (req.body[field] !== undefined) {
          vendor[field] = req.body[field];
        }
      });

      // If vendor was rejected and is updating, reset status to pending
      if (vendor.status === 'rejected') {
        vendor.status = 'pending';
        vendor.reviewNotes = '';
      }

      await vendor.save();

      // Update user profile
      await User.findOneAndUpdate(
        { address: req.user.address },
        { 
          'profile.name': vendor.businessName,
          'profile.email': vendor.email
        }
      );

      res.json({
        success: true,
        message: 'Vendor profile updated successfully',
        data: vendor
      });

    } catch (error) {
      console.error('Update vendor profile error:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to update vendor profile',
        error: error.message
      });
    }
  }
);

/**
 * @route   GET /api/vendors/transactions
 * @desc    Get vendor transaction history
 * @access  Private (Vendor only)
 */
router.get('/transactions',
  authenticateToken,
  requireVendor,
  async (req, res) => {
    try {
      const { page = 1, limit = 20, category, status } = req.query;
      const skip = (page - 1) * limit;

      // Build query
      const query = {
        to: req.user.address,
        type: { $in: ['spending', 'vendor_payment'] }
      };

      if (category) query.category = category;
      if (status) query.status = status;

      const transactions = await Transaction.find(query)
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(parseInt(limit))
        .lean();

      const total = await Transaction.countDocuments(query);

      // Calculate summary statistics
      const summary = await Transaction.aggregate([
        { $match: { to: req.user.address, type: { $in: ['spending', 'vendor_payment'] } } },
        {
          $group: {
            _id: null,
            totalAmount: { $sum: { $toDouble: '$amount' } },
            totalTransactions: { $sum: 1 },
            avgTransaction: { $avg: { $toDouble: '$amount' } }
          }
        }
      ]);

      res.json({
        success: true,
        data: {
          transactions: transactions.map(tx => ({
            id: tx._id,
            amount: (parseFloat(tx.amount) / Math.pow(10, 18)).toFixed(2),
            category: tx.category,
            status: tx.status,
            from: tx.from,
            transactionHash: tx.txHash,
            timestamp: tx.createdAt,
            beneficiaryName: tx.metadata?.beneficiaryName,
            description: tx.metadata?.description,
            receiptHash: tx.metadata?.receiptHash
          })),
          pagination: {
            page: parseInt(page),
            limit: parseInt(limit),
            total,
            pages: Math.ceil(total / limit)
          },
          summary: summary[0] || {
            totalAmount: 0,
            totalTransactions: 0,
            avgTransaction: 0
          }
        }
      });

    } catch (error) {
      console.error('Get vendor transactions error:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to get vendor transactions',
        error: error.message
      });
    }
  }
);

/**
 * @route   POST /api/vendors/validate-purchase
 * @desc    Validate a purchase request from beneficiary
 * @access  Private (Vendor only)
 */
router.post('/validate-purchase',
  authenticateToken,
  requireVendor,
  async (req, res) => {
    try {
      const { beneficiaryAddress, amount, category, items, receiptData } = req.body;

      // Validate vendor is approved for this category
      const vendor = await Vendor.findOne({ address: req.user.address });
      if (!vendor || !vendor.isApprovedForCategory(category)) {
        return res.status(403).json({
          success: false,
          message: 'Vendor not approved for this category'
        });
      }

      // Validate beneficiary exists and has sufficient funds
      const beneficiary = await User.findOne({ 
        address: beneficiaryAddress.toLowerCase(),
        role: 'beneficiary'
      });

      if (!beneficiary) {
        return res.status(404).json({
          success: false,
          message: 'Beneficiary not found'
        });
      }

      // Prepare transaction data for fraud analysis
      const transactionData = {
        from: beneficiaryAddress.toLowerCase(),
        to: req.user.address,
        amount: (parseFloat(amount) * Math.pow(10, 18)).toString(),
        category,
        type: 'vendor_payment'
      };

      // Run fraud detection analysis
      const fraudAnalysis = await fraudDetectionService.analyzeTransaction(transactionData);

      // Handle fraud detection results
      if (fraudAnalysis.recommendation.action === 'block') {
        return res.status(403).json({
          success: false,
          message: 'Transaction blocked due to fraud risk',
          fraudAnalysis: {
            riskLevel: fraudAnalysis.riskLevel,
            flags: fraudAnalysis.flags.map(f => f.description)
          }
        });
      }

      // Create transaction with fraud metadata
      const transaction = new Transaction({
        type: 'vendor_payment',
        from: beneficiaryAddress.toLowerCase(),
        to: req.user.address,
        amount: transactionData.amount,
        category,
        status: fraudAnalysis.recommendation.action === 'review' ? 'pending' : 'pending',
        txHash: '0x' + Math.random().toString(16).substr(2, 64), // Mock hash
        metadata: {
          items: items || [],
          receiptData: receiptData || {},
          vendorName: vendor.businessName,
          beneficiaryName: beneficiary.profile?.name || 'Unknown',
          // Fraud detection metadata
          fraudFlags: fraudAnalysis.flags,
          riskLevel: fraudAnalysis.riskLevel,
          requiresReview: fraudAnalysis.recommendation.requiresReview
        }
      });

      await transaction.save();

      // If high risk, flag vendor and create fraud report
      if (fraudAnalysis.riskLevel === 'high' || fraudAnalysis.riskLevel === 'critical') {
        await fraudDetectionService.flagVendor(
          req.user.address,
          `Suspicious transaction pattern detected`,
          fraudAnalysis.riskLevel,
          'system'
        );
      }

      // Emit real-time notification
      const io = req.app.get('io');
      io.emit('purchase-validated', {
        transactionId: transaction._id,
        beneficiary: beneficiaryAddress,
        vendor: req.user.address,
        amount,
        category,
        riskLevel: fraudAnalysis.riskLevel,
        requiresReview: fraudAnalysis.recommendation.requiresReview
      });

      res.json({
        success: true,
        message: fraudAnalysis.recommendation.requiresReview 
          ? 'Purchase requires manual review before processing'
          : 'Purchase validated successfully',
        data: {
          transactionId: transaction._id,
          status: transaction.status,
          riskLevel: fraudAnalysis.riskLevel,
          requiresReview: fraudAnalysis.recommendation.requiresReview,
          estimatedConfirmation: fraudAnalysis.recommendation.requiresReview ? 'Pending review' : '2-5 minutes'
        }
      });

    } catch (error) {
      console.error('Validate purchase error:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to validate purchase',
        error: error.message
      });
    }
  }
);

/**
 * @route   GET /api/vendors/categories
 * @desc    Get vendor's approved categories
 * @access  Private (Vendor only)
 */
router.get('/categories',
  authenticateToken,
  requireVendor,
  async (req, res) => {
    try {
      const vendor = await Vendor.findOne({ address: req.user.address });
      
      if (!vendor) {
        return res.status(404).json({
          success: false,
          message: 'Vendor profile not found'
        });
      }

      res.json({
        success: true,
        data: {
          approvedCategories: vendor.approvedCategories,
          requestedCategories: vendor.requestedCategories,
          status: vendor.status
        }
      });

    } catch (error) {
      console.error('Get vendor categories error:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to get vendor categories',
        error: error.message
      });
    }
  }
);

/**
 * @route   GET /api/vendors/dashboard-stats
 * @desc    Get vendor dashboard statistics
 * @access  Private (Vendor only)
 */
router.get('/dashboard-stats',
  authenticateToken,
  requireVendor,
  async (req, res) => {
    try {
      const vendorAddress = req.user.address;

      // Get basic stats
      const [vendor, transactionStats, recentTransactions] = await Promise.all([
        Vendor.findOne({ address: vendorAddress }),
        Transaction.aggregate([
          { $match: { to: vendorAddress, type: { $in: ['spending', 'vendor_payment'] } } },
          {
            $group: {
              _id: null,
              totalAmount: { $sum: { $toDouble: '$amount' } },
              totalTransactions: { $sum: 1 },
              confirmedTransactions: {
                $sum: { $cond: [{ $eq: ['$status', 'confirmed'] }, 1, 0] }
              }
            }
          }
        ]),
        Transaction.find({ 
          to: vendorAddress, 
          type: { $in: ['spending', 'vendor_payment'] } 
        })
          .sort({ createdAt: -1 })
          .limit(5)
          .lean()
      ]);

      // Calculate monthly revenue
      const monthlyRevenue = await Transaction.aggregate([
        {
          $match: {
            to: vendorAddress,
            type: { $in: ['spending', 'vendor_payment'] },
            status: 'confirmed',
            createdAt: { $gte: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000) }
          }
        },
        {
          $group: {
            _id: { $dateToString: { format: '%Y-%m-%d', date: '$createdAt' } },
            amount: { $sum: { $toDouble: '$amount' } }
          }
        },
        { $sort: { _id: 1 } }
      ]);

      const stats = transactionStats[0] || {
        totalAmount: 0,
        totalTransactions: 0,
        confirmedTransactions: 0
      };

      res.json({
        success: true,
        data: {
          vendor: {
            businessName: vendor?.businessName,
            status: vendor?.status,
            approvedCategories: vendor?.approvedCategories || [],
            verificationStatusDisplay: vendor?.verificationStatusDisplay
          },
          stats: {
            totalRevenue: (stats.totalAmount / Math.pow(10, 18)).toFixed(2),
            totalTransactions: stats.totalTransactions,
            confirmedTransactions: stats.confirmedTransactions,
            pendingTransactions: stats.totalTransactions - stats.confirmedTransactions
          },
          monthlyRevenue: monthlyRevenue.map(item => ({
            date: item._id,
            amount: (item.amount / Math.pow(10, 18)).toFixed(2)
          })),
          recentTransactions: recentTransactions.map(tx => ({
            id: tx._id,
            amount: (parseFloat(tx.amount) / Math.pow(10, 18)).toFixed(2),
            category: tx.category,
            status: tx.status,
            timestamp: tx.createdAt,
            beneficiaryName: tx.metadata?.beneficiaryName
          }))
        }
      });

    } catch (error) {
      console.error('Get vendor dashboard stats error:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to get vendor dashboard statistics',
        error: error.message
      });
    }
  }
);

/**
 * @route   GET /api/vendors/receipt/:transactionId
 * @desc    Generate receipt for a transaction
 * @access  Private (Vendor only)
 */
router.get('/receipt/:transactionId',
  authenticateToken,
  requireVendor,
  async (req, res) => {
    try {
      const { transactionId } = req.params;
      const vendorAddress = req.user.address;

      // Find the transaction
      const transaction = await Transaction.findOne({
        _id: transactionId,
        to: vendorAddress,
        type: { $in: ['spending', 'vendor_payment'] }
      });

      if (!transaction) {
        return res.status(404).json({
          success: false,
          message: 'Transaction not found'
        });
      }

      // Get vendor information
      const vendor = await Vendor.findOne({ address: vendorAddress });
      
      // Get beneficiary information
      const beneficiary = await User.findOne({ 
        address: transaction.from,
        role: 'beneficiary'
      });

      const receiptData = {
        transactionId: transaction._id,
        receiptNumber: `RCP-${transaction._id.toString().slice(-8).toUpperCase()}`,
        vendorName: vendor?.businessName || 'Unknown Vendor',
        beneficiaryName: beneficiary?.profile?.name || transaction.metadata?.beneficiaryName || 'Anonymous Beneficiary',
        amount: (parseFloat(transaction.amount) / Math.pow(10, 18)).toFixed(2),
        category: transaction.category,
        status: transaction.status,
        transactionHash: transaction.txHash,
        timestamp: transaction.createdAt,
        items: transaction.metadata?.items || [],
        receiptData: transaction.metadata?.receiptData || {},
        blockchainVerification: {
          network: 'Ethereum',
          contractAddress: process.env.RELIEF_DISTRIBUTION_CONTRACT || '0x...',
          blockNumber: transaction.blockNumber || 'Pending'
        }
      };

      res.json({
        success: true,
        data: receiptData
      });

    } catch (error) {
      console.error('Generate receipt error:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to generate receipt',
        error: error.message
      });
    }
  }
);

/**
 * @route   GET /api/vendors/fraud-status
 * @desc    Get vendor fraud status and suspicious activity count
 * @access  Private (Vendor only)
 */
router.get('/fraud-status',
  authenticateToken,
  requireVendor,
  async (req, res) => {
    try {
      const vendor = await Vendor.findOne({ address: req.user.address });
      
      if (!vendor) {
        return res.status(404).json({
          success: false,
          message: 'Vendor profile not found'
        });
      }

      // Get recent flagged transactions
      const flaggedTransactions = await Transaction.find({
        to: req.user.address,
        'metadata.fraudFlags': { $exists: true, $ne: [] }
      })
        .sort({ createdAt: -1 })
        .limit(10)
        .lean();

      res.json({
        success: true,
        data: {
          suspiciousActivityCount: vendor.suspiciousActivityCount,
          lastSuspiciousActivity: vendor.lastSuspiciousActivity,
          status: vendor.status,
          isActive: vendor.isActive,
          flaggedTransactions: flaggedTransactions.map(tx => ({
            id: tx._id,
            amount: (parseFloat(tx.amount) / Math.pow(10, 18)).toFixed(2),
            category: tx.category,
            riskLevel: tx.metadata?.riskLevel,
            flags: tx.metadata?.fraudFlags?.map(f => f.description),
            createdAt: tx.createdAt
          })),
          riskLevel: vendor.suspiciousActivityCount === 0 ? 'low' : 
                    vendor.suspiciousActivityCount < 3 ? 'medium' : 'high'
        }
      });

    } catch (error) {
      console.error('Get vendor fraud status error:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to get vendor fraud status',
        error: error.message
      });
    }
  }
);

/**
 * @route   POST /api/vendors/dispute-flag
 * @desc    Dispute a fraud flag or suspicious activity
 * @access  Private (Vendor only)
 */
router.post('/dispute-flag',
  authenticateToken,
  requireVendor,
  async (req, res) => {
    try {
      const { transactionId, disputeReason, evidence } = req.body;

      if (!transactionId || !disputeReason) {
        return res.status(400).json({
          success: false,
          message: 'Transaction ID and dispute reason are required'
        });
      }

      // Find the flagged transaction
      const transaction = await Transaction.findOne({
        _id: transactionId,
        to: req.user.address,
        'metadata.fraudFlags': { $exists: true, $ne: [] }
      });

      if (!transaction) {
        return res.status(404).json({
          success: false,
          message: 'Flagged transaction not found'
        });
      }

      // Create a fraud report for the dispute
      const FraudReport = (await import('../models/FraudReport.js')).default;
      
      const disputeReport = new FraudReport({
        reportedEntity: req.user.address,
        entityType: 'vendor',
        reportType: 'other',
        severity: 'low',
        description: `Vendor dispute: ${disputeReason}`,
        evidence: evidence ? [evidence] : [],
        relatedTransactions: [{
          transactionId: transaction._id,
          txHash: transaction.txHash,
          relevance: 'Disputed transaction'
        }],
        reportedBy: {
          address: req.user.address,
          role: 'vendor',
          isAnonymous: false
        },
        autoGenerated: false,
        detectionMethod: 'manual_report',
        tags: ['vendor_dispute', 'flag_dispute']
      });

      await disputeReport.save();

      res.json({
        success: true,
        message: 'Dispute submitted successfully',
        data: {
          disputeId: disputeReport.reportId,
          status: 'pending_review',
          message: 'Your dispute will be reviewed by our verification team'
        }
      });

    } catch (error) {
      console.error('Dispute flag error:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to submit dispute',
        error: error.message
      });
    }
  }
);

export default router;