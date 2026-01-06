import express from 'express';
import { authenticateToken, requireAdmin, requireVerifier } from '../middleware/auth.js';
import { validationSchemas, handleValidationErrors, businessRules } from '../services/validation.js';
import blockchainService from '../services/blockchain.js';
import Application from '../models/Application.js';
import Transaction from '../models/Transaction.js';
import User from '../models/User.js';

const router = express.Router();

// =============================================================================
// VERIFIER ENDPOINTS (Task 4.5)
// =============================================================================

/**
 * @route   GET /api/admin/verifier/applications
 * @desc    Get pending applications for review
 * @access  Private (Verifier/Admin only)
 */
router.get('/verifier/applications',
  authenticateToken,
  requireVerifier,
  async (req, res) => {
    try {
      const { status = 'pending', page = 1, limit = 20, priority } = req.query;
      const skip = (parseInt(page) - 1) * parseInt(limit);

      // Build query
      const query = { status };
      if (priority) {
        query.priority = priority;
      }

      // Get applications with applicant info
      const applications = await Application.find(query)
        .sort({ 
          priority: { critical: 1, high: 2, medium: 3, low: 4 }[priority] || 1,
          createdAt: -1 
        })
        .skip(skip)
        .limit(parseInt(limit))
        .lean();

      // Get applicant details
      const applicantAddresses = applications.map(app => app.applicantAddress);
      const applicants = await User.find({ 
        address: { $in: applicantAddresses } 
      }).lean();

      const applicantMap = applicants.reduce((map, user) => {
        map[user.address] = user;
        return map;
      }, {});

      // Combine application and applicant data
      const enrichedApplications = applications.map(app => ({
        id: app._id,
        applicantAddress: app.applicantAddress,
        applicantName: applicantMap[app.applicantAddress]?.profile?.name || 'Unknown',
        applicantEmail: applicantMap[app.applicantAddress]?.profile?.email,
        disasterType: app.disasterType,
        location: app.location,
        requestedAmount: app.requestedAmount,
        description: app.description,
        priority: app.priority,
        status: app.status,
        submittedAt: app.createdAt,
        documents: app.documents.map(doc => ({
          filename: doc.filename,
          originalName: doc.originalName,
          verified: doc.verified,
          uploadDate: doc.uploadDate
        })),
        metadata: app.metadata
      }));

      const totalCount = await Application.countDocuments(query);

      res.json({
        success: true,
        data: {
          applications: enrichedApplications,
          pagination: {
            currentPage: parseInt(page),
            totalPages: Math.ceil(totalCount / parseInt(limit)),
            totalCount,
            limit: parseInt(limit)
          }
        }
      });

    } catch (error) {
      console.error('Applications retrieval error:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to retrieve applications'
      });
    }
  }
);

/**
 * @route   POST /api/admin/verifier/applications/:applicationId/review
 * @desc    Review and approve/reject application
 * @access  Private (Verifier/Admin only)
 */
router.post('/verifier/applications/:applicationId/review',
  authenticateToken,
  requireVerifier,
  validationSchemas.verifier.applicationReview,
  handleValidationErrors,
  async (req, res) => {
    try {
      const { applicationId } = req.params;
      const { decision, comments, allocatedAmount } = req.body;
      const reviewerAddress = req.user.address;
      const io = req.app.get('io');

      // Get application
      const application = await Application.findById(applicationId);
      if (!application) {
        return res.status(404).json({
          success: false,
          message: 'Application not found'
        });
      }

      if (application.status !== 'pending' && application.status !== 'under_review') {
        return res.status(400).json({
          success: false,
          message: 'Application has already been reviewed'
        });
      }

      // Update application status
      application.status = decision === 'approve' ? 'approved' : 
                          decision === 'reject' ? 'rejected' : 'under_review';
      application.reviewedAt = new Date();
      application.reviewedBy = reviewerAddress;
      application.reviewNotes = comments;

      if (decision === 'approve') {
        application.approvedAmount = (parseFloat(allocatedAmount) * Math.pow(10, 18)).toString();
        
        // Validate allocation amount
        businessRules.validateAllocationRequest(
          parseFloat(allocatedAmount),
          application.priority,
          application.disasterType
        );

        // Update user role to beneficiary if approved
        await User.findOneAndUpdate(
          { address: application.applicantAddress },
          { 
            role: 'beneficiary',
            'profile.verificationStatus': 'verified'
          }
        );
      }

      await application.save();

      // Emit real-time update
      const websocketService = req.app.get('websocket');
      if (websocketService) {
        websocketService.broadcastToRole('admin', 'application-reviewed', {
          applicationId,
          applicantAddress: application.applicantAddress,
          decision,
          reviewerAddress,
          timestamp: new Date()
        });

        if (decision === 'approve') {
          websocketService.notifyBeneficiaryApproved({
            address: application.applicantAddress,
            allocatedAmount: allocatedAmount
          });
        }
      }

      res.json({
        success: true,
        data: {
          applicationId,
          status: application.status,
          decision,
          allocatedAmount: decision === 'approve' ? allocatedAmount : null,
          reviewedAt: application.reviewedAt,
          message: `Application ${decision}d successfully`
        }
      });

    } catch (error) {
      console.error('Application review error:', error);
      res.status(500).json({
        success: false,
        message: error.message || 'Failed to review application'
      });
    }
  }
);

