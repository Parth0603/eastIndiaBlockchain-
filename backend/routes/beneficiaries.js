import express from 'express';
import multer from 'multer';
import path from 'path';
import { authenticateToken, requireBeneficiary } from '../middleware/auth.js';
import { validationSchemas, handleValidationErrors, businessRules } from '../services/validation.js';
import blockchainService from '../services/blockchain.js';
import categoryFraudDetection from '../services/categoryFraudDetection.js';
import Application from '../models/Application.js';
import Transaction from '../models/Transaction.js';
import User from '../models/User.js';
import CategoryLimit from '../models/CategoryLimit.js';

const router = express.Router();

// Configure multer for file uploads
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, process.env.UPLOAD_PATH || './uploads');
  },
  filename: function (req, file, cb) {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, file.fieldname + '-' + uniqueSuffix + path.extname(file.originalname));
  }
});

const upload = multer({
  storage: storage,
  limits: {
    fileSize: parseInt(process.env.MAX_FILE_SIZE) || 5 * 1024 * 1024 // 5MB default
  },
  fileFilter: function (req, file, cb) {
    // Allow only specific file types
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
 * @route   POST /api/beneficiaries/apply
 * @desc    Submit relief application
 * @access  Private
 */
router.post('/apply',
  authenticateToken,
  upload.array('documents', 5), // Allow up to 5 documents
  validationSchemas.beneficiary.application,
  handleValidationErrors,
  async (req, res) => {
    try {
      const { personalInfo, contactInfo, emergencyInfo, requestedAmount } = req.body;
      const applicantAddress = req.user.address;
      const io = req.app.get('io');

      // Parse JSON fields if they come as strings
      const parsedPersonalInfo = typeof personalInfo === 'string' ? JSON.parse(personalInfo) : personalInfo;
      const parsedContactInfo = typeof contactInfo === 'string' ? JSON.parse(contactInfo) : contactInfo;
      const parsedEmergencyInfo = typeof emergencyInfo === 'string' ? JSON.parse(emergencyInfo) : emergencyInfo;

      // Check if user already has a pending or approved application
      const existingApplication = await Application.findOne({
        applicantAddress,
        status: { $in: ['pending', 'under_review', 'approved'] }
      });

      if (existingApplication) {
        return res.status(409).json({
          success: false,
          message: 'You already have an active application'
        });
      }

      // Validate business rules
      businessRules.validateAllocationRequest(
        parseFloat(requestedAmount),
        parsedEmergencyInfo.urgencyLevel,
        parsedEmergencyInfo.situation
      );

      // Process uploaded documents
      const documents = req.files ? req.files.map(file => ({
        filename: file.filename,
        originalName: file.originalname,
        mimetype: file.mimetype,
        size: file.size,
        verified: false
      })) : [];

      // Create application
      const application = new Application({
        applicantAddress,
        disasterType: parsedEmergencyInfo.situation === 'natural_disaster' ? 'earthquake' : 'other',
        location: parsedContactInfo.address || 'Not specified',
        requestedAmount: (parseFloat(requestedAmount) * Math.pow(10, 18)).toString(), // Convert to wei
        description: parsedEmergencyInfo.description,
        documents,
        status: 'pending',
        priority: parsedEmergencyInfo.urgencyLevel,
        metadata: {
          familySize: parsedPersonalInfo.familySize || 1,
          hasChildren: parsedPersonalInfo.hasChildren || false,
          hasElderly: parsedPersonalInfo.hasElderly || false,
          hasDisabled: parsedPersonalInfo.hasDisabled || false,
          previouslyReceived: false,
          emergencyContact: parsedContactInfo.emergencyContact || {}
        }
      });

      await application.save();

      // Update user profile
      const user = await User.findOne({ address: applicantAddress });
      if (user) {
        user.profile.name = parsedPersonalInfo.fullName;
        user.profile.email = parsedContactInfo.email;
        user.profile.verificationStatus = 'pending';
        await user.save();
      }

      // Emit real-time update
      io.emit('application-submitted', {
        applicantAddress,
        applicationId: application._id,
        urgencyLevel: parsedEmergencyInfo.urgencyLevel,
        timestamp: new Date()
      });

      res.status(201).json({
        success: true,
        data: {
          applicationId: application._id,
          status: 'pending',
          message: 'Application submitted successfully'
        }
      });

    } catch (error) {
      console.error('Application submission error:', error);
      res.status(500).json({
        success: false,
        message: error.message || 'Failed to submit application'
      });
    }
  }
);

/**
 * @route   GET /api/beneficiaries/status
 * @desc    Get application status and details
 * @access  Private
 */
router.get('/status',
  authenticateToken,
  async (req, res) => {
    try {
      const applicantAddress = req.user.address;

      // Get latest application
      const application = await Application.findOne({ applicantAddress })
        .sort({ createdAt: -1 });

      if (!application) {
        return res.json({
          success: true,
          data: {
            status: 'not_applied',
            hasApplication: false
          }
        });
      }

      // Get allocation info if approved
      let allocation = null;
      if (application.status === 'approved') {
        allocation = await blockchainService.getBeneficiaryAllocation(applicantAddress);
      }

      res.json({
        success: true,
        data: {
          hasApplication: true,
          applicationId: application._id,
          status: application.status,
          disasterType: application.disasterType,
          location: application.location,
          requestedAmount: application.requestedAmount,
          approvedAmount: application.approvedAmount,
          description: application.description,
          priority: application.priority,
          submittedAt: application.createdAt,
          reviewedAt: application.reviewedAt,
          reviewNotes: application.reviewNotes,
          allocation,
          documents: application.documents.map(doc => ({
            filename: doc.filename,
            originalName: doc.originalName,
            verified: doc.verified,
            uploadDate: doc.uploadDate
          }))
        }
      });

    } catch (error) {
      console.error('Status retrieval error:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to retrieve application status'
      });
    }
  }
);

/**
 * @route   GET /api/beneficiaries/balance
 * @desc    Get beneficiary balance and spending history with category-specific tracking
 * @access  Private (Beneficiary only)
 */
router.get('/balance',
  authenticateToken,
  requireBeneficiary,
  async (req, res) => {
    try {
      const beneficiaryAddress = req.user.address;

      // Get token balance
      const tokenBalance = await blockchainService.getTokenBalance(beneficiaryAddress);
      
      // Get allocation details
      const allocation = await blockchainService.getBeneficiaryAllocation(beneficiaryAddress);

      // Get spending history
      const spendingHistory = await Transaction.find({
        type: 'spending',
        from: beneficiaryAddress
      })
      .sort({ createdAt: -1 })
      .limit(50)
      .lean();

      // Calculate spending by category
      const spendingByCategory = await Transaction.aggregate([
        {
          $match: {
            type: 'spending',
            from: beneficiaryAddress,
            status: 'confirmed'
          }
        },
        {
          $group: {
            _id: '$category',
            totalAmount: { $sum: { $toDouble: '$amount' } },
            transactionCount: { $sum: 1 }
          }
        }
      ]);

      // Calculate donations received by category for this beneficiary
      const donationsByCategory = await Transaction.aggregate([
        {
          $match: {
            type: 'donation',
            status: 'confirmed',
            to: beneficiaryAddress
          }
        },
        {
          $group: {
            _id: '$category',
            totalReceived: { $sum: { $toDouble: '$amount' } },
            donationCount: { $sum: 1 }
          }
        }
      ]);

      // Define standard aid categories
      const standardCategories = ['Food', 'Medical', 'Shelter', 'Water', 'Clothing', 'Emergency Supplies'];
      
      // Calculate category-specific balances
      const categoryBalances = standardCategories.map(category => {
        // Find donations received for this category
        const categoryDonations = donationsByCategory.find(d => d._id === category);
        const totalReceived = categoryDonations ? categoryDonations.totalReceived : 0;
        
        // Find spending for this category
        const categorySpending = spendingByCategory.find(s => s._id === category);
        const totalSpent = categorySpending ? categorySpending.totalAmount : 0;
        
        // Calculate available balance for this category
        const availableBalance = Math.max(0, totalReceived - totalSpent);
        
        // If no donations received for this category, allocate from general fund
        // This handles cases where donations don't specify categories
        let allocatedBalance = availableBalance;
        if (totalReceived === 0 && parseFloat(tokenBalance) > 0) {
          // Distribute remaining balance across categories that haven't received specific donations
          const totalAllocatedFromDonations = donationsByCategory.reduce((sum, d) => sum + d.totalReceived, 0);
          const remainingBalance = parseFloat(tokenBalance) - totalAllocatedFromDonations;
          
          if (remainingBalance > 0) {
            // Distribute remaining balance equally among categories without specific donations
            const categoriesWithoutDonations = standardCategories.filter(cat => 
              !donationsByCategory.find(d => d._id === cat)
            );
            
            if (categoriesWithoutDonations.includes(category)) {
              allocatedBalance = remainingBalance / categoriesWithoutDonations.length;
            }
          }
        }

        return {
          category,
          totalReceived: totalReceived.toString(),
          totalSpent: totalSpent.toString(),
          availableBalance: allocatedBalance.toString(),
          transactionCount: (categoryDonations?.donationCount || 0) + (categorySpending?.transactionCount || 0),
          spendingTransactions: categorySpending?.transactionCount || 0,
          donationTransactions: categoryDonations?.donationCount || 0
        };
      });

      // Calculate total allocated vs total balance for validation
      const totalAllocated = categoryBalances.reduce((sum, cat) => sum + parseFloat(cat.availableBalance), 0);
      const balanceDiscrepancy = Math.abs(parseFloat(tokenBalance) - totalAllocated);

      res.json({
        success: true,
        data: {
          tokenBalance,
          allocation,
          categoryBalances,
          spendingHistory: spendingHistory.map(tx => ({
            id: tx._id,
            amount: tx.amount,
            category: tx.metadata?.category,
            description: tx.metadata?.description,
            vendor: tx.to,
            transactionHash: tx.txHash,
            timestamp: tx.createdAt,
            status: tx.status
          })),
          spendingByCategory: spendingByCategory.map(cat => ({
            category: cat._id,
            totalSpent: cat.totalAmount.toString(),
            transactionCount: cat.transactionCount
          })),
          summary: {
            totalBalance: tokenBalance,
            totalAllocated: totalAllocated.toString(),
            balanceDiscrepancy: balanceDiscrepancy.toString(),
            categoriesWithBalance: categoryBalances.filter(cat => parseFloat(cat.availableBalance) > 0).length,
            totalCategories: standardCategories.length
          },
          lastUpdated: new Date()
        }
      });

    } catch (error) {
      console.error('Balance retrieval error:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to retrieve balance information'
      });
    }
  }
);

/**
 * @route   POST /api/beneficiaries/spend
 * @desc    Process spending transaction with category-specific balance validation
 * @access  Private (Beneficiary only)
 */
router.post('/spend',
  authenticateToken,
  requireBeneficiary,
  validationSchemas.beneficiary.spending,
  handleValidationErrors,
  async (req, res) => {
    try {
      const { vendor, vendorId, paymentCode, amount, category, description, receiptHash } = req.body;
      const beneficiaryAddress = req.user.address;
      const io = req.app.get('io');

      // Handle both regular spending and QR code payments
      let vendorAddress = vendor;
      let vendorName = 'Unknown Vendor';

      // If this is a QR code payment, find vendor by vendorId
      if (vendorId && paymentCode) {
        const vendorUser = await User.findOne({ 
          $or: [
            { 'profile.vendorId': vendorId },
            { address: vendorId.toLowerCase() }
          ],
          role: 'vendor',
          'profile.verificationStatus': 'verified'
        });

        if (!vendorUser) {
          return res.status(400).json({
            success: false,
            message: 'Vendor not found or not verified'
          });
        }

        vendorAddress = vendorUser.address;
        vendorName = vendorUser.profile?.businessName || vendorUser.profile?.name || 'Unknown Vendor';
      } else if (vendor) {
        // Regular spending - validate vendor address
        const vendorUser = await User.findOne({ 
          address: vendor.toLowerCase(),
          role: 'vendor',
          'profile.verificationStatus': 'verified'
        });

        if (!vendorUser) {
          return res.status(400).json({
            success: false,
            message: 'Vendor not found or not verified'
          });
        }

        vendorName = vendorUser.profile?.businessName || vendorUser.profile?.name || 'Unknown Vendor';
      } else {
        return res.status(400).json({
          success: false,
          message: 'Vendor information is required'
        });
      }

      // Get beneficiary balance and category-specific balances
      const tokenBalance = parseFloat(await blockchainService.getTokenBalance(beneficiaryAddress));
      
      // Calculate category-specific balance for validation
      const spendingByCategory = await Transaction.aggregate([
        {
          $match: {
            type: 'spending',
            from: beneficiaryAddress,
            status: 'confirmed'
          }
        },
        {
          $group: {
            _id: '$category',
            totalAmount: { $sum: { $toDouble: '$amount' } }
          }
        }
      ]);

      const donationsByCategory = await Transaction.aggregate([
        {
          $match: {
            type: 'donation',
            status: 'confirmed',
            to: beneficiaryAddress
          }
        },
        {
          $group: {
            _id: '$category',
            totalReceived: { $sum: { $toDouble: '$amount' } }
          }
        }
      ]);

      // Calculate available balance for the requested category
      const categoryDonations = donationsByCategory.find(d => d._id === category);
      const totalReceivedForCategory = categoryDonations ? categoryDonations.totalReceived : 0;
      
      const categorySpending = spendingByCategory.find(s => s._id === category);
      const totalSpentForCategory = categorySpending ? categorySpending.totalAmount : 0;
      
      let availableCategoryBalance = Math.max(0, totalReceivedForCategory - totalSpentForCategory);
      
      // If no specific donations for this category, check if we can allocate from general fund
      if (totalReceivedForCategory === 0) {
        const totalAllocatedFromDonations = donationsByCategory.reduce((sum, d) => sum + d.totalReceived, 0);
        const remainingBalance = tokenBalance - totalAllocatedFromDonations;
        
        if (remainingBalance > 0) {
          // Allow spending from general fund for categories without specific donations
          const standardCategories = ['Food', 'Medical', 'Shelter', 'Water', 'Clothing', 'Emergency Supplies'];
          const categoriesWithoutDonations = standardCategories.filter(cat => 
            !donationsByCategory.find(d => d._id === cat)
          );
          
          if (categoriesWithoutDonations.includes(category)) {
            availableCategoryBalance = remainingBalance / categoriesWithoutDonations.length;
          }
        }
      }

      // Validate category-specific spending
      const requestedAmount = parseFloat(amount);
      if (requestedAmount > availableCategoryBalance) {
        return res.status(400).json({
          success: false,
          message: `Insufficient balance for ${category} category. Available: ${availableCategoryBalance.toFixed(2)}, Requested: ${requestedAmount}`,
          data: {
            category,
            availableBalance: availableCategoryBalance.toString(),
            requestedAmount: requestedAmount.toString(),
            totalBalance: tokenBalance.toString()
          }
        });
      }

      // Validate overall spending
      businessRules.validateSpending(requestedAmount, category, tokenBalance);

      // Run fraud detection analysis
      const fraudAnalysis = await categoryFraudDetection.analyzeSpendingPattern(
        beneficiaryAddress,
        category,
        requestedAmount,
        vendorAddress.toLowerCase()
      );

      // Check if transaction should be blocked due to high fraud risk
      if (fraudAnalysis.riskLevel === 'critical') {
        return res.status(403).json({
          success: false,
          message: 'Transaction blocked due to high fraud risk. Please contact support.',
          data: {
            riskLevel: fraudAnalysis.riskLevel,
            riskScore: fraudAnalysis.riskScore,
            requiresReview: true,
            fraudFlags: fraudAnalysis.flags.map(flag => flag.type)
          }
        });
      }

      // Check category spending limits
      const categoryLimit = await CategoryLimit.getLimitForCategory(category);
      if (categoryLimit && !categoryLimit.isEmergencyOverrideActive()) {
        // Check per-transaction limit
        const perTransactionLimitUnits = categoryLimit.getPerTransactionLimitInUnits();
        if (requestedAmount > perTransactionLimitUnits) {
          return res.status(400).json({
            success: false,
            message: `Transaction exceeds per-transaction limit for ${category}. Limit: ${perTransactionLimitUnits} units, Requested: ${requestedAmount} units`,
            data: {
              category,
              perTransactionLimit: perTransactionLimitUnits,
              requestedAmount,
              limitType: 'per_transaction'
            }
          });
        }

        // Check daily limit
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        const dailySpending = await Transaction.aggregate([
          {
            $match: {
              type: 'spending',
              from: beneficiaryAddress,
              category: category,
              status: 'confirmed',
              createdAt: { $gte: today }
            }
          },
          {
            $group: {
              _id: null,
              totalSpent: { $sum: { $toDouble: '$amount' } }
            }
          }
        ]);

        const todaySpentUnits = dailySpending.length > 0 ? dailySpending[0].totalSpent / Math.pow(10, 18) : 0;
        const dailyLimitUnits = categoryLimit.getDailyLimitInUnits();
        
        if (todaySpentUnits + requestedAmount > dailyLimitUnits) {
          return res.status(400).json({
            success: false,
            message: `Transaction would exceed daily limit for ${category}. Daily limit: ${dailyLimitUnits} units, Already spent today: ${todaySpentUnits.toFixed(2)} units, Requested: ${requestedAmount} units`,
            data: {
              category,
              dailyLimit: dailyLimitUnits,
              spentToday: todaySpentUnits,
              requestedAmount,
              remainingDaily: Math.max(0, dailyLimitUnits - todaySpentUnits),
              limitType: 'daily'
            }
          });
        }

        // Check weekly limit
        const weekAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
        const weeklySpending = await Transaction.aggregate([
          {
            $match: {
              type: 'spending',
              from: beneficiaryAddress,
              category: category,
              status: 'confirmed',
              createdAt: { $gte: weekAgo }
            }
          },
          {
            $group: {
              _id: null,
              totalSpent: { $sum: { $toDouble: '$amount' } }
            }
          }
        ]);

        const weekSpentUnits = weeklySpending.length > 0 ? weeklySpending[0].totalSpent / Math.pow(10, 18) : 0;
        const weeklyLimitUnits = categoryLimit.getWeeklyLimitUnits();
        
        if (weekSpentUnits + requestedAmount > weeklyLimitUnits) {
          return res.status(400).json({
            success: false,
            message: `Transaction would exceed weekly limit for ${category}. Weekly limit: ${weeklyLimitUnits} units, Already spent this week: ${weekSpentUnits.toFixed(2)} units, Requested: ${requestedAmount} units`,
            data: {
              category,
              weeklyLimit: weeklyLimitUnits,
              spentThisWeek: weekSpentUnits,
              requestedAmount,
              remainingWeekly: Math.max(0, weeklyLimitUnits - weekSpentUnits),
              limitType: 'weekly'
            }
          });
        }

        // Check monthly limit
        const monthStart = new Date(today.getFullYear(), today.getMonth(), 1);
        const monthlySpending = await Transaction.aggregate([
          {
            $match: {
              type: 'spending',
              from: beneficiaryAddress,
              category: category,
              status: 'confirmed',
              createdAt: { $gte: monthStart }
            }
          },
          {
            $group: {
              _id: null,
              totalSpent: { $sum: { $toDouble: '$amount' } }
            }
          }
        ]);

        const monthSpentUnits = monthlySpending.length > 0 ? monthlySpending[0].totalSpent / Math.pow(10, 18) : 0;
        const monthlyLimitUnits = categoryLimit.getMonthlyLimitInUnits();
        
        if (monthSpentUnits + requestedAmount > monthlyLimitUnits) {
          return res.status(400).json({
            success: false,
            message: `Transaction would exceed monthly limit for ${category}. Monthly limit: ${monthlyLimitUnits} units, Already spent this month: ${monthSpentUnits.toFixed(2)} units, Requested: ${requestedAmount} units`,
            data: {
              category,
              monthlyLimit: monthlyLimitUnits,
              spentThisMonth: monthSpentUnits,
              requestedAmount,
              remainingMonthly: Math.max(0, monthlyLimitUnits - monthSpentUnits),
              limitType: 'monthly'
            }
          });
        }
      }

      // Create spending transaction record
      const transaction = new Transaction({
        type: 'spending',
        from: beneficiaryAddress,
        to: vendorAddress.toLowerCase(),
        amount: (requestedAmount * Math.pow(10, 18)).toString(), // Convert to wei
        txHash: '0x' + Math.random().toString(16).substr(2, 64), // Mock transaction hash
        status: fraudAnalysis.requiresReview ? 'pending' : 'confirmed', // Pending if requires review
        category,
        metadata: {
          description,
          category,
          beneficiaryName: req.user.name || 'Unknown',
          vendorName,
          receiptHash: receiptHash || null,
          paymentMethod: paymentCode ? 'qr_code' : 'manual',
          paymentCode: paymentCode || null,
          vendorId: vendorId || null,
          categoryBalance: {
            availableBeforeSpending: availableCategoryBalance.toString(),
            spentAmount: requestedAmount.toString(),
            availableAfterSpending: (availableCategoryBalance - requestedAmount).toString()
          },
          // Fraud detection metadata
          fraudAnalysis: {
            riskLevel: fraudAnalysis.riskLevel,
            riskScore: fraudAnalysis.riskScore,
            riskBreakdown: fraudAnalysis.riskBreakdown,
            requiresReview: fraudAnalysis.requiresReview,
            analyzedAt: fraudAnalysis.timestamp
          },
          fraudFlags: fraudAnalysis.flags,
          riskLevel: fraudAnalysis.riskLevel,
          requiresReview: fraudAnalysis.requiresReview
        }
      });

      await transaction.save();

      // Update vendor's total received (mock - in real system this would be handled by smart contract)
      const vendorUser = await User.findOne({ address: vendorAddress.toLowerCase() });
      if (vendorUser) {
        vendorUser.totalReceived = (parseFloat(vendorUser.totalReceived || 0) + requestedAmount).toString();
        await vendorUser.save();
      }

      // Emit real-time update
      io.emit('spending-processed', {
        beneficiary: beneficiaryAddress,
        vendor: vendorAddress.toLowerCase(),
        amount: requestedAmount,
        category,
        transactionHash: transaction.txHash,
        paymentMethod: paymentCode ? 'qr_code' : 'manual',
        categoryBalance: {
          category,
          availableBalance: (availableCategoryBalance - requestedAmount).toString(),
          spentAmount: requestedAmount.toString()
        },
        timestamp: new Date()
      });

      res.status(201).json({
        success: true,
        data: {
          transactionId: transaction._id,
          transactionHash: transaction.txHash,
          amount: requestedAmount,
          category,
          vendor: vendorAddress.toLowerCase(),
          vendorName,
          status: 'confirmed',
          paymentMethod: paymentCode ? 'qr_code' : 'manual',
          categoryBalance: {
            category,
            availableBeforeSpending: availableCategoryBalance.toString(),
            availableAfterSpending: (availableCategoryBalance - requestedAmount).toString(),
            spentAmount: requestedAmount.toString()
          },
          message: paymentCode ? 'QR code payment processed successfully' : 'Spending transaction processed successfully'
        }
      });

    } catch (error) {
      console.error('Spending processing error:', error);
      res.status(500).json({
        success: false,
        message: error.message || 'Failed to process spending transaction'
      });
    }
  }
);

/**
 * @route   GET /api/beneficiaries/transactions
 * @desc    Get transaction history with pagination
 * @access  Private (Beneficiary only)
 */
router.get('/transactions',
  authenticateToken,
  requireBeneficiary,
  async (req, res) => {
    try {
      const { page = 1, limit = 20, category, status } = req.query;
      const beneficiaryAddress = req.user.address;

      const skip = (parseInt(page) - 1) * parseInt(limit);

      // Build query
      const query = {
        $or: [
          { from: beneficiaryAddress },
          { to: beneficiaryAddress }
        ]
      };

      if (category) {
        query['metadata.category'] = category;
      }

      if (status) {
        query.status = status;
      }

      // Get transactions
      const transactions = await Transaction.find(query)
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(parseInt(limit))
        .lean();

      // Get total count
      const totalCount = await Transaction.countDocuments(query);

      // Calculate pagination info
      const totalPages = Math.ceil(totalCount / parseInt(limit));
      const hasNextPage = parseInt(page) < totalPages;
      const hasPrevPage = parseInt(page) > 1;

      res.json({
        success: true,
        data: {
          transactions: transactions.map(tx => ({
            id: tx._id,
            type: tx.type,
            amount: tx.amount,
            from: tx.from,
            to: tx.to,
            category: tx.category,
            description: tx.metadata?.description,
            transactionHash: tx.txHash,
            status: tx.status,
            timestamp: tx.createdAt,
            metadata: tx.metadata
          })),
          pagination: {
            currentPage: parseInt(page),
            totalPages,
            totalCount,
            hasNextPage,
            hasPrevPage,
            limit: parseInt(limit)
          }
        }
      });

    } catch (error) {
      console.error('Transaction history error:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to retrieve transaction history'
      });
    }
  }
);

