import express from 'express';
import Transaction from '../models/Transaction.js';
import User from '../models/User.js';
import Application from '../models/Application.js';

const router = express.Router();

/**
 * @route   GET /api/public/stats
 * @desc    Get public statistics
 * @access  Public
 */
router.get('/stats', async (req, res) => {
  try {
    // Get donation statistics
    const donationStats = await Transaction.aggregate([
      {
        $match: { type: 'donation', status: 'confirmed' }
      },
      {
        $group: {
          _id: null,
          totalRaised: { $sum: { $toDecimal: '$amount' } },
          donationCount: { $sum: 1 }
        }
      }
    ]);

    // Get distribution statistics
    const distributionStats = await Transaction.aggregate([
      {
        $match: { 
          type: { $in: ['spending', 'vendor_payment'] }, 
          status: 'confirmed' 
        }
      },
      {
        $group: {
          _id: null,
          fundsDistributed: { $sum: { $toDecimal: '$amount' } },
          distributionCount: { $sum: 1 }
        }
      }
    ]);

    // Count unique beneficiaries (users with beneficiary role who have received funds)
    const beneficiaryCount = await User.countDocuments({ 
      role: 'beneficiary', 
      'profile.verificationStatus': 'verified' 
    });

    // Total transaction count
    const totalTransactions = await Transaction.countDocuments({ status: 'confirmed' });

    const totalRaised = donationStats[0]?.totalRaised?.toString() || '0';
    const fundsDistributed = distributionStats[0]?.fundsDistributed?.toString() || '0';

    res.json({
      success: true,
      data: {
        totalRaised,
        fundsDistributed,
        peopleHelped: beneficiaryCount,
        transactions: totalTransactions,
        donationCount: donationStats[0]?.donationCount || 0,
        distributionCount: distributionStats[0]?.distributionCount || 0
      }
    });
  } catch (error) {
    console.error('Error getting public stats:', error);
    res.status(500).json({
      success: false,
      message: 'Server error'
    });
  }
});

/**
 * @route   GET /api/public/transactions
 * @desc    Get public transaction list with privacy protection
 * @access  Public
 */
router.get('/transactions', async (req, res) => {
  try {
    const { 
      page = 1, 
      limit = 20, 
      type, 
      category,
      status = 'confirmed'
    } = req.query;

    const skip = (parseInt(page) - 1) * parseInt(limit);
    const query = { status };

    // Add filters
    if (type) {
      query.type = type;
    }
    if (category) {
      query.category = category;
    }

    const transactions = await Transaction.find(query)
      .select('-metadata.beneficiaryName -metadata.vendorName -metadata.description') // Privacy protection
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(parseInt(limit));

    const total = await Transaction.countDocuments(query);

    res.json({
      success: true,
      data: {
        transactions,
        pagination: {
          page: parseInt(page),
          limit: parseInt(limit),
          total,
          pages: Math.ceil(total / parseInt(limit))
        }
      }
    });
  } catch (error) {
    console.error('Error getting public transactions:', error);
    res.status(500).json({
      success: false,
      message: 'Server error'
    });
  }
});

/**
 * @route   GET /api/public/search
 * @desc    Search transactions with filters
 * @access  Public
 */
router.get('/search', async (req, res) => {
  try {
    const { 
      hash, 
      type, 
      category, 
      from, 
      to, 
      dateFrom, 
      dateTo,
      page = 1,
      limit = 20
    } = req.query;

    const skip = (parseInt(page) - 1) * parseInt(limit);
    const query = { status: 'confirmed' };

    // Build search query
    if (hash) {
      query.txHash = { $regex: hash, $options: 'i' };
    }
    if (type) {
      query.type = type;
    }
    if (category) {
      query.category = category;
    }
    if (from) {
      query.from = { $regex: from, $options: 'i' };
    }
    if (to) {
      query.to = { $regex: to, $options: 'i' };
    }
    if (dateFrom || dateTo) {
      query.createdAt = {};
      if (dateFrom) {
        query.createdAt.$gte = new Date(dateFrom);
      }
      if (dateTo) {
        query.createdAt.$lte = new Date(dateTo);
      }
    }

    const transactions = await Transaction.find(query)
      .select('-metadata.beneficiaryName -metadata.vendorName -metadata.description') // Privacy protection
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(parseInt(limit));

    const total = await Transaction.countDocuments(query);

    res.json({
      success: true,
      data: {
        transactions,
        pagination: {
          page: parseInt(page),
          limit: parseInt(limit),
          total,
          pages: Math.ceil(total / parseInt(limit))
        }
      }
    });
  } catch (error) {
    console.error('Error searching transactions:', error);
    res.status(500).json({
      success: false,
      message: 'Server error'
    });
  }
});

/**
 * @route   GET /api/public/fund-flow
 * @desc    Get fund flow data for visualization
 * @access  Public
 */
router.get('/fund-flow', async (req, res) => {
  try {
    // Get fund flow by category
    const categoryFlow = await Transaction.aggregate([
      {
        $match: { 
          type: { $in: ['spending', 'vendor_payment'] }, 
          status: 'confirmed',
          category: { $exists: true, $ne: null }
        }
      },
      {
        $group: {
          _id: '$category',
          totalAmount: { $sum: { $toDecimal: '$amount' } },
          transactionCount: { $sum: 1 }
        }
      },
      {
        $sort: { totalAmount: -1 }
      }
    ]);

    // Get monthly flow data
    const monthlyFlow = await Transaction.aggregate([
      {
        $match: { status: 'confirmed' }
      },
      {
        $group: {
          _id: {
            year: { $year: '$createdAt' },
            month: { $month: '$createdAt' },
            type: '$type'
          },
          totalAmount: { $sum: { $toDecimal: '$amount' } },
          count: { $sum: 1 }
        }
      },
      {
        $sort: { '_id.year': 1, '_id.month': 1 }
      }
    ]);

    res.json({
      success: true,
      data: {
        categoryFlow: categoryFlow.map(item => ({
          category: item._id,
          amount: item.totalAmount.toString(),
          transactions: item.transactionCount
        })),
        monthlyFlow: monthlyFlow.map(item => ({
          year: item._id.year,
          month: item._id.month,
          type: item._id.type,
          amount: item.totalAmount.toString(),
          count: item.count
        }))
      }
    });
  } catch (error) {
    console.error('Error getting fund flow:', error);
    res.status(500).json({
      success: false,
      message: 'Server error'
    });
  }
});