/**
 * @route   GET /api/admin/verifier/vendors/pending
 * @desc    Get pending vendor applications
 * @access  Private (Verifier/Admin only)
 */
router.get('/verifier/vendors/pending',
  authenticateToken,
  requireVerifier,
  async (req, res) => {
    try {
      const { page = 1, limit = 20 } = req.query;
      const skip = (parseInt(page) - 1) * parseInt(limit);

      // Get pending vendor applications
      const vendors = await User.find({
        role: 'vendor',
        'profile.verificationStatus': 'pending'
      })
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(parseInt(limit))
      .lean();

      const totalCount = await User.countDocuments({
        role: 'vendor',
        'profile.verificationStatus': 'pending'
      });

      res.json({
        success: true,
        data: {
          vendors: vendors.map(vendor => ({
            id: vendor._id,
            address: vendor.address,
            businessName: vendor.profile?.businessName || 'Unknown Business',
            businessType: vendor.profile?.businessType,
            registrationNumber: vendor.profile?.registrationNumber,
            contactInfo: {
              email: vendor.profile?.email,
              phone: vendor.profile?.phone,
              address: vendor.profile?.businessAddress
            },
            categories: vendor.profile?.categories || [],
            submittedAt: vendor.createdAt,
            documents: vendor.profile?.documents || []
          })),
          pagination: {
            currentPage: parseInt(page),
            totalPages: Math.ceil(totalCount / parseInt(limit)),
            totalCount,
            limit: parseInt(limit)
          }
        }
      });

    } catch (error) {
      console.error('Pending vendors retrieval error:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to retrieve pending vendors'
      });
    }
  }
);

/**
 * @route   POST /api/admin/verifier/vendors/:vendorId/approve
 * @desc    Approve or reject vendor application
 * @access  Private (Verifier/Admin only)
 */
router.post('/verifier/vendors/:vendorId/approve',
  authenticateToken,
  requireVerifier,
  validationSchemas.verifier.vendorApproval,
  handleValidationErrors,
  async (req, res) => {
    try {
      const { vendorId } = req.params;
      const { decision, comments } = req.body;
      const reviewerAddress = req.user.address;
      const io = req.app.get('io');

      // Get vendor
      const vendor = await User.findById(vendorId);
      if (!vendor || vendor.role !== 'vendor') {
        return res.status(404).json({
          success: false,
          message: 'Vendor not found'
        });
      }

      if (vendor.profile.verificationStatus !== 'pending') {
        return res.status(400).json({
          success: false,
          message: 'Vendor has already been reviewed'
        });
      }

      // Update vendor status
      vendor.profile.verificationStatus = decision === 'approve' ? 'verified' : 'rejected';
      vendor.profile.reviewedAt = new Date();
      vendor.profile.reviewedBy = reviewerAddress;
      vendor.profile.reviewNotes = comments;

      if (decision === 'approve') {
        vendor.isActive = true;
      }

      await vendor.save();

      // Emit real-time update
      const websocketService = req.app.get('websocket');
      if (websocketService) {
        websocketService.broadcastToRole('admin', 'vendor-reviewed', {
          vendorId,
          vendorAddress: vendor.address,
          decision,
          reviewerAddress,
          timestamp: new Date()
        });

        if (decision === 'approve') {
          websocketService.notifyVendorApproved({
            address: vendor.address,
            businessName: vendor.profile?.businessName
          });
        }
      }

      res.json({
        success: true,
        data: {
          vendorId,
          vendorAddress: vendor.address,
          status: vendor.profile.verificationStatus,
          decision,
          reviewedAt: vendor.profile.reviewedAt,
          message: `Vendor ${decision}d successfully`
        }
      });

    } catch (error) {
      console.error('Vendor approval error:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to process vendor approval'
      });
    }
  }
);