/**
 * @route   GET /api/beneficiaries/vendors
 * @desc    Get list of approved vendors with location and rating info
 * @access  Private (Beneficiary only)
 */
router.get('/vendors',
  authenticateToken,
  requireBeneficiary,
  async (req, res) => {
    try {
      const { category, location } = req.query;

      // Build query for approved vendors
      const query = {
        role: 'vendor',
        'profile.verificationStatus': 'verified',
        isActive: true
      };

      const vendors = await User.find(query)
        .select('address profile totalReceived createdAt')
        .lean();

      // Transform vendor data for frontend
      const transformedVendors = vendors.map(vendor => {
        const businessName = vendor.profile?.businessName || vendor.profile?.name || 'Unknown Business';
        const businessType = vendor.profile?.businessType || 'general';
        const city = vendor.profile?.city || 'Unknown Location';
        
        // Generate mock data for demo purposes
        const mockRating = 4.2 + (Math.random() * 0.8); // 4.2 - 5.0
        const mockDistance = (Math.random() * 5 + 0.5).toFixed(1); // 0.5 - 5.5 km
        
        return {
          id: `VEN-${vendor.address.slice(-6).toUpperCase()}`,
          address: vendor.address,
          name: businessName,
          type: formatBusinessType(businessType),
          category: businessType,
          location: city,
          distance: `${mockDistance} km`,
          rating: parseFloat(mockRating.toFixed(1)),
          verified: true,
          totalReceived: vendor.totalReceived || '0',
          registeredAt: vendor.createdAt
        };
      });

      // Filter by category if specified
      let filteredVendors = transformedVendors;
      if (category) {
        filteredVendors = transformedVendors.filter(vendor => 
          vendor.category.toLowerCase().includes(category.toLowerCase())
        );
      }

      // Sort by distance (closest first)
      filteredVendors.sort((a, b) => parseFloat(a.distance) - parseFloat(b.distance));

      res.json({
        success: true,
        data: {
          vendors: filteredVendors,
          totalCount: filteredVendors.length,
          category: category || 'all',
          location: location || 'current'
        }
      });

    } catch (error) {
      console.error('Vendors retrieval error:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to retrieve vendor list'
      });
    }
  }
);

