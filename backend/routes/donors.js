import express from 'express';
import { authenticateToken } from '../middleware/auth.js';
import { validationSchemas, handleValidationErrors, businessRules } from '../services/validation.js';
import blockchainService from '../services/blockchain.js';
import Transaction from '../models/Transaction.js';
import User from '../models/User.js';

const router = express.Router();

/**
 * @route   POST /api/donors/donate
 * @desc    Process a donation
 * @access  Private
 */
router.post('/donate', 
  authenticateToken,
  validationSchemas.donation.create,
  handleValidationErrors,
  async (req, res) => {
    try {
      const { amount, category, transactionHash, donor } = req.body;
      const io = req.app.get('io');

      // Verify the donor address matches the authenticated user
      if (donor.toLowerCase() !== req.user.address.toLowerCase()) {
        return res.status(403).json({
          success: false,
          message: 'Donor address does not match authenticated user'
        });
      }

      // Validate donation amount and category
      businessRules.validateDonationAmount(parseFloat(amount));
      
      // Validate category if provided
      const validCategories = ['Food', 'Medical', 'Shelter', 'Water', 'Clothing', 'Emergency Supplies'];
      if (category && !validCategories.includes(category)) {
        return res.status(400).json({
          success: false,
          message: 'Invalid donation category'
        });
      }

      // Check if transaction already exists
      const existingTransaction = await Transaction.findOne({ 
        transactionHash,
        type: 'donation'
      });

      if (existingTransaction) {
        return res.status(409).json({
          success: false,
          message: 'Transaction already recorded'
        });
      }

      // Create transaction record
      const transaction = new Transaction({
        type: 'donation',
        from: donor,
        amount: amount.toString(),
        transactionHash,
        status: 'pending',
        category: category || 'General',
        metadata: {
          donorAddress: donor,
          category: category || 'General',
          timestamp: new Date()
        }
      });

      await transaction.save();

      // Update or create donor user record
      let donorUser = await User.findOne({ address: donor });
      if (!donorUser) {
        donorUser = new User({
          address: donor,
          role: 'user'
        });
      }
      
      donorUser.totalDonated = (parseFloat(donorUser.totalDonated || 0) + parseFloat(amount)).toString();
      donorUser.donationCount = (donorUser.donationCount || 0) + 1;
      donorUser.lastDonation = new Date();
      await donorUser.save();

      // Emit real-time update
      io.emit('donation-received', {
        donor,
        amount,
        category: category || 'General',
        transactionHash,
        timestamp: new Date()
      });

      res.status(201).json({
        success: true,
        data: {
          transactionId: transaction._id,
          transactionHash,
          amount,
          category: category || 'General',
          status: 'pending',
          message: 'Donation recorded successfully'
        }
      });

    } catch (error) {
      console.error('Donation processing error:', error);
      res.status(500).json({
        success: false,
        message: error.message || 'Failed to process donation'
      });
    }
  }
);

/**
 * @route   GET /api/donors/history
 * @desc    Get donation history
 * @access  Private
 */
router.get('/history',
  authenticateToken,
  validationSchemas.donation.history,
  handleValidationErrors,
  async (req, res) => {
    try {
      const { page = 1, limit = 20, donor } = req.query;
      const userAddress = req.user.address;

      // If donor parameter is provided, verify it matches authenticated user
      const queryAddress = donor ? donor.toLowerCase() : userAddress;
      if (queryAddress !== userAddress) {
        return res.status(403).json({
          success: false,
          message: 'Cannot access other users donation history'
        });
      }

      const skip = (parseInt(page) - 1) * parseInt(limit);

      // Get donations from database
      const donations = await Transaction.find({
        type: 'donation',
        from: queryAddress
      })
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(parseInt(limit))
      .lean();

      // Get total count for pagination
      const totalCount = await Transaction.countDocuments({
        type: 'donation',
        from: queryAddress
      });

      // Calculate pagination info
      const totalPages = Math.ceil(totalCount / parseInt(limit));
      const hasNextPage = parseInt(page) < totalPages;
      const hasPrevPage = parseInt(page) > 1;

      // Get user statistics
      const userStats = await User.findOne({ address: queryAddress });
      const totalDonated = userStats?.totalDonated || '0';
      const donationCount = userStats?.donationCount || 0;

      res.json({
        success: true,
        data: {
          donations: donations.map(donation => ({
            id: donation._id,
            amount: donation.amount,
            category: donation.category || donation.metadata?.category || 'General',
            transactionHash: donation.transactionHash,
            status: donation.status,
            timestamp: donation.createdAt,
            metadata: donation.metadata
          })),
          pagination: {
            currentPage: parseInt(page),
            totalPages,
            totalCount,
            hasNextPage,
            hasPrevPage,
            limit: parseInt(limit)
          },
          statistics: {
            totalDonated,
            donationCount,
            averageDonation: donationCount > 0 ? (parseFloat(totalDonated) / donationCount).toFixed(6) : '0'
          }
        }
      });

    } catch (error) {
      console.error('Donation history error:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to retrieve donation history'
      });
    }
  }
);

