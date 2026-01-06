import Transaction from '../models/Transaction.js';
import Vendor from '../models/Vendor.js';
import User from '../models/User.js';

/**
 * Fraud Detection Service
 * Implements suspicious transaction detection and flagging mechanisms
 */
class FraudDetectionService {
  constructor() {
    // Thresholds for suspicious activity detection
    this.thresholds = {
      maxTransactionAmount: 1000, // Maximum single transaction amount
      maxDailyAmount: 5000, // Maximum daily spending per beneficiary
      maxTransactionsPerHour: 10, // Maximum transactions per hour per beneficiary
      duplicateTransactionWindow: 300000, // 5 minutes in milliseconds
      unusualVendorPattern: 0.8, // 80% of transactions with same vendor is suspicious
      rapidSuccessionThreshold: 60000, // 1 minute between transactions
      maxVendorDailyAmount: 10000, // Maximum daily amount a vendor can receive
    };

    // Fraud patterns to detect
    this.fraudPatterns = {
      DUPLICATE_TRANSACTION: 'duplicate_transaction',
      EXCESSIVE_AMOUNT: 'excessive_amount',
      RAPID_SUCCESSION: 'rapid_succession',
      UNUSUAL_VENDOR_PATTERN: 'unusual_vendor_pattern',
      EXCESSIVE_DAILY_SPENDING: 'excessive_daily_spending',
      SUSPICIOUS_TIMING: 'suspicious_timing',
      VENDOR_EXCESSIVE_DAILY: 'vendor_excessive_daily'
    };
  }

  /**
   * Analyze a transaction for suspicious patterns
   * @param {Object} transactionData - Transaction data to analyze
   * @returns {Object} Analysis result with flags and reasons
   */
  async analyzeTransaction(transactionData) {
    const { from, to, amount, category, type } = transactionData;
    const suspiciousFlags = [];
    const warnings = [];

    try {
      // Convert amount to number for analysis
      const amountInEther = parseFloat(amount) / Math.pow(10, 18);

      // Check for excessive amount
      if (amountInEther > this.thresholds.maxTransactionAmount) {
        suspiciousFlags.push({
          pattern: this.fraudPatterns.EXCESSIVE_AMOUNT,
          severity: 'high',
          description: `Transaction amount (${amountInEther.toFixed(2)} ETH) exceeds maximum threshold`,
          threshold: this.thresholds.maxTransactionAmount
        });
      }

      // Check for duplicate transactions
      const duplicateCheck = await this.checkDuplicateTransactions(from, to, amount);
      if (duplicateCheck.isDuplicate) {
        suspiciousFlags.push({
          pattern: this.fraudPatterns.DUPLICATE_TRANSACTION,
          severity: 'high',
          description: 'Potential duplicate transaction detected',
          details: duplicateCheck
        });
      }

      // Check for rapid succession transactions
      const rapidCheck = await this.checkRapidSuccession(from);
      if (rapidCheck.isRapid) {
        suspiciousFlags.push({
          pattern: this.fraudPatterns.RAPID_SUCCESSION,
          severity: 'medium',
          description: 'Multiple transactions in rapid succession',
          details: rapidCheck
        });
      }

      // Check daily spending limits for beneficiaries
      if (type === 'spending' || type === 'vendor_payment') {
        const dailyCheck = await this.checkDailySpending(from, amountInEther);
        if (dailyCheck.exceedsLimit) {
          suspiciousFlags.push({
            pattern: this.fraudPatterns.EXCESSIVE_DAILY_SPENDING,
            severity: 'high',
            description: 'Daily spending limit exceeded',
            details: dailyCheck
          });
        }

        // Check vendor concentration pattern
        const vendorPatternCheck = await this.checkVendorPattern(from, to);
        if (vendorPatternCheck.isSuspicious) {
          warnings.push({
            pattern: this.fraudPatterns.UNUSUAL_VENDOR_PATTERN,
            severity: 'low',
            description: 'Unusual vendor concentration pattern',
            details: vendorPatternCheck
          });
        }

        // Check vendor daily limits
        const vendorDailyCheck = await this.checkVendorDailyLimits(to, amountInEther);
        if (vendorDailyCheck.exceedsLimit) {
          suspiciousFlags.push({
            pattern: this.fraudPatterns.VENDOR_EXCESSIVE_DAILY,
            severity: 'medium',
            description: 'Vendor daily receiving limit exceeded',
            details: vendorDailyCheck
          });
        }
      }

      // Check for suspicious timing patterns
      const timingCheck = await this.checkSuspiciousTiming(from);
      if (timingCheck.isSuspicious) {
        warnings.push({
          pattern: this.fraudPatterns.SUSPICIOUS_TIMING,
          severity: 'low',
          description: 'Unusual transaction timing pattern',
          details: timingCheck
        });
      }

      return {
        isSuspicious: suspiciousFlags.length > 0,
        riskLevel: this.calculateRiskLevel(suspiciousFlags, warnings),
        flags: suspiciousFlags,
        warnings: warnings,
        recommendation: this.getRecommendation(suspiciousFlags, warnings)
      };

    } catch (error) {
      console.error('Fraud analysis error:', error);
      return {
        isSuspicious: false,
        riskLevel: 'unknown',
        flags: [],
        warnings: [],
        error: 'Analysis failed'
      };
    }
  }