// Helper function to format business type for display
function formatBusinessType(businessType) {
  const typeMap = {
    'retail': 'Retail Store',
    'pharmacy': 'Pharmacy',
    'grocery': 'Grocery Store', 
    'hardware': 'Hardware Store',
    'medical': 'Medical Services',
    'restaurant': 'Restaurant/Food Service',
    'other': 'Other'
  };
  return typeMap[businessType] || businessType || 'General';
}

/**
 * @route   GET /api/beneficiaries/category-limits
 * @desc    Get category spending limits for beneficiary
 * @access  Private (Beneficiary only)
 */
router.get('/category-limits',
  authenticateToken,
  requireBeneficiary,
  async (req, res) => {
    try {
      const beneficiaryAddress = req.user.address;
      
      // Get active category limits
      const limits = await CategoryLimit.getActiveLimits();
      
      // Calculate current usage for each category
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      const weekAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
      const monthStart = new Date(today.getFullYear(), today.getMonth(), 1);

      const categoryLimitsWithUsage = await Promise.all(
        limits.map(async (limit) => {
          // Get daily spending
          const dailySpending = await Transaction.aggregate([
            {
              $match: {
                type: 'spending',
                from: beneficiaryAddress,
                category: limit.category,
                status: 'confirmed',
                createdAt: { $gte: today }
              }
            },
            {
              $group: {
                _id: null,
                totalSpent: { $sum: { $toDouble: '$amount' } }
              }
            }
          ]);

          // Get weekly spending
          const weeklySpending = await Transaction.aggregate([
            {
              $match: {
                type: 'spending',
                from: beneficiaryAddress,
                category: limit.category,
                status: 'confirmed',
                createdAt: { $gte: weekAgo }
              }
            },
            {
              $group: {
                _id: null,
                totalSpent: { $sum: { $toDouble: '$amount' } }
              }
            }
          ]);

          // Get monthly spending
          const monthlySpending = await Transaction.aggregate([
            {
              $match: {
                type: 'spending',
                from: beneficiaryAddress,
                category: limit.category,
                status: 'confirmed',
                createdAt: { $gte: monthStart }
              }
            },
            {
              $group: {
                _id: null,
                totalSpent: { $sum: { $toDouble: '$amount' } }
              }
            }
          ]);

          const dailySpentUnits = dailySpending.length > 0 ? dailySpending[0].totalSpent / Math.pow(10, 18) : 0;
          const weeklySpentUnits = weeklySpending.length > 0 ? weeklySpending[0].totalSpent / Math.pow(10, 18) : 0;
          const monthlySpentUnits = monthlySpending.length > 0 ? monthlySpending[0].totalSpent / Math.pow(10, 18) : 0;

          return {
            category: limit.category,
            limits: {
              daily: limit.getDailyLimitInUnits(),
              weekly: limit.getWeeklyLimitInUnits(),
              monthly: limit.getMonthlyLimitInUnits(),
              perTransaction: limit.getPerTransactionLimitInUnits()
            },
            usage: {
              daily: dailySpentUnits,
              weekly: weeklySpentUnits,
              monthly: monthlySpentUnits
            },
            remaining: {
              daily: Math.max(0, limit.getDailyLimitInUnits() - dailySpentUnits),
              weekly: Math.max(0, limit.getWeeklyLimitInUnits() - weeklySpentUnits),
              monthly: Math.max(0, limit.getMonthlyLimitInUnits() - monthlySpentUnits)
            },
            percentageUsed: {
              daily: ((dailySpentUnits / limit.getDailyLimitInUnits()) * 100).toFixed(1),
              weekly: ((weeklySpentUnits / limit.getWeeklyLimitInUnits()) * 100).toFixed(1),
              monthly: ((monthlySpentUnits / limit.getMonthlyLimitInUnits()) * 100).toFixed(1)
            },
            isActive: limit.isActive,
            emergencyOverride: limit.isEmergencyOverrideActive()
          };
        })
      );

      res.json({
        success: true,
        data: {
          categoryLimits: categoryLimitsWithUsage,
          currentTime: {
            today: today.toISOString(),
            weekStart: weekAgo.toISOString(),
            monthStart: monthStart.toISOString()
          }
        }
      });

    } catch (error) {
      console.error('Category limits retrieval error:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to retrieve category limits'
      });
    }
  }
);
router.put('/profile',
  authenticateToken,
  requireBeneficiary,
  async (req, res) => {
    try {
      const { name, email, phone, emergencyContact } = req.body;
      const beneficiaryAddress = req.user.address;

      const user = await User.findOne({ address: beneficiaryAddress });
      if (!user) {
        return res.status(404).json({
          success: false,
          message: 'User not found'
        });
      }

      // Update profile fields
      if (name) user.profile.name = name;
      if (email) user.profile.email = email;
      if (phone) user.profile.phone = phone;
      if (emergencyContact) user.profile.emergencyContact = emergencyContact;

      await user.save();

      res.json({
        success: true,
        data: {
          profile: {
            name: user.profile.name,
            email: user.profile.email,
            phone: user.profile.phone,
            emergencyContact: user.profile.emergencyContact,
            verificationStatus: user.profile.verificationStatus
          },
          message: 'Profile updated successfully'
        }
      });

    } catch (error) {
      console.error('Profile update error:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to update profile'
      });
    }
  }
);

export default router;