/**
 * @route   GET /api/donors/impact
 * @desc    Get impact tracking data for donor
 * @access  Private
 */
router.get('/impact',
  authenticateToken,
  async (req, res) => {
    try {
      const userAddress = req.user.address;

      // Get donor's total contributions
      const donorStats = await User.findOne({ address: userAddress });
      const totalDonated = parseFloat(donorStats?.totalDonated || 0);

      if (totalDonated === 0) {
        return res.json({
          success: true,
          data: {
            totalDonated: '0',
            beneficiariesHelped: 0,
            categoriesSupported: [],
            impactMetrics: {
              foodProvided: 0,
              shelterSupported: 0,
              medicalAid: 0,
              educationSupport: 0
            }
          }
        });
      }

      // Get system-wide statistics to calculate proportional impact
      const systemStats = await blockchainService.getDonationStats();
      const totalSystemDonations = parseFloat(systemStats.totalDonations);
      
      // Calculate donor's proportional impact
      const impactRatio = totalSystemDonations > 0 ? totalDonated / totalSystemDonations : 0;

      // Get beneficiaries helped (proportional)
      const totalBeneficiaries = parseInt(systemStats.totalBeneficiaries);
      const beneficiariesHelped = Math.floor(totalBeneficiaries * impactRatio);

      // Get spending by category (aggregate data) with donor's proportional impact
      const categorySpending = await Transaction.aggregate([
        {
          $match: {
            type: 'spending',
            status: 'confirmed',
            category: { $exists: true, $ne: null }
          }
        },
        {
          $group: {
            _id: '$category',
            totalAmount: { $sum: { $toDouble: '$amount' } },
            count: { $sum: 1 }
          }
        }
      ]);

      // Get donor's category-specific donations
      const donorCategoryDonations = await Transaction.aggregate([
        {
          $match: {
            type: 'donation',
            from: userAddress,
            status: 'confirmed',
            category: { $exists: true, $ne: null }
          }
        },
        {
          $group: {
            _id: '$category',
            donorAmount: { $sum: { $toDouble: '$amount' } },
            donorCount: { $sum: 1 }
          }
        }
      ]);

      // Calculate donor's category-specific impact
      const categoriesSupported = donorCategoryDonations.map(donorCat => {
        const systemCat = categorySpending.find(c => c._id === donorCat._id);
        const donorCategoryTotal = donorCat.donorAmount;
        const systemCategoryTotal = systemCat?.totalAmount || 0;
        const categoryImpactRatio = systemCategoryTotal > 0 ? donorCategoryTotal / systemCategoryTotal : 0;
        
        return {
          category: donorCat._id,
          donorContribution: donorCategoryTotal.toFixed(6),
          systemTotal: systemCategoryTotal.toFixed(6),
          impactRatio: categoryImpactRatio.toFixed(6),
          donorTransactions: donorCat.donorCount,
          systemTransactions: systemCat?.count || 0,
          beneficiariesHelped: Math.floor((systemCat?.count || 0) * categoryImpactRatio)
        };
      });

      // Calculate specific impact metrics based on donor's actual category contributions
      const impactMetrics = {};
      donorCategoryDonations.forEach(donorCat => {
        const systemCat = categorySpending.find(c => c._id === donorCat._id);
        const categoryImpactRatio = systemCat?.totalAmount > 0 ? donorCat.donorAmount / systemCat.totalAmount : 0;
        
        switch(donorCat._id.toLowerCase()) {
          case 'food':
            impactMetrics.foodProvided = Math.floor((systemCat?.count || 0) * categoryImpactRatio);
            break;
          case 'shelter':
            impactMetrics.shelterSupported = Math.floor((systemCat?.count || 0) * categoryImpactRatio);
            break;
          case 'medical':
            impactMetrics.medicalAid = Math.floor((systemCat?.count || 0) * categoryImpactRatio);
            break;
          case 'education':
            impactMetrics.educationSupport = Math.floor((systemCat?.count || 0) * categoryImpactRatio);
            break;
        }
      });

      // Set defaults for missing categories
      impactMetrics.foodProvided = impactMetrics.foodProvided || 0;
      impactMetrics.shelterSupported = impactMetrics.shelterSupported || 0;
      impactMetrics.medicalAid = impactMetrics.medicalAid || 0;
      impactMetrics.educationSupport = impactMetrics.educationSupport || 0;

      res.json({
        success: true,
        data: {
          totalDonated: totalDonated.toString(),
          beneficiariesHelped,
          categoriesSupported,
          impactMetrics,
          impactRatio: impactRatio.toFixed(6),
          lastUpdated: new Date()
        }
      });

    } catch (error) {
      console.error('Impact tracking error:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to retrieve impact data'
      });
    }
  }
);