  /**
   * Check for duplicate transactions within time window
   */
  async checkDuplicateTransactions(from, to, amount) {
    const timeWindow = new Date(Date.now() - this.thresholds.duplicateTransactionWindow);
    
    const duplicates = await Transaction.find({
      from: from.toLowerCase(),
      to: to.toLowerCase(),
      amount: amount,
      createdAt: { $gte: timeWindow }
    });

    return {
      isDuplicate: duplicates.length > 0,
      count: duplicates.length,
      timeWindow: this.thresholds.duplicateTransactionWindow / 1000 / 60 // minutes
    };
  }

  /**
   * Check for rapid succession transactions
   */
  async checkRapidSuccession(from) {
    const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000);
    
    const recentTransactions = await Transaction.find({
      from: from.toLowerCase(),
      createdAt: { $gte: oneHourAgo }
    }).sort({ createdAt: -1 });

    const isRapid = recentTransactions.length > this.thresholds.maxTransactionsPerHour;

    // Check for transactions within rapid succession threshold
    let rapidPairs = 0;
    for (let i = 0; i < recentTransactions.length - 1; i++) {
      const timeDiff = recentTransactions[i].createdAt - recentTransactions[i + 1].createdAt;
      if (timeDiff < this.thresholds.rapidSuccessionThreshold) {
        rapidPairs++;
      }
    }

