import express from 'express';
import { authenticateToken, requireAdmin, requireVerifier } from '../middleware/auth.js';
import { validationSchemas, handleValidationErrors, businessRules } from '../services/validation.js';
import blockchainService from '../services/blockchain.js';
import Application from '../models/Application.js';
import Transaction from '../models/Transaction.js';
import User from '../models/User.js';
import CategoryLimit from '../models/CategoryLimit.js';

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
 * @desc    Approve or reject vendor application with category-specific approval
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
      const { decision, comments, approvedCategories = [] } = req.body;
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
        
        // Set approved categories
        if (approvedCategories.length > 0) {
          vendor.profile.approvedCategories = approvedCategories;
          vendor.profile.categories = approvedCategories; // Update main categories field
        }
        
        // Set category approval metadata
        vendor.profile.categoryApproval = {
          approvedBy: reviewerAddress,
          approvedAt: new Date(),
          approvedCategories: approvedCategories,
          notes: comments
        };
      }

      await vendor.save();

      // Emit real-time update
      const websocketService = req.app.get('websocket');
      if (websocketService) {
        websocketService.broadcastToRole('admin', 'vendor-reviewed', {
          vendorId,
          vendorAddress: vendor.address,
          decision,
          approvedCategories,
          reviewerAddress,
          timestamp: new Date()
        });

        if (decision === 'approve') {
          websocketService.notifyVendorApproved({
            address: vendor.address,
            businessName: vendor.profile?.businessName,
            approvedCategories
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
          approvedCategories,
          reviewedAt: vendor.profile.reviewedAt,
          message: `Vendor ${decision}d successfully${approvedCategories.length > 0 ? ` with ${approvedCategories.length} approved categories` : ''}`
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
 * @route   POST /api/admin/verifier/vendors/bulk-approve
 * @desc    Bulk approve multiple vendors with category assignments
 * @access  Private (Verifier/Admin only)
 */
router.post('/verifier/vendors/bulk-approve',
  authenticateToken,
  requireVerifier,
  async (req, res) => {
    try {
      const { vendorApprovals, globalComments } = req.body;
      const reviewerAddress = req.user.address;
      const io = req.app.get('io');

      if (!Array.isArray(vendorApprovals) || vendorApprovals.length === 0) {
        return res.status(400).json({
          success: false,
          message: 'No vendor approvals provided'
        });
      }

      const results = [];
      const errors = [];

      for (const approval of vendorApprovals) {
        try {
          const { vendorId, decision, approvedCategories = [], comments } = approval;

          const vendor = await User.findById(vendorId);
          if (!vendor || vendor.role !== 'vendor') {
            errors.push({ vendorId, error: 'Vendor not found' });
            continue;
          }

          if (vendor.profile.verificationStatus !== 'pending') {
            errors.push({ vendorId, error: 'Vendor already reviewed' });
            continue;
          }

          // Update vendor status
          vendor.profile.verificationStatus = decision === 'approve' ? 'verified' : 'rejected';
          vendor.profile.reviewedAt = new Date();
          vendor.profile.reviewedBy = reviewerAddress;
          vendor.profile.reviewNotes = comments || globalComments || 'Bulk approval';

          if (decision === 'approve') {
            vendor.isActive = true;
            
            if (approvedCategories.length > 0) {
              vendor.profile.approvedCategories = approvedCategories;
              vendor.profile.categories = approvedCategories;
            }
            
            vendor.profile.categoryApproval = {
              approvedBy: reviewerAddress,
              approvedAt: new Date(),
              approvedCategories: approvedCategories,
              notes: comments || globalComments || 'Bulk approval'
            };
          }

          await vendor.save();

          results.push({
            vendorId,
            vendorAddress: vendor.address,
            decision,
            approvedCategories,
            status: 'success'
          });

          // Emit individual notifications
          if (websocketService) {
            websocketService.broadcastToRole('admin', 'vendor-reviewed', {
              vendorId,
              vendorAddress: vendor.address,
              decision,
              approvedCategories,
              reviewerAddress,
              timestamp: new Date()
            });

            if (decision === 'approve') {
              websocketService.notifyVendorApproved({
                address: vendor.address,
                businessName: vendor.profile?.businessName,
                approvedCategories
              });
            }
          }

        } catch (error) {
          console.error(`Error processing vendor ${approval.vendorId}:`, error);
          errors.push({ 
            vendorId: approval.vendorId, 
            error: error.message || 'Processing failed' 
          });
        }
      }

      // Emit bulk completion notification
      const websocketService = req.app.get('websocket');
      if (websocketService) {
        websocketService.broadcastToRole('admin', 'bulk-vendor-approval-complete', {
          totalProcessed: vendorApprovals.length,
          successful: results.length,
          failed: errors.length,
          reviewerAddress,
          timestamp: new Date()
        });
      }

      res.json({
        success: true,
        data: {
          totalProcessed: vendorApprovals.length,
          successful: results.length,
          failed: errors.length,
          results,
          errors,
          message: `Bulk approval completed: ${results.length} successful, ${errors.length} failed`
        }
      });

    } catch (error) {
      console.error('Bulk vendor approval error:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to process bulk vendor approval'
      });
    }
  }
);

/**
 * @route   PUT /api/admin/verifier/vendors/:vendorId/categories
 * @desc    Update vendor's approved categories
 * @access  Private (Verifier/Admin only)
 */
router.put('/verifier/vendors/:vendorId/categories',
  authenticateToken,
  requireVerifier,
  async (req, res) => {
    try {
      const { vendorId } = req.params;
      const { categories, reason } = req.body;
      const reviewerAddress = req.user.address;

      if (!Array.isArray(categories)) {
        return res.status(400).json({
          success: false,
          message: 'Categories must be an array'
        });
      }

      const vendor = await User.findById(vendorId);
      if (!vendor || vendor.role !== 'vendor') {
        return res.status(404).json({
          success: false,
          message: 'Vendor not found'
        });
      }

      if (vendor.profile.verificationStatus !== 'verified') {
        return res.status(400).json({
          success: false,
          message: 'Vendor must be verified to update categories'
        });
      }

      // Update categories
      const previousCategories = vendor.profile.approvedCategories || [];
      vendor.profile.approvedCategories = categories;
      vendor.profile.categories = categories;
      
      // Update category approval metadata
      vendor.profile.categoryApproval = {
        ...vendor.profile.categoryApproval,
        lastUpdatedBy: reviewerAddress,
        lastUpdatedAt: new Date(),
        updateReason: reason || 'Category update',
        previousCategories,
        currentCategories: categories
      };

      await vendor.save();

      // Emit real-time update
      const websocketService = req.app.get('websocket');
      if (websocketService) {
        websocketService.broadcastToRole('admin', 'vendor-categories-updated', {
          vendorId,
          vendorAddress: vendor.address,
          previousCategories,
          newCategories: categories,
          updatedBy: reviewerAddress,
          timestamp: new Date()
        });
      }

      res.json({
        success: true,
        data: {
          vendorId,
          vendorAddress: vendor.address,
          previousCategories,
          newCategories: categories,
          updatedAt: new Date(),
          message: 'Vendor categories updated successfully'
        }
      });

    } catch (error) {
      console.error('Vendor category update error:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to update vendor categories'
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

// =============================================================================
// CATEGORY MANAGEMENT ENDPOINTS (Task 2.2 & 3.1)
// =============================================================================

/**
 * @route   GET /api/admin/categories/limits
 * @desc    Get category spending limits
 * @access  Private (Admin only)
 */
router.get('/categories/limits',
  authenticateToken,
  requireAdmin,
  async (req, res) => {
    try {
      const limits = await CategoryLimit.getActiveLimits();

      // If no limits exist, create default ones
      if (limits.length === 0) {
        const defaultLimits = await CategoryLimit.createDefaultLimits(req.user.address);
        return res.json({
          success: true,
          data: {
            limits: defaultLimits.map(limit => ({
              id: limit._id,
              category: limit.category,
              dailyLimit: limit.getDailyLimitInUnits(),
              weeklyLimit: limit.getWeeklyLimitInUnits(),
              monthlyLimit: limit.getMonthlyLimitInUnits(),
              perTransactionLimit: limit.getPerTransactionLimitInUnits(),
              isActive: limit.isActive,
              emergencyOverride: limit.isEmergencyOverrideActive(),
              createdAt: limit.createdAt,
              updatedAt: limit.updatedAt,
              metadata: limit.metadata
            })),
            message: 'Default category limits created'
          }
        });
      }

      res.json({
        success: true,
        data: {
          limits: limits.map(limit => ({
            id: limit._id,
            category: limit.category,
            dailyLimit: limit.getDailyLimitInUnits(),
            weeklyLimit: limit.getWeeklyLimitInUnits(),
            monthlyLimit: limit.getMonthlyLimitInUnits(),
            perTransactionLimit: limit.getPerTransactionLimitInUnits(),
            isActive: limit.isActive,
            emergencyOverride: limit.isEmergencyOverrideActive(),
            createdAt: limit.createdAt,
            updatedAt: limit.updatedAt,
            metadata: limit.metadata
          }))
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

/**
 * @route   PUT /api/admin/categories/limits/:category
 * @desc    Update category spending limits
 * @access  Private (Admin only)
 */
router.put('/categories/limits/:category',
  authenticateToken,
  requireAdmin,
  async (req, res) => {
    try {
      const { category } = req.params;
      const { 
        dailyLimit, 
        weeklyLimit, 
        monthlyLimit, 
        perTransactionLimit, 
        isActive = true,
        reason 
      } = req.body;
      const adminAddress = req.user.address;

      // Validate category
      const validCategories = ['Food', 'Medical', 'Shelter', 'Water', 'Clothing', 'Emergency Supplies'];
      if (!validCategories.includes(category)) {
        return res.status(400).json({
          success: false,
          message: 'Invalid category'
        });
      }

      // Validate limits
      if (dailyLimit < 0 || weeklyLimit < 0 || monthlyLimit < 0 || perTransactionLimit < 0) {
        return res.status(400).json({
          success: false,
          message: 'Limits must be positive numbers'
        });
      }

      // Convert to wei
      const dailyLimitWei = (parseFloat(dailyLimit) * Math.pow(10, 18)).toString();
      const weeklyLimitWei = (parseFloat(weeklyLimit) * Math.pow(10, 18)).toString();
      const monthlyLimitWei = (parseFloat(monthlyLimit) * Math.pow(10, 18)).toString();
      const perTransactionLimitWei = (parseFloat(perTransactionLimit) * Math.pow(10, 18)).toString();

      // Update or create limit
      const limit = await CategoryLimit.findOneAndUpdate(
        { category },
        {
          dailyLimit: dailyLimitWei,
          weeklyLimit: weeklyLimitWei,
          monthlyLimit: monthlyLimitWei,
          perTransactionLimit: perTransactionLimitWei,
          isActive,
          updatedBy: adminAddress,
          'metadata.reason': reason || 'Admin update'
        },
        { 
          new: true, 
          upsert: true,
          setDefaultsOnInsert: true
        }
      );

      // If creating new, set createdBy
      if (!limit.createdBy) {
        limit.createdBy = adminAddress;
        await limit.save();
      }

      // Emit real-time update
      const websocketService = req.app.get('websocket');
      if (websocketService) {
        websocketService.broadcastToRole('admin', 'category-limits-updated', {
          category,
          limits: {
            dailyLimit: parseFloat(dailyLimit),
            weeklyLimit: parseFloat(weeklyLimit),
            monthlyLimit: parseFloat(monthlyLimit),
            perTransactionLimit: parseFloat(perTransactionLimit)
          },
          updatedBy: adminAddress,
          timestamp: new Date()
        });
      }

      res.json({
        success: true,
        data: {
          category,
          dailyLimit: limit.getDailyLimitInUnits(),
          weeklyLimit: limit.getWeeklyLimitInUnits(),
          monthlyLimit: limit.getMonthlyLimitInUnits(),
          perTransactionLimit: limit.getPerTransactionLimitInUnits(),
          isActive: limit.isActive,
          updatedAt: limit.updatedAt,
          message: 'Category limits updated successfully'
        }
      });

    } catch (error) {
      console.error('Category limits update error:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to update category limits'
      });
    }
  }
);

/**
 * @route   POST /api/admin/categories/limits/:category/emergency-override
 * @desc    Set emergency override for category limits
 * @access  Private (Admin only)
 */
router.post('/categories/limits/:category/emergency-override',
  authenticateToken,
  requireAdmin,
  async (req, res) => {
    try {
      const { category } = req.params;
      const { enable = true, reason, expiryHours = 24 } = req.body;
      const adminAddress = req.user.address;

      const limit = await CategoryLimit.findOne({ category });
      if (!limit) {
        return res.status(404).json({
          success: false,
          message: 'Category limit not found'
        });
      }

      // Set emergency override
      limit.metadata = limit.metadata || {};
      limit.metadata.emergencyOverride = enable;
      limit.metadata.overrideReason = reason || 'Emergency override activated';
      
      if (enable) {
        limit.metadata.overrideExpiry = new Date(Date.now() + expiryHours * 60 * 60 * 1000);
      } else {
        limit.metadata.overrideExpiry = null;
      }

      limit.updatedBy = adminAddress;
      await limit.save();

      // Emit real-time alert
      const websocketService = req.app.get('websocket');
      if (websocketService) {
        websocketService.notifySystemAlert({
          type: 'emergency-override',
          category,
          enabled: enable,
          reason: limit.metadata.overrideReason,
          expiryTime: limit.metadata.overrideExpiry,
          adminAddress,
          timestamp: new Date()
        });
      }

      res.json({
        success: true,
        data: {
          category,
          emergencyOverride: enable,
          reason: limit.metadata.overrideReason,
          expiryTime: limit.metadata.overrideExpiry,
          message: enable ? 'Emergency override activated' : 'Emergency override deactivated'
        }
      });

    } catch (error) {
      console.error('Emergency override error:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to set emergency override'
      });
    }
  }
);

/**
 * @route   GET /api/admin/categories/usage
 * @desc    Get category usage statistics and limit compliance
 * @access  Private (Admin only)
 */
router.get('/categories/usage',
  authenticateToken,
  requireAdmin,
  async (req, res) => {
    try {
      const { timeframe = 'daily' } = req.query;
      
      // Calculate time ranges
      const now = new Date();
      let startDate;
      
      switch (timeframe) {
        case 'daily':
          startDate = new Date(now.getFullYear(), now.getMonth(), now.getDate());
          break;
        case 'weekly':
          startDate = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
          break;
        case 'monthly':
          startDate = new Date(now.getFullYear(), now.getMonth(), 1);
          break;
        default:
          startDate = new Date(now.getTime() - 24 * 60 * 60 * 1000);
      }

      // Get spending by category in timeframe
      const categoryUsage = await Transaction.aggregate([
        {
          $match: {
            type: 'spending',
            status: 'confirmed',
            createdAt: { $gte: startDate }
          }
        },
        {
          $group: {
            _id: '$category',
            totalSpent: { $sum: { $toDouble: '$amount' } },
            transactionCount: { $sum: 1 },
            avgTransaction: { $avg: { $toDouble: '$amount' } },
            maxTransaction: { $max: { $toDouble: '$amount' } }
          }
        }
      ]);

      // Get category limits
      const limits = await CategoryLimit.getActiveLimits();
      const limitMap = limits.reduce((map, limit) => {
        map[limit.category] = limit;
        return map;
      }, {});

      // Calculate compliance and usage percentages
      const usageAnalysis = categoryUsage.map(usage => {
        const category = usage._id;
        const limit = limitMap[category];
        
        if (!limit) {
          return {
            category,
            totalSpent: (usage.totalSpent / Math.pow(10, 18)).toFixed(2),
            transactionCount: usage.transactionCount,
            avgTransaction: (usage.avgTransaction / Math.pow(10, 18)).toFixed(2),
            maxTransaction: (usage.maxTransaction / Math.pow(10, 18)).toFixed(2),
            limitCompliance: 'No limit set',
            usagePercentage: 0,
            status: 'no_limit'
          };
        }

        let applicableLimit;
        switch (timeframe) {
          case 'daily':
            applicableLimit = parseFloat(limit.dailyLimit);
            break;
          case 'weekly':
            applicableLimit = parseFloat(limit.weeklyLimit);
            break;
          case 'monthly':
            applicableLimit = parseFloat(limit.monthlyLimit);
            break;
          default:
            applicableLimit = parseFloat(limit.dailyLimit);
        }

        const usagePercentage = (usage.totalSpent / applicableLimit) * 100;
        const isOverLimit = usage.totalSpent > applicableLimit;
        const isNearLimit = usagePercentage > 80;

        return {
          category,
          totalSpent: (usage.totalSpent / Math.pow(10, 18)).toFixed(2),
          transactionCount: usage.transactionCount,
          avgTransaction: (usage.avgTransaction / Math.pow(10, 18)).toFixed(2),
          maxTransaction: (usage.maxTransaction / Math.pow(10, 18)).toFixed(2),
          limit: (applicableLimit / Math.pow(10, 18)).toFixed(2),
          usagePercentage: usagePercentage.toFixed(1),
          status: isOverLimit ? 'over_limit' : isNearLimit ? 'near_limit' : 'normal',
          emergencyOverride: limit.isEmergencyOverrideActive()
        };
      });

      // Add categories with no usage
      const usedCategories = categoryUsage.map(u => u._id);
      const unusedCategories = limits
        .filter(limit => !usedCategories.includes(limit.category))
        .map(limit => {
          let applicableLimit;
          switch (timeframe) {
            case 'daily':
              applicableLimit = parseFloat(limit.dailyLimit);
              break;
            case 'weekly':
              applicableLimit = parseFloat(limit.weeklyLimit);
              break;
            case 'monthly':
              applicableLimit = parseFloat(limit.monthlyLimit);
              break;
            default:
              applicableLimit = parseFloat(limit.dailyLimit);
          }

          return {
            category: limit.category,
            totalSpent: '0.00',
            transactionCount: 0,
            avgTransaction: '0.00',
            maxTransaction: '0.00',
            limit: (applicableLimit / Math.pow(10, 18)).toFixed(2),
            usagePercentage: '0.0',
            status: 'unused',
            emergencyOverride: limit.isEmergencyOverrideActive()
          };
        });

      const allUsageData = [...usageAnalysis, ...unusedCategories]
        .sort((a, b) => a.category.localeCompare(b.category));

      res.json({
        success: true,
        data: {
          timeframe,
          startDate,
          endDate: now,
          usage: allUsageData,
          summary: {
            totalCategories: allUsageData.length,
            categoriesOverLimit: allUsageData.filter(u => u.status === 'over_limit').length,
            categoriesNearLimit: allUsageData.filter(u => u.status === 'near_limit').length,
            totalSpending: allUsageData.reduce((sum, u) => sum + parseFloat(u.totalSpent), 0).toFixed(2),
            totalTransactions: allUsageData.reduce((sum, u) => sum + u.transactionCount, 0)
          }
        }
      });

    } catch (error) {
      console.error('Category usage analysis error:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to analyze category usage'
      });
    }
  }
);

/**
 * @route   GET /api/admin/categories/analytics
 * @desc    Get detailed category analytics and performance metrics
 * @access  Private (Admin only)
 */
router.get('/categories/analytics',
  authenticateToken,
  requireAdmin,
  async (req, res) => {
    try {
      const { period = '30', category } = req.query;
      const days = parseInt(period);
      const startDate = new Date(Date.now() - days * 24 * 60 * 60 * 1000);

      // Build base query
      const baseQuery = {
        createdAt: { $gte: startDate },
        status: 'confirmed'
      };

      if (category) {
        baseQuery.category = category;
      }

      // Get donation trends by category
      const donationTrends = await Transaction.aggregate([
        {
          $match: {
            ...baseQuery,
            type: 'donation'
          }
        },
        {
          $group: {
            _id: {
              category: '$category',
              date: {
                $dateToString: {
                  format: '%Y-%m-%d',
                  date: '$createdAt'
                }
              }
            },
            totalAmount: { $sum: { $toDouble: '$amount' } },
            transactionCount: { $sum: 1 }
          }
        },
        {
          $sort: { '_id.date': 1 }
        }
      ]);

      // Get spending trends by category
      const spendingTrends = await Transaction.aggregate([
        {
          $match: {
            ...baseQuery,
            type: 'spending'
          }
        },
        {
          $group: {
            _id: {
              category: '$category',
              date: {
                $dateToString: {
                  format: '%Y-%m-%d',
                  date: '$createdAt'
                }
              }
            },
            totalAmount: { $sum: { $toDouble: '$amount' } },
            transactionCount: { $sum: 1 }
          }
        },
        {
          $sort: { '_id.date': 1 }
        }
      ]);

      // Get category efficiency metrics
      const categoryEfficiency = await Transaction.aggregate([
        {
          $match: {
            ...baseQuery,
            $or: [{ type: 'donation' }, { type: 'spending' }]
          }
        },
        {
          $group: {
            _id: {
              category: '$category',
              type: '$type'
            },
            totalAmount: { $sum: { $toDouble: '$amount' } },
            transactionCount: { $sum: 1 }
          }
        },
        {
          $group: {
            _id: '$_id.category',
            donations: {
              $sum: {
                $cond: [
                  { $eq: ['$_id.type', 'donation'] },
                  '$totalAmount',
                  0
                ]
              }
            },
            spending: {
              $sum: {
                $cond: [
                  { $eq: ['$_id.type', 'spending'] },
                  '$totalAmount',
                  0
                ]
              }
            },
            donationCount: {
              $sum: {
                $cond: [
                  { $eq: ['$_id.type', 'donation'] },
                  '$transactionCount',
                  0
                ]
              }
            },
            spendingCount: {
              $sum: {
                $cond: [
                  { $eq: ['$_id.type', 'spending'] },
                  '$transactionCount',
                  0
                ]
              }
            }
          }
        },
        {
          $addFields: {
            utilizationRate: {
              $cond: [
                { $gt: ['$donations', 0] },
                { $multiply: [{ $divide: ['$spending', '$donations'] }, 100] },
                0
              ]
            },
            avgDonation: {
              $cond: [
                { $gt: ['$donationCount', 0] },
                { $divide: ['$donations', '$donationCount'] },
                0
              ]
            },
            avgSpending: {
              $cond: [
                { $gt: ['$spendingCount', 0] },
                { $divide: ['$spending', '$spendingCount'] },
                0
              ]
            }
          }
        }
      ]);

      // Get vendor participation by category
      const vendorParticipation = await Transaction.aggregate([
        {
          $match: {
            ...baseQuery,
            type: 'spending'
          }
        },
        {
          $group: {
            _id: {
              category: '$category',
              vendor: '$to'
            },
            totalReceived: { $sum: { $toDouble: '$amount' } },
            transactionCount: { $sum: 1 }
          }
        },
        {
          $group: {
            _id: '$_id.category',
            uniqueVendors: { $sum: 1 },
            totalSpent: { $sum: '$totalReceived' },
            avgVendorRevenue: { $avg: '$totalReceived' },
            maxVendorRevenue: { $max: '$totalReceived' }
          }
        }
      ]);

      // Get beneficiary usage patterns by category
      const beneficiaryPatterns = await Transaction.aggregate([
        {
          $match: {
            ...baseQuery,
            type: 'spending'
          }
        },
        {
          $group: {
            _id: {
              category: '$category',
              beneficiary: '$from'
            },
            totalSpent: { $sum: { $toDouble: '$amount' } },
            transactionCount: { $sum: 1 }
          }
        },
        {
          $group: {
            _id: '$_id.category',
            uniqueBeneficiaries: { $sum: 1 },
            totalSpent: { $sum: '$totalSpent' },
            avgBeneficiarySpending: { $avg: '$totalSpent' },
            maxBeneficiarySpending: { $max: '$totalSpent' }
          }
        }
      ]);

      // Calculate category performance scores
      const categoryPerformance = categoryEfficiency.map(cat => {
        const vendor = vendorParticipation.find(v => v._id === cat._id) || {};
        const beneficiary = beneficiaryPatterns.find(b => b._id === cat._id) || {};
        
        // Performance scoring (0-100)
        const utilizationScore = Math.min(cat.utilizationRate || 0, 100);
        const diversityScore = Math.min((vendor.uniqueVendors || 0) * 10, 100);
        const adoptionScore = Math.min((beneficiary.uniqueBeneficiaries || 0) * 5, 100);
        const overallScore = (utilizationScore + diversityScore + adoptionScore) / 3;

        return {
          category: cat._id,
          donations: (cat.donations / Math.pow(10, 18)).toFixed(2),
          spending: (cat.spending / Math.pow(10, 18)).toFixed(2),
          utilizationRate: cat.utilizationRate.toFixed(1),
          avgDonation: (cat.avgDonation / Math.pow(10, 18)).toFixed(2),
          avgSpending: (cat.avgSpending / Math.pow(10, 18)).toFixed(2),
          uniqueVendors: vendor.uniqueVendors || 0,
          uniqueBeneficiaries: beneficiary.uniqueBeneficiaries || 0,
          performanceScore: overallScore.toFixed(1),
          scores: {
            utilization: utilizationScore.toFixed(1),
            diversity: diversityScore.toFixed(1),
            adoption: adoptionScore.toFixed(1)
          }
        };
      });

      // Format trend data for charts
      const formatTrendData = (trends) => {
        const trendMap = {};
        trends.forEach(trend => {
          const category = trend._id.category || 'Unknown';
          const date = trend._id.date;
          
          if (!trendMap[category]) {
            trendMap[category] = [];
          }
          
          trendMap[category].push({
            date,
            amount: (trend.totalAmount / Math.pow(10, 18)).toFixed(2),
            transactions: trend.transactionCount
          });
        });
        return trendMap;
      };

      res.json({
        success: true,
        data: {
          period: `${days} days`,
          startDate,
          endDate: new Date(),
          donationTrends: formatTrendData(donationTrends),
          spendingTrends: formatTrendData(spendingTrends),
          categoryPerformance: categoryPerformance.sort((a, b) => b.performanceScore - a.performanceScore),
          summary: {
            totalCategories: categoryPerformance.length,
            avgUtilizationRate: (categoryPerformance.reduce((sum, cat) => sum + parseFloat(cat.utilizationRate), 0) / categoryPerformance.length).toFixed(1),
            topPerformingCategory: categoryPerformance[0]?.category || 'None',
            totalVendors: vendorParticipation.reduce((sum, v) => sum + v.uniqueVendors, 0),
            totalBeneficiaries: beneficiaryPatterns.reduce((sum, b) => sum + b.uniqueBeneficiaries, 0)
          }
        }
      });

    } catch (error) {
      console.error('Category analytics error:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to generate category analytics'
      });
    }
  }
);

/**
 * @route   GET /api/admin/categories/impact-report
 * @desc    Generate category-specific impact reports
 * @access  Private (Admin only)
 */
router.get('/categories/impact-report',
  authenticateToken,
  requireAdmin,
  async (req, res) => {
    try {
      const { category, startDate, endDate, format = 'json' } = req.query;
      
      const start = startDate ? new Date(startDate) : new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
      const end = endDate ? new Date(endDate) : new Date();

      // Build query
      const query = {
        createdAt: { $gte: start, $lte: end },
        status: 'confirmed'
      };

      if (category) {
        query.category = category;
      }

      // Get comprehensive impact data
      const [
        donationImpact,
        spendingImpact,
        beneficiaryImpact,
        vendorImpact,
        geographicImpact
      ] = await Promise.all([
        // Donation impact
        Transaction.aggregate([
          { $match: { ...query, type: 'donation' } },
          {
            $group: {
              _id: '$category',
              totalDonated: { $sum: { $toDouble: '$amount' } },
              donationCount: { $sum: 1 },
              uniqueDonors: { $addToSet: '$from' },
              avgDonation: { $avg: { $toDouble: '$amount' } },
              maxDonation: { $max: { $toDouble: '$amount' } },
              minDonation: { $min: { $toDouble: '$amount' } }
            }
          },
          {
            $addFields: {
              uniqueDonorCount: { $size: '$uniqueDonors' }
            }
          }
        ]),

        // Spending impact
        Transaction.aggregate([
          { $match: { ...query, type: 'spending' } },
          {
            $group: {
              _id: '$category',
              totalSpent: { $sum: { $toDouble: '$amount' } },
              spendingCount: { $sum: 1 },
              uniqueBeneficiaries: { $addToSet: '$from' },
              avgSpending: { $avg: { $toDouble: '$amount' } },
              maxSpending: { $max: { $toDouble: '$amount' } },
              minSpending: { $min: { $toDouble: '$amount' } }
            }
          },
          {
            $addFields: {
              uniqueBeneficiaryCount: { $size: '$uniqueBeneficiaries' }
            }
          }
        ]),

        // Beneficiary impact
        Transaction.aggregate([
          { $match: { ...query, type: 'spending' } },
          {
            $group: {
              _id: {
                category: '$category',
                beneficiary: '$from'
              },
              totalReceived: { $sum: { $toDouble: '$amount' } },
              transactionCount: { $sum: 1 }
            }
          },
          {
            $group: {
              _id: '$_id.category',
              beneficiaryCount: { $sum: 1 },
              avgBeneficiaryAid: { $avg: '$totalReceived' },
              totalAidDistributed: { $sum: '$totalReceived' },
              avgTransactionsPerBeneficiary: { $avg: '$transactionCount' }
            }
          }
        ]),

        // Vendor impact
        Transaction.aggregate([
          { $match: { ...query, type: 'spending' } },
          {
            $group: {
              _id: {
                category: '$category',
                vendor: '$to'
              },
              totalEarned: { $sum: { $toDouble: '$amount' } },
              transactionCount: { $sum: 1 }
            }
          },
          {
            $group: {
              _id: '$_id.category',
              vendorCount: { $sum: 1 },
              avgVendorRevenue: { $avg: '$totalEarned' },
              totalVendorRevenue: { $sum: '$totalEarned' },
              avgTransactionsPerVendor: { $avg: '$transactionCount' }
            }
          }
        ]),

        // Geographic impact (mock data - would need location data)
        Promise.resolve([])
      ]);

      // Combine impact data
      const categories = [...new Set([
        ...donationImpact.map(d => d._id),
        ...spendingImpact.map(s => s._id)
      ])].filter(Boolean);

      const impactReport = categories.map(cat => {
        const donation = donationImpact.find(d => d._id === cat) || {};
        const spending = spendingImpact.find(s => s._id === cat) || {};
        const beneficiary = beneficiaryImpact.find(b => b._id === cat) || {};
        const vendor = vendorImpact.find(v => v._id === cat) || {};

        const totalDonated = donation.totalDonated || 0;
        const totalSpent = spending.totalSpent || 0;
        const utilizationRate = totalDonated > 0 ? (totalSpent / totalDonated) * 100 : 0;

        return {
          category: cat,
          financial: {
            totalDonated: (totalDonated / Math.pow(10, 18)).toFixed(2),
            totalSpent: (totalSpent / Math.pow(10, 18)).toFixed(2),
            utilizationRate: utilizationRate.toFixed(1),
            avgDonation: ((donation.avgDonation || 0) / Math.pow(10, 18)).toFixed(2),
            avgSpending: ((spending.avgSpending || 0) / Math.pow(10, 18)).toFixed(2)
          },
          participation: {
            uniqueDonors: donation.uniqueDonorCount || 0,
            uniqueBeneficiaries: spending.uniqueBeneficiaryCount || 0,
            activeVendors: vendor.vendorCount || 0,
            totalTransactions: (donation.donationCount || 0) + (spending.spendingCount || 0)
          },
          efficiency: {
            avgAidPerBeneficiary: ((beneficiary.avgBeneficiaryAid || 0) / Math.pow(10, 18)).toFixed(2),
            avgRevenuePerVendor: ((vendor.avgVendorRevenue || 0) / Math.pow(10, 18)).toFixed(2),
            avgTransactionsPerBeneficiary: (beneficiary.avgTransactionsPerBeneficiary || 0).toFixed(1),
            avgTransactionsPerVendor: (vendor.avgTransactionsPerVendor || 0).toFixed(1)
          }
        };
      });

      const reportSummary = {
        reportPeriod: {
          startDate: start.toISOString(),
          endDate: end.toISOString(),
          durationDays: Math.ceil((end - start) / (1000 * 60 * 60 * 24))
        },
        overallImpact: {
          totalCategories: categories.length,
          totalDonated: impactReport.reduce((sum, cat) => sum + parseFloat(cat.financial.totalDonated), 0).toFixed(2),
          totalSpent: impactReport.reduce((sum, cat) => sum + parseFloat(cat.financial.totalSpent), 0).toFixed(2),
          totalBeneficiaries: impactReport.reduce((sum, cat) => sum + cat.participation.uniqueBeneficiaries, 0),
          totalVendors: impactReport.reduce((sum, cat) => sum + cat.participation.activeVendors, 0),
          avgUtilizationRate: (impactReport.reduce((sum, cat) => sum + parseFloat(cat.financial.utilizationRate), 0) / impactReport.length).toFixed(1)
        },
        topPerformers: {
          mostDonated: impactReport.sort((a, b) => parseFloat(b.financial.totalDonated) - parseFloat(a.financial.totalDonated))[0]?.category || 'None',
          mostUtilized: impactReport.sort((a, b) => parseFloat(b.financial.utilizationRate) - parseFloat(a.financial.utilizationRate))[0]?.category || 'None',
          mostBeneficiaries: impactReport.sort((a, b) => b.participation.uniqueBeneficiaries - a.participation.uniqueBeneficiaries)[0]?.category || 'None'
        }
      };

      res.json({
        success: true,
        data: {
          summary: reportSummary,
          categoryImpact: impactReport.sort((a, b) => parseFloat(b.financial.totalDonated) - parseFloat(a.financial.totalDonated)),
          generatedAt: new Date().toISOString(),
          reportType: category ? 'category-specific' : 'comprehensive'
        }
      });

    } catch (error) {
      console.error('Impact report generation error:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to generate impact report'
      });
    }
  }
);

// =============================================================================
// FRAUD DETECTION ENDPOINTS (Task 4.2)
// =============================================================================

/**
 * @route   GET /api/admin/fraud/category-analysis
 * @desc    Get category-based fraud detection analysis
 * @access  Private (Admin only)
 */
router.get('/fraud/category-analysis',
  authenticateToken,
  requireAdmin,
  async (req, res) => {
    try {
      const { timeframe = '30', category } = req.query;
      const days = parseInt(timeframe);
      const startDate = new Date(Date.now() - days * 24 * 60 * 60 * 1000);

      // Build query
      const query = {
        createdAt: { $gte: startDate },
        'metadata.fraudFlags': { $exists: true, $ne: [] }
      };

      if (category) {
        query.category = category;
      }

      // Get flagged transactions by category
      const flaggedByCategory = await Transaction.aggregate([
        { $match: query },
        {
          $group: {
            _id: '$category',
            flaggedCount: { $sum: 1 },
            totalAmount: { $sum: { $toDouble: '$amount' } },
            riskLevels: { $push: '$metadata.riskLevel' },
            fraudTypes: { $push: '$metadata.fraudFlags' }
          }
        },
        {
          $addFields: {
            avgAmount: { $divide: ['$totalAmount', '$flaggedCount'] }
          }
        },
        { $sort: { flaggedCount: -1 } }
      ]);

      // Get fraud pattern analysis
      const fraudPatterns = await Transaction.aggregate([
        { $match: query },
        { $unwind: '$metadata.fraudFlags' },
        {
          $group: {
            _id: {
              category: '$category',
              flagType: '$metadata.fraudFlags.type'
            },
            count: { $sum: 1 },
            avgSeverity: { $avg: { $cond: [
              { $eq: ['$metadata.fraudFlags.severity', 'critical'] }, 4,
              { $cond: [
                { $eq: ['$metadata.fraudFlags.severity', 'high'] }, 3,
                { $cond: [
                  { $eq: ['$metadata.fraudFlags.severity', 'medium'] }, 2, 1
                ]}
              ]}
            ]}}
          }
        },
        {
          $group: {
            _id: '$_id.category',
            patterns: {
              $push: {
                type: '$_id.flagType',
                count: '$count',
                avgSeverity: '$avgSeverity'
              }
            }
          }
        }
      ]);

      // Calculate risk scores by category
      const categoryRiskScores = flaggedByCategory.map(cat => {
        const patterns = fraudPatterns.find(p => p._id === cat._id)?.patterns || [];
        
        // Calculate risk distribution
        const riskDistribution = { critical: 0, high: 0, medium: 0, low: 0, minimal: 0 };
        cat.riskLevels.forEach(level => {
          if (riskDistribution.hasOwnProperty(level)) {
            riskDistribution[level]++;
          }
        });

        // Calculate overall risk score
        const totalTransactions = cat.flaggedCount;
        const riskScore = (
          (riskDistribution.critical * 4) +
          (riskDistribution.high * 3) +
          (riskDistribution.medium * 2) +
          (riskDistribution.low * 1)
        ) / totalTransactions;

        return {
          category: cat._id,
          flaggedCount: cat.flaggedCount,
          totalAmount: (cat.totalAmount / Math.pow(10, 18)).toFixed(2),
          avgAmount: (cat.avgAmount / Math.pow(10, 18)).toFixed(2),
          riskScore: riskScore.toFixed(2),
          riskDistribution,
          fraudPatterns: patterns.sort((a, b) => b.count - a.count),
          topFraudType: patterns.length > 0 ? patterns[0].type : 'None'
        };
      });

      // Get time-based fraud trends
      const fraudTrends = await Transaction.aggregate([
        { $match: query },
        {
          $group: {
            _id: {
              category: '$category',
              date: {
                $dateToString: {
                  format: '%Y-%m-%d',
                  date: '$createdAt'
                }
              }
            },
            flaggedCount: { $sum: 1 },
            totalAmount: { $sum: { $toDouble: '$amount' } }
          }
        },
        { $sort: { '_id.date': 1 } }
      ]);

      // Format trend data
      const trendData = {};
      fraudTrends.forEach(trend => {
        const category = trend._id.category || 'Unknown';
        if (!trendData[category]) {
          trendData[category] = [];
        }
        trendData[category].push({
          date: trend._id.date,
          flaggedCount: trend.flaggedCount,
          amount: (trend.totalAmount / Math.pow(10, 18)).toFixed(2)
        });
      });

      res.json({
        success: true,
        data: {
          timeframe: `${days} days`,
          startDate: startDate.toISOString(),
          endDate: new Date().toISOString(),
          categoryRiskAnalysis: categoryRiskScores,
          fraudTrends: trendData,
          summary: {
            totalFlaggedTransactions: flaggedByCategory.reduce((sum, cat) => sum + cat.flaggedCount, 0),
            totalFlaggedAmount: flaggedByCategory.reduce((sum, cat) => sum + parseFloat(cat.totalAmount), 0).toFixed(2),
            highestRiskCategory: categoryRiskScores[0]?.category || 'None',
            avgRiskScore: categoryRiskScores.length > 0 
              ? (categoryRiskScores.reduce((sum, cat) => sum + parseFloat(cat.riskScore), 0) / categoryRiskScores.length).toFixed(2)
              : '0.00'
          }
        }
      });

    } catch (error) {
      console.error('Category fraud analysis error:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to analyze category fraud patterns'
      });
    }
  }
);

/**
 * @route   GET /api/admin/fraud/alerts
 * @desc    Get real-time fraud alerts and suspicious transactions
 * @access  Private (Admin only)
 */
router.get('/fraud/alerts',
  authenticateToken,
  requireAdmin,
  async (req, res) => {
    try {
      const { severity, category, limit = 50 } = req.query;

      // Build query for suspicious transactions
      const query = {
        'metadata.requiresReview': true,
        status: { $in: ['pending', 'confirmed'] }
      };

      if (category) {
        query.category = category;
      }

      if (severity) {
        query['metadata.riskLevel'] = severity;
      }

      // Get suspicious transactions
      const suspiciousTransactions = await Transaction.find(query)
        .sort({ createdAt: -1 })
        .limit(parseInt(limit))
        .lean();

      // Get user details for transactions
      const addresses = [...new Set([
        ...suspiciousTransactions.map(tx => tx.from),
        ...suspiciousTransactions.map(tx => tx.to)
      ])];

      const users = await User.find({ 
        address: { $in: addresses } 
      }).lean();

      const userMap = users.reduce((map, user) => {
        map[user.address] = user;
        return map;
      }, {});

      // Format alerts
      const alerts = suspiciousTransactions.map(tx => {
        const fromUser = userMap[tx.from];
        const toUser = userMap[tx.to];

        return {
          id: tx._id,
          transactionHash: tx.txHash,
          type: tx.type,
          category: tx.category,
          amount: (parseFloat(tx.amount) / Math.pow(10, 18)).toFixed(2),
          from: {
            address: tx.from,
            name: fromUser?.profile?.name || 'Unknown',
            role: fromUser?.role || 'unknown'
          },
          to: {
            address: tx.to,
            name: toUser?.profile?.name || toUser?.profile?.businessName || 'Unknown',
            role: toUser?.role || 'unknown'
          },
          riskLevel: tx.metadata?.riskLevel || 'unknown',
          riskScore: tx.metadata?.fraudAnalysis?.riskScore || 0,
          fraudFlags: tx.metadata?.fraudFlags || [],
          status: tx.status,
          timestamp: tx.createdAt,
          requiresReview: tx.metadata?.requiresReview || false,
          description: tx.metadata?.description
        };
      });

      // Get alert statistics
      const alertStats = await Transaction.aggregate([
        { $match: { 'metadata.requiresReview': true } },
        {
          $group: {
            _id: '$metadata.riskLevel',
            count: { $sum: 1 }
          }
        }
      ]);

      const stats = { critical: 0, high: 0, medium: 0, low: 0 };
      alertStats.forEach(stat => {
        if (stats.hasOwnProperty(stat._id)) {
          stats[stat._id] = stat.count;
        }
      });

      res.json({
        success: true,
        data: {
          alerts,
          statistics: {
            total: alerts.length,
            byRiskLevel: stats,
            pendingReview: alerts.filter(alert => alert.status === 'pending').length,
            lastUpdated: new Date().toISOString()
          },
          filters: {
            severity,
            category,
            limit: parseInt(limit)
          }
        }
      });

    } catch (error) {
      console.error('Fraud alerts retrieval error:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to retrieve fraud alerts'
      });
    }
  }
);

/**
 * @route   POST /api/admin/fraud/review/:transactionId
 * @desc    Review and resolve fraud alert
 * @access  Private (Admin only)
 */
router.post('/fraud/review/:transactionId',
  authenticateToken,
  requireAdmin,
  async (req, res) => {
    try {
      const { transactionId } = req.params;
      const { decision, notes } = req.body;
      const reviewerAddress = req.user.address;

      if (!['approve', 'reject', 'investigate'].includes(decision)) {
        return res.status(400).json({
          success: false,
          message: 'Invalid decision. Must be approve, reject, or investigate'
        });
      }

      const transaction = await Transaction.findById(transactionId);
      if (!transaction) {
        return res.status(404).json({
          success: false,
          message: 'Transaction not found'
        });
      }

      // Update transaction based on decision
      if (decision === 'approve') {
        transaction.status = 'confirmed';
        transaction.metadata.requiresReview = false;
      } else if (decision === 'reject') {
        transaction.status = 'failed';
        transaction.metadata.requiresReview = false;
      } else if (decision === 'investigate') {
        transaction.status = 'pending';
        transaction.metadata.requiresReview = true;
      }

      // Add review metadata
      transaction.metadata.fraudReview = {
        reviewedBy: reviewerAddress,
        reviewedAt: new Date(),
        decision,
        notes: notes || '',
        previousStatus: transaction.status
      };

      await transaction.save();

      // Emit real-time update
      const websocketService = req.app.get('websocket');
      if (websocketService) {
        websocketService.broadcastToRole('admin', 'fraud-alert-reviewed', {
          transactionId,
          decision,
          reviewerAddress,
          timestamp: new Date()
        });
      }

      res.json({
        success: true,
        data: {
          transactionId,
          decision,
          newStatus: transaction.status,
          reviewedAt: new Date(),
          message: `Transaction ${decision}d successfully`
        }
      });

    } catch (error) {
      console.error('Fraud review error:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to review fraud alert'
      });
    }
  }
);

export default router;