/**
 * @route   GET /api/admin/verifier/transactions/monitor
 * @desc    Monitor transactions for audit purposes
 * @access  Private (Verifier/Admin only)
 */
router.get('/verifier/transactions/monitor',
  authenticateToken,
  requireVerifier,
  async (req, res) => {
    try {
      const { 
        page = 1, 
        limit = 50, 
        type, 
        status, 
        flagged, 
        startDate, 
        endDate 
      } = req.query;
      
      const skip = (parseInt(page) - 1) * parseInt(limit);

      // Build query
      const query = {};
      if (type) query.type = type;
      if (status) query.status = status;
      if (flagged === 'true') query.flagged = true;
      
      if (startDate || endDate) {
        query.createdAt = {};
        if (startDate) query.createdAt.$gte = new Date(startDate);
        if (endDate) query.createdAt.$lte = new Date(endDate);
      }

      // Get transactions with user details
      const transactions = await Transaction.find(query)
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(parseInt(limit))
        .lean();

      // Get user details for from/to addresses
      const addresses = [...new Set([
        ...transactions.map(tx => tx.from),
        ...transactions.map(tx => tx.to)
      ].filter(Boolean))];

      const users = await User.find({ 
        address: { $in: addresses } 
      }).lean();

      const userMap = users.reduce((map, user) => {
        map[user.address] = user;
        return map;
      }, {});

      // Enrich transactions with user data
      const enrichedTransactions = transactions.map(tx => ({
        id: tx._id,
        type: tx.type,
        amount: tx.amount,
        from: tx.from,
        to: tx.to,
        fromUser: userMap[tx.from]?.profile?.name || 'Unknown',
        toUser: userMap[tx.to]?.profile?.name || 'Unknown',
        category: tx.category,
        status: tx.status,
        txHash: tx.txHash,
        flagged: tx.flagged || false,
        flagReason: tx.flagReason,
        timestamp: tx.createdAt,
        metadata: tx.metadata
      }));

      const totalCount = await Transaction.countDocuments(query);

      res.json({
        success: true,
        data: {
          transactions: enrichedTransactions,
          pagination: {
            currentPage: parseInt(page),
            totalPages: Math.ceil(totalCount / parseInt(limit)),
            totalCount,
            limit: parseInt(limit)
          },
          summary: {
            totalTransactions: totalCount,
            flaggedCount: await Transaction.countDocuments({ ...query, flagged: true })
          }
        }
      });

    } catch (error) {
      console.error('Transaction monitoring error:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to retrieve transaction data'
      });
    }
  }
);

// =============================================================================
// ADMIN ENDPOINTS (Task 4.7)
// =============================================================================

/**
 * @route   GET /api/admin/stats
 * @desc    Get comprehensive system statistics
 * @access  Private (Admin only)
 */