    return {
      isRapid: isRapid || rapidPairs > 2,
      transactionCount: recentTransactions.length,
      rapidPairs: rapidPairs,
      threshold: this.thresholds.maxTransactionsPerHour
    };
  }

  /**
   * Check daily spending limits
   */
  async checkDailySpending(from, currentAmount) {
    const startOfDay = new Date();
    startOfDay.setHours(0, 0, 0, 0);

    const dailyTransactions = await Transaction.find({
      from: from.toLowerCase(),
      type: { $in: ['spending', 'vendor_payment'] },
      status: { $in: ['pending', 'confirmed'] },
      createdAt: { $gte: startOfDay }
    });

    const dailyTotal = dailyTransactions.reduce((sum, tx) => {
      return sum + (parseFloat(tx.amount) / Math.pow(10, 18));
    }, 0);

    const projectedTotal = dailyTotal + currentAmount;

    return {
      exceedsLimit: projectedTotal > this.thresholds.maxDailyAmount,
      currentDaily: dailyTotal,
      projectedTotal: projectedTotal,
      limit: this.thresholds.maxDailyAmount,
      transactionCount: dailyTransactions.length
    };
  }

  /**
   * Check vendor concentration patterns
   */
  async checkVendorPattern(from, to) {
    const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);

    const recentTransactions = await Transaction.find({
      from: from.toLowerCase(),
      type: { $in: ['spending', 'vendor_payment'] },
      createdAt: { $gte: thirtyDaysAgo }
    });

    if (recentTransactions.length < 5) {
      return { isSuspicious: false, reason: 'Insufficient transaction history' };
    }

    const vendorCounts = {};
    recentTransactions.forEach(tx => {
      vendorCounts[tx.to] = (vendorCounts[tx.to] || 0) + 1;
    });

    const totalTransactions = recentTransactions.length;
    const targetVendorCount = vendorCounts[to.toLowerCase()] || 0;
    const concentration = targetVendorCount / totalTransactions;

    return {
      isSuspicious: concentration > this.thresholds.unusualVendorPattern,
      concentration: concentration,
      vendorTransactions: targetVendorCount,
      totalTransactions: totalTransactions,
      threshold: this.thresholds.unusualVendorPattern
    };
  }

  /**
   * Check vendor daily receiving limits
   */
  async checkVendorDailyLimits(vendorAddress, currentAmount) {
    const startOfDay = new Date();
    startOfDay.setHours(0, 0, 0, 0);

    const dailyReceived = await Transaction.find({
      to: vendorAddress.toLowerCase(),
      type: { $in: ['spending', 'vendor_payment'] },
      status: { $in: ['pending', 'confirmed'] },
      createdAt: { $gte: startOfDay }
    });

    const dailyTotal = dailyReceived.reduce((sum, tx) => {
      return sum + (parseFloat(tx.amount) / Math.pow(10, 18));
    }, 0);

    const projectedTotal = dailyTotal + currentAmount;

    return {
      exceedsLimit: projectedTotal > this.thresholds.maxVendorDailyAmount,
      currentDaily: dailyTotal,
      projectedTotal: projectedTotal,
      limit: this.thresholds.maxVendorDailyAmount,
      transactionCount: dailyReceived.length
    };
  }

  /**
   * Check for suspicious timing patterns
   */
  async checkSuspiciousTiming(from) {
    const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);

    const recentTransactions = await Transaction.find({
      from: from.toLowerCase(),
      createdAt: { $gte: sevenDaysAgo }
    }).sort({ createdAt: 1 });

    if (recentTransactions.length < 3) {
      return { isSuspicious: false, reason: 'Insufficient data' };
    }

    // Check for transactions only during specific hours (potential bot behavior)
    const hourCounts = {};
    recentTransactions.forEach(tx => {
      const hour = tx.createdAt.getHours();
      hourCounts[hour] = (hourCounts[hour] || 0) + 1;
    });

    const activeHours = Object.keys(hourCounts).length;
    const maxHourCount = Math.max(...Object.values(hourCounts));
    const totalTransactions = recentTransactions.length;

    // Suspicious if 80% of transactions happen in same 2-hour window
    const suspiciousConcentration = activeHours <= 2 && maxHourCount / totalTransactions > 0.8;

    return {
      isSuspicious: suspiciousConcentration,
      activeHours: activeHours,
      maxHourConcentration: maxHourCount / totalTransactions,
      hourDistribution: hourCounts
    };
  }

  /**
   * Calculate overall risk level
   */
  calculateRiskLevel(flags, warnings) {
    if (flags.length === 0 && warnings.length === 0) return 'low';
    
    const highSeverityCount = flags.filter(f => f.severity === 'high').length;
    const mediumSeverityCount = flags.filter(f => f.severity === 'medium').length;
    
    if (highSeverityCount >= 2) return 'critical';
    if (highSeverityCount >= 1) return 'high';
    if (mediumSeverityCount >= 2) return 'medium';
    if (flags.length > 0 || warnings.length >= 3) return 'medium';
    
    return 'low';
  }

  /**
   * Get recommendation based on analysis
   */
  getRecommendation(flags, warnings) {
    const riskLevel = this.calculateRiskLevel(flags, warnings);
    
    switch (riskLevel) {
      case 'critical':
        return {
          action: 'block',
          message: 'Transaction blocked due to critical fraud risk',
          requiresReview: true,
          autoFlag: true
        };
      case 'high':
        return {
          action: 'review',
          message: 'Transaction requires manual review before processing',
          requiresReview: true,
          autoFlag: true
        };
      case 'medium':
        return {
          action: 'monitor',
          message: 'Transaction flagged for monitoring',
          requiresReview: false,
          autoFlag: true
        };
      default:
        return {
          action: 'allow',
          message: 'Transaction appears normal',
          requiresReview: false,
          autoFlag: false
        };
    }
  }

  /**
   * Flag a vendor for suspicious activity
   */
  async flagVendor(vendorAddress, reason, severity = 'medium', reportedBy = null) {
    try {
      const vendor = await Vendor.findOne({ address: vendorAddress.toLowerCase() });
      
      if (!vendor) {
        throw new Error('Vendor not found');
      }

      // Add to suspicious activity count
      vendor.flagSuspiciousActivity();

      // Create fraud report
      const fraudReport = {
        vendorAddress: vendorAddress.toLowerCase(),
        reason: reason,
        severity: severity,
        reportedBy: reportedBy,
        timestamp: new Date(),
        status: 'pending_review',
        autoGenerated: !reportedBy
      };

      // Save vendor changes
      await vendor.save();

      // Emit real-time notification for high severity cases
      if (severity === 'high' || severity === 'critical') {
        // This would integrate with WebSocket service when implemented
        console.log(`High severity fraud alert for vendor ${vendorAddress}: ${reason}`);
      }

      return {
        success: true,
        vendor: vendor,
        fraudReport: fraudReport,
        action: vendor.status === 'suspended' ? 'auto_suspended' : 'flagged'
      };

    } catch (error) {
      console.error('Flag vendor error:', error);
      throw error;
    }
  }

  /**
   * Get fraud statistics for admin dashboard
   */
  async getFraudStatistics(timeframe = '30d') {
    try {
      const days = timeframe === '7d' ? 7 : timeframe === '30d' ? 30 : 90;
      const startDate = new Date(Date.now() - days * 24 * 60 * 60 * 1000);

      // Get flagged vendors
      const flaggedVendors = await Vendor.find({
        suspiciousActivityCount: { $gt: 0 },
        lastSuspiciousActivity: { $gte: startDate }
      });

      // Get suspicious transactions (would need to add flagged field to Transaction model)
      const suspiciousTransactions = await Transaction.find({
        createdAt: { $gte: startDate },
        'metadata.fraudFlags': { $exists: true, $ne: [] }
      });

      // Calculate statistics
      const stats = {
        timeframe: timeframe,
        flaggedVendors: {
          total: flaggedVendors.length,
          suspended: flaggedVendors.filter(v => v.status === 'suspended').length,
          underReview: flaggedVendors.filter(v => v.status === 'under_review').length
        },
        suspiciousTransactions: {
          total: suspiciousTransactions.length,
          blocked: suspiciousTransactions.filter(t => t.status === 'failed').length,
          underReview: suspiciousTransactions.filter(t => t.metadata?.requiresReview).length
        },
        patterns: this.analyzeFraudPatterns(suspiciousTransactions),
        trends: await this.calculateFraudTrends(startDate)
      };

      return stats;

    } catch (error) {
      console.error('Get fraud statistics error:', error);
      throw error;
    }
  }

  /**
   * Analyze fraud patterns from transactions
   */
  analyzeFraudPatterns(transactions) {
    const patterns = {};
    
    transactions.forEach(tx => {
      if (tx.metadata?.fraudFlags) {
        tx.metadata.fraudFlags.forEach(flag => {
          patterns[flag.pattern] = (patterns[flag.pattern] || 0) + 1;
        });
      }
    });

    return Object.entries(patterns)
      .sort(([,a], [,b]) => b - a)
      .slice(0, 5)
      .map(([pattern, count]) => ({ pattern, count }));
  }

  /**
   * Calculate fraud trends over time
   */
  async calculateFraudTrends(startDate) {
    const dailyStats = await Transaction.aggregate([
      {
        $match: {
          createdAt: { $gte: startDate },
          'metadata.fraudFlags': { $exists: true, $ne: [] }
        }
      },
      {
        $group: {
          _id: {
            $dateToString: { format: '%Y-%m-%d', date: '$createdAt' }
          },
          count: { $sum: 1 }
        }
      },
      { $sort: { _id: 1 } }
    ]);

    return dailyStats.map(stat => ({
      date: stat._id,
      count: stat.count
    }));
  }
}

export default new FraudDetectionService();