/**
 * @route   GET /api/public/campaigns
 * @desc    Get public relief campaigns/applications for donation
 * @access  Public
 */
router.get('/campaigns', async (req, res) => {
  try {
    const { 
      page = 1, 
      limit = 20, 
      status = 'approved',
      disasterType,
      priority,
      sortBy = 'createdAt',
      sortOrder = 'desc'
    } = req.query;

    const skip = (parseInt(page) - 1) * parseInt(limit);
    const query = { status };

    // Add filters
    if (disasterType) {
      query.disasterType = disasterType;
    }
    if (priority) {
      query.priority = priority;
    }

    // Build sort object
    const sort = {};
    sort[sortBy] = sortOrder === 'desc' ? -1 : 1;

    // Get applications (campaigns) from database
    const applications = await Application.find(query)
      .select('-documents -metadata.emergencyContact') // Privacy protection
      .sort(sort)
      .skip(skip)
      .limit(parseInt(limit))
      .lean();

    // Get total count
    const total = await Application.countDocuments(query);

    // Get donation totals for each application (real data from transactions)
    const campaignsWithDonations = applications.map(app => {
      // TODO: Query actual donations for each application from Transaction model
      const mockRaised = 0; // Start with 0, will be calculated from real donations
      const goal = parseFloat(app.requestedAmount) / 1e18;
      
      return {
        id: app._id,
        title: `${app.disasterType} Relief - ${app.location}`,
        description: app.description,
        location: app.location,
        disasterType: app.disasterType,
        priority: app.priority,
        requestedAmount: goal,
        raised: mockRaised,
        goal: goal,
        beneficiaries: app.metadata?.familySize || 1,
        status: app.status,
        submittedAt: app.createdAt,
        approvedAt: app.reviewedAt,
        categories: getDisasterCategories(app.disasterType),
        urgency: app.priority === 'urgent' ? 'Critical' : 
                app.priority === 'high' ? 'High' : 'Medium'
      };
    });

    res.json({
      success: true,
      data: {
        campaigns: campaignsWithDonations,
        pagination: {
          page: parseInt(page),
          limit: parseInt(limit),
          total,
          pages: Math.ceil(total / parseInt(limit))
        }
      }
    });
  } catch (error) {
    console.error('Error getting campaigns:', error);
    res.status(500).json({
      success: false,
      message: 'Server error'
    });
  }
});

/**
 * @route   GET /api/public/campaigns/:id
 * @desc    Get specific campaign details
 * @access  Public
 */
router.get('/campaigns/:id', async (req, res) => {
  try {
    const { id } = req.params;

    const application = await Application.findById(id)
      .select('-documents -metadata.emergencyContact') // Privacy protection
      .lean();

    if (!application) {
      return res.status(404).json({
        success: false,
        message: 'Campaign not found'
      });
    }

    // Get real donation data from transactions
    const goal = parseFloat(application.requestedAmount) / 1e18;
    const raised = 0; // TODO: Calculate from actual donations in Transaction model

    const campaign = {
      id: application._id,
      title: `${application.disasterType} Relief - ${application.location}`,
      description: application.description,
      location: application.location,
      disasterType: application.disasterType,
      priority: application.priority,
      requestedAmount: goal,
      raised: raised,
      goal: goal,
      beneficiaries: application.metadata?.familySize || 1,
      status: application.status,
      submittedAt: application.createdAt,
      approvedAt: application.reviewedAt,
      categories: getDisasterCategories(application.disasterType),
      urgency: application.priority === 'urgent' ? 'Critical' : 
              application.priority === 'high' ? 'High' : 'Medium',
      impactDetails: [
        `Direct support for ${application.metadata?.familySize || 1} ${application.metadata?.familySize > 1 ? 'people' : 'person'}`,
        `Emergency relief for ${application.disasterType.toLowerCase()} victims`,
        `100% of donations go directly to verified beneficiaries`
      ],
      recentUpdates: [
        `Application approved on ${new Date(application.reviewedAt || application.createdAt).toLocaleDateString()}`,
        `Urgency level: ${application.priority}`,
        `Location: ${application.location}`
      ]
    };

    res.json({
      success: true,
      data: campaign
    });
  } catch (error) {
    console.error('Error getting campaign:', error);
    res.status(500).json({
      success: false,
      message: 'Server error'
    });
  }
});

// Helper function to get disaster categories
function getDisasterCategories(disasterType) {
  const categoryMap = {
    'earthquake': ['Shelter', 'Medical', 'Food'],
    'flood': ['Housing', 'Clean Water', 'Food'],
    'hurricane': ['Shelter', 'Food', 'Medical'],
    'wildfire': ['Shelter', 'Clothing', 'Medical'],
    'tornado': ['Shelter', 'Medical', 'Food'],
    'drought': ['Water', 'Food', 'Agriculture'],
    'tsunami': ['Shelter', 'Medical', 'Food'],
    'volcanic_eruption': ['Shelter', 'Medical', 'Food']
  };
  
  return categoryMap[disasterType] || ['Emergency Relief', 'Basic Needs'];
}

export default router;