router.get('/stats',
  authenticateToken,
  requireAdmin,
  async (req, res) => {
    try {
      // Get basic counts
      const [
        totalUsers,
        totalDonations,
        totalSpending,
        pendingApplications,
        approvedBeneficiaries,
        verifiedVendors,
        totalTransactions
      ] = await Promise.all([
        User.countDocuments(),
        Transaction.countDocuments({ type: 'donation', status: 'confirmed' }),
        Transaction.countDocuments({ type: 'spending', status: 'confirmed' }),
        Application.countDocuments({ status: 'pending' }),
        User.countDocuments({ role: 'beneficiary', 'profile.verificationStatus': 'verified' }),
        User.countDocuments({ role: 'vendor', 'profile.verificationStatus': 'verified' }),
        Transaction.countDocuments()
      ]);

      // Get donation amounts
      const donationStats = await Transaction.aggregate([
        { $match: { type: 'donation', status: 'confirmed' } },
        {
          $group: {
            _id: null,
            totalAmount: { $sum: { $toDouble: '$amount' } },
            avgAmount: { $avg: { $toDouble: '$amount' } }
          }
        }
      ]);

      // Get spending amounts
      const spendingStats = await Transaction.aggregate([
        { $match: { type: 'spending', status: 'confirmed' } },
        {
          $group: {
            _id: null,
            totalAmount: { $sum: { $toDouble: '$amount' } },
            avgAmount: { $avg: { $toDouble: '$amount' } }
          }
        }
      ]);

      // Get category breakdown
      const categoryBreakdown = await Transaction.aggregate([
        { $match: { type: 'spending', status: 'confirmed' } },
        {
          $group: {
            _id: '$category',
            totalAmount: { $sum: { $toDouble: '$amount' } },
            transactionCount: { $sum: 1 }
          }
        }
      ]);

      // Get recent activity (last 30 days)
      const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
      const recentActivity = await Transaction.countDocuments({
        createdAt: { $gte: thirtyDaysAgo }
      });

      res.json({
        success: true,
        data: {
          overview: {
            totalUsers,
            totalDonations,
            totalSpending,
            totalTransactions,
            pendingApplications,
            approvedBeneficiaries,
            verifiedVendors,
            recentActivity
          },
          financial: {
            totalDonated: donationStats[0]?.totalAmount?.toString() || '0',
            totalSpent: spendingStats[0]?.totalAmount?.toString() || '0',
            avgDonation: donationStats[0]?.avgAmount?.toString() || '0',
            avgSpending: spendingStats[0]?.avgAmount?.toString() || '0',
            availableFunds: ((donationStats[0]?.totalAmount || 0) - (spendingStats[0]?.totalAmount || 0)).toString()
          },
          categories: categoryBreakdown.map(cat => ({
            category: cat._id,
            totalSpent: cat.totalAmount.toString(),
            transactionCount: cat.transactionCount
          })),
          lastUpdated: new Date()
        }
      });

    } catch (error) {
      console.error('Stats retrieval error:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to retrieve system statistics'
      });
    }
  }
);

/**
 * @route   GET /api/admin/users
 * @desc    Get user management data
 * @access  Private (Admin only)
 */
router.get('/users',
  authenticateToken,
  requireAdmin,
  async (req, res) => {
    try {
      const { role, status, page = 1, limit = 50 } = req.query;
      const skip = (parseInt(page) - 1) * parseInt(limit);

      // Build query
      const query = {};
      if (role) query.role = role;
      if (status) query['profile.verificationStatus'] = status;

      const users = await User.find(query)
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(parseInt(limit))
        .select('-__v')
        .lean();

      const totalCount = await User.countDocuments(query);

      res.json({
        success: true,
        data: {
          users: users.map(user => ({
            id: user._id,
            address: user.address,
            role: user.role,
            name: user.profile?.name || 'Unknown',
            email: user.profile?.email,
            verificationStatus: user.profile?.verificationStatus,
            isActive: user.isActive,
            createdAt: user.createdAt,
            lastActive: user.lastActive,
            totalDonated: user.totalDonated || '0',
            totalReceived: user.totalReceived || '0'
          })),
          pagination: {
            currentPage: parseInt(page),
            totalPages: Math.ceil(totalCount / parseInt(limit)),
            totalCount,
            limit: parseInt(limit)
          }
        }
      });

    } catch (error) {
      console.error('Users retrieval error:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to retrieve users'
      });
    }
  }
);

/**
 * @route   POST /api/admin/users/:userId/role
 * @desc    Assign or revoke user roles
 * @access  Private (Admin only)
 */
router.post('/users/:userId/role',
  authenticateToken,
  requireAdmin,
  validationSchemas.admin.roleAssignment,
  handleValidationErrors,
  async (req, res) => {
    try {
      const { userId } = req.params;
      const { role, action } = req.body;
      const adminAddress = req.user.address;
      const io = req.app.get('io');

      const user = await User.findById(userId);
      if (!user) {
        return res.status(404).json({
          success: false,
          message: 'User not found'
        });
      }

      if (action === 'grant') {
        user.role = role;
        if (role === 'verifier' || role === 'admin') {
          user.profile.verificationStatus = 'verified';
        }
      } else if (action === 'revoke') {
        user.role = 'user'; // Default role
        user.profile.verificationStatus = 'pending';
      }

      await user.save();

      // Emit real-time update
      const websocketService = req.app.get('websocket');
      if (websocketService) {
        websocketService.broadcastToRole('admin', 'role-updated', {
          userId,
          userAddress: user.address,
          newRole: user.role,
          action,
          adminAddress,
          timestamp: new Date()
        });
      }

      res.json({
        success: true,
        data: {
          userId,
          userAddress: user.address,
          newRole: user.role,
          action,
          message: `Role ${action}ed successfully`
        }
      });

    } catch (error) {
      console.error('Role assignment error:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to update user role'
      });
    }
  }
);