/**
 * @route   GET /api/donors/stats
 * @desc    Get donor statistics and leaderboard position
 * @access  Private
 */
router.get('/stats',
  authenticateToken,
  async (req, res) => {
    try {
      const userAddress = req.user.address;

      // Get donor's statistics
      const donorStats = await User.findOne({ address: userAddress });
      
      if (!donorStats) {
        return res.json({
          success: true,
          data: {
            totalDonated: '0',
            donationCount: 0,
            averageDonation: '0',
            rank: null,
            percentile: 0
          }
        });
      }

      // Get donor's rank (count of donors with higher total donations)
      const higherDonors = await User.countDocuments({
        totalDonated: { $gt: donorStats.totalDonated || 0 },
        donationCount: { $gt: 0 }
      });

      // Get total number of donors
      const totalDonors = await User.countDocuments({
        donationCount: { $gt: 0 }
      });

      const rank = higherDonors + 1;
      const percentile = totalDonors > 0 ? ((totalDonors - rank + 1) / totalDonors * 100).toFixed(1) : 0;

      // Get recent donation trend (last 30 days)
      const thirtyDaysAgo = new Date();
      thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

      const recentDonations = await Transaction.aggregate([
        {
          $match: {
            type: 'donation',
            from: userAddress,
            createdAt: { $gte: thirtyDaysAgo }
          }
        },
        {
          $group: {
            _id: null,
            totalAmount: { $sum: { $toDouble: '$amount' } },
            count: { $sum: 1 }
          }
        }
      ]);

      const recentTotal = recentDonations[0]?.totalAmount || 0;
      const recentCount = recentDonations[0]?.count || 0;

      res.json({
        success: true,
        data: {
          totalDonated: donorStats.totalDonated || '0',
          donationCount: donorStats.donationCount || 0,
          averageDonation: donorStats.donationCount > 0 
            ? (parseFloat(donorStats.totalDonated || 0) / donorStats.donationCount).toFixed(6)
            : '0',
          firstDonation: donorStats.createdAt,
          lastDonation: donorStats.lastDonation,
          rank,
          percentile: parseFloat(percentile),
          totalDonors,
          recentActivity: {
            last30Days: {
              totalAmount: recentTotal.toString(),
              donationCount: recentCount
            }
          }
        }
      });

    } catch (error) {
      console.error('Donor stats error:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to retrieve donor statistics'
      });
    }
  }
);

export default router;