/**
 * @route   POST /api/admin/emergency/pause
 * @desc    Emergency system pause/resume
 * @access  Private (Admin only)
 */
router.post('/emergency/pause',
  authenticateToken,
  requireAdmin,
  async (req, res) => {
    try {
      const { pause = true, reason } = req.body;
      const adminAddress = req.user.address;
      const io = req.app.get('io');

      // In a real system, this would interact with the smart contract
      // For now, we'll store the state in a simple way
      const emergencyState = {
        isPaused: pause,
        pausedAt: pause ? new Date() : null,
        resumedAt: !pause ? new Date() : null,
        pausedBy: pause ? adminAddress : null,
        reason: reason || 'Emergency pause activated'
      };

      // Emit real-time update to all connected clients
      const websocketService = req.app.get('websocket');
      if (websocketService) {
        websocketService.notifySystemAlert({
          type: 'emergency-pause',
          isPaused: pause,
          reason: emergencyState.reason,
          adminAddress,
          timestamp: new Date()
        });
      }

      res.json({
        success: true,
        data: {
          emergencyState,
          message: pause ? 'System paused successfully' : 'System resumed successfully'
        }
      });

    } catch (error) {
      console.error('Emergency control error:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to update emergency state'
      });
    }
  }
);

/**
 * @route   GET /api/admin/websocket/stats
 * @desc    Get WebSocket connection statistics
 * @access  Private (Admin only)
 */
router.get('/websocket/stats',
  authenticateToken,
  requireAdmin,
  async (req, res) => {
    try {
      const websocketService = req.app.get('websocket');
      
      if (!websocketService) {
        return res.status(503).json({
          success: false,
          message: 'WebSocket service not available'
        });
      }

      const stats = websocketService.getConnectionStats();

      res.json({
        success: true,
        data: {
          ...stats,
          timestamp: new Date().toISOString()
        }
      });

    } catch (error) {
      console.error('WebSocket stats error:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to retrieve WebSocket statistics'
      });
    }
  }
);

/**
 * @route   GET /api/admin/audit/logs
 * @desc    Get system audit logs
 * @access  Private (Admin only)
 */
router.get('/audit/logs',
  authenticateToken,
  requireAdmin,
  async (req, res) => {
    try {
      const { 
        page = 1, 
        limit = 100, 
        action, 
        user, 
        startDate, 
        endDate 
      } = req.query;
      
      const skip = (parseInt(page) - 1) * parseInt(limit);

      // Build query for audit-relevant transactions and activities
      const query = {};
      
      if (startDate || endDate) {
        query.createdAt = {};
        if (startDate) query.createdAt.$gte = new Date(startDate);
        if (endDate) query.createdAt.$lte = new Date(endDate);
      }

      // Get recent transactions as audit logs
      const auditLogs = await Transaction.find(query)
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(parseInt(limit))
        .lean();

      // Get applications as audit logs
      const applicationLogs = await Application.find(query)
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(parseInt(limit))
        .lean();

      // Combine and format audit logs
      const combinedLogs = [
        ...auditLogs.map(tx => ({
          id: tx._id,
          type: 'transaction',
          action: tx.type,
          user: tx.from,
          target: tx.to,
          amount: tx.amount,
          status: tx.status,
          timestamp: tx.createdAt,
          metadata: tx.metadata
        })),
        ...applicationLogs.map(app => ({
          id: app._id,
          type: 'application',
          action: app.status,
          user: app.applicantAddress,
          target: app.reviewedBy,
          amount: app.requestedAmount,
          status: app.status,
          timestamp: app.createdAt,
          metadata: { priority: app.priority, location: app.location }
        }))
      ].sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));

      const totalCount = auditLogs.length + applicationLogs.length;

      res.json({
        success: true,
        data: {
          logs: combinedLogs.slice(0, parseInt(limit)),
          pagination: {
            currentPage: parseInt(page),
            totalPages: Math.ceil(totalCount / parseInt(limit)),
            totalCount,
            limit: parseInt(limit)
          }
        }
      });

    } catch (error) {
      console.error('Audit logs error:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to retrieve audit logs'
      });
    }
  }
);

export default router;