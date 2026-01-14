import Transaction from '../models/Transaction.js';
import User from '../models/User.js';
import CategoryLimit from '../models/CategoryLimit.js';

class CategoryFraudDetectionService {
  constructor() {
    this.riskThresholds = {
      HIGH_FREQUENCY: 10, // transactions per hour
      UNUSUAL_AMOUNT: 5, // times the average
      CROSS_CATEGORY_VELOCITY: 3, // categories per hour
      VENDOR_CONCENTRATION: 0.8, // 80% of spending to single vendor
      TIME_PATTERN_ANOMALY: 0.3, // deviation from normal hours
      GEOGRAPHIC_ANOMALY: 50 // km from usual location (mock)
    };
  }

  /**
   * Analyze spending patterns for fraud indicators
   */
  async analyzeSpendingPattern(beneficiaryAddress, category, amount, vendorAddress) {
    const flags = [];
    const riskScore = { total: 0, breakdown: {} };

    try {
      // Get recent transaction history (last 24 hours)
      const last24Hours = new Date(Date.now() - 24 * 60 * 60 * 1000);
      const recentTransactions = await Transaction.find({
        from: beneficiaryAddress,
        type: 'spending',
        createdAt: { $gte: last24Hours }
      }).sort({ createdAt: -1 });

      // 1. High Frequency Detection
      const frequencyRisk = this.detectHighFrequency(recentTransactions, category);
      if (frequencyRisk.isRisky) {
        flags.push({
          type: 'HIGH_FREQUENCY',
          severity: 'medium',
          description: `Unusually high transaction frequency: ${frequencyRisk.count} transactions in ${category} category within 24 hours`,
          metadata: frequencyRisk
        });
        riskScore.breakdown.frequency = frequencyRisk.score;
        riskScore.total += frequencyRisk.score;
      }

      // 2. Unusual Amount Detection
      const amountRisk = await this.detectUnusualAmount(beneficiaryAddress, category, amount);
      if (amountRisk.isRisky) {
        flags.push({
          type: 'UNUSUAL_AMOUNT',
          severity: amountRisk.severity,
          description: `Transaction amount ${amount} is ${amountRisk.multiplier}x the average for ${category} category`,
          metadata: amountRisk
        });
        riskScore.breakdown.amount = amountRisk.score;
        riskScore.total += amountRisk.score;
      }

      // 3. Cross-Category Velocity Detection
      const velocityRisk = this.detectCrossCategoryVelocity(recentTransactions);
      if (velocityRisk.isRisky) {
        flags.push({
          type: 'CROSS_CATEGORY_VELOCITY',
          severity: 'high',
          description: `Rapid spending across multiple categories: ${velocityRisk.categories.length} categories in short time`,
          metadata: velocityRisk
        });
        riskScore.breakdown.velocity = velocityRisk.score;
        riskScore.total += velocityRisk.score;
      }

      // 4. Vendor Concentration Detection
      const concentrationRisk = this.detectVendorConcentration(recentTransactions, vendorAddress);
      if (concentrationRisk.isRisky) {
        flags.push({
          type: 'VENDOR_CONCENTRATION',
          severity: 'medium',
          description: `High concentration of spending with single vendor: ${(concentrationRisk.percentage * 100).toFixed(1)}%`,
          metadata: concentrationRisk
        });
        riskScore.breakdown.concentration = concentrationRisk.score;
        riskScore.total += concentrationRisk.score;
      }

      // 5. Time Pattern Anomaly Detection
      const timeRisk = this.detectTimePatternAnomaly(recentTransactions, new Date());
      if (timeRisk.isRisky) {
        flags.push({
          type: 'TIME_PATTERN_ANOMALY',
          severity: 'low',
          description: `Unusual transaction time pattern detected`,
          metadata: timeRisk
        });
        riskScore.breakdown.timePattern = timeRisk.score;
        riskScore.total += timeRisk.score;
      }

      // 6. Category Limit Violation Detection
      const limitRisk = await this.detectCategoryLimitViolation(beneficiaryAddress, category, amount);
      if (limitRisk.isRisky) {
        flags.push({
          type: 'CATEGORY_LIMIT_VIOLATION',
          severity: 'high',
          description: `Transaction would violate ${limitRisk.limitType} limit for ${category}`,
          metadata: limitRisk
        });
        riskScore.breakdown.limitViolation = limitRisk.score;
        riskScore.total += limitRisk.score;
      }

      // 7. Beneficiary Behavior Anomaly
      const behaviorRisk = await this.detectBehaviorAnomaly(beneficiaryAddress, category, amount);
      if (behaviorRisk.isRisky) {
        flags.push({
          type: 'BEHAVIOR_ANOMALY',
          severity: behaviorRisk.severity,
          description: `Unusual spending behavior detected for beneficiary`,
          metadata: behaviorRisk
        });
        riskScore.breakdown.behavior = behaviorRisk.score;
        riskScore.total += behaviorRisk.score;
      }

      // Calculate overall risk level
      const riskLevel = this.calculateRiskLevel(riskScore.total);

      return {
        riskLevel,
        riskScore: riskScore.total,
        riskBreakdown: riskScore.breakdown,
        flags,
        requiresReview: riskLevel === 'high' || riskLevel === 'critical',
        timestamp: new Date()
      };

    } catch (error) {
      console.error('Fraud detection analysis error:', error);
      return {
        riskLevel: 'unknown',
        riskScore: 0,
        flags: [{
          type: 'ANALYSIS_ERROR',
          severity: 'low',
          description: 'Unable to complete fraud analysis',
          metadata: { error: error.message }
        }],
        requiresReview: false,
        timestamp: new Date()
      };
    }
  }

  /**
   * Detect high frequency transactions
   */
  detectHighFrequency(recentTransactions, category) {
    const categoryTransactions = recentTransactions.filter(tx => tx.category === category);
    const lastHour = new Date(Date.now() - 60 * 60 * 1000);
    const recentHourTransactions = categoryTransactions.filter(tx => tx.createdAt >= lastHour);

    const isRisky = recentHourTransactions.length >= this.riskThresholds.HIGH_FREQUENCY;
    const score = Math.min(recentHourTransactions.length * 2, 20);

    return {
      isRisky,
      score,
      count: recentHourTransactions.length,
      threshold: this.riskThresholds.HIGH_FREQUENCY,
      timeWindow: '1 hour'
    };
  }

  /**
   * Detect unusual transaction amounts
   */
  async detectUnusualAmount(beneficiaryAddress, category, amount) {
    try {
      // Get historical spending for this beneficiary in this category
      const last30Days = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
      const historicalTransactions = await Transaction.find({
        from: beneficiaryAddress,
        type: 'spending',
        category: category,
        createdAt: { $gte: last30Days }
      });

      if (historicalTransactions.length === 0) {
        // No history, check against category average
        const categoryAvg = await this.getCategoryAverageAmount(category);
        const multiplier = amount / categoryAvg;
        
        if (multiplier >= this.riskThresholds.UNUSUAL_AMOUNT) {
          return {
            isRisky: true,
            score: Math.min(multiplier * 3, 25),
            severity: multiplier >= 10 ? 'high' : 'medium',
            multiplier: multiplier.toFixed(1),
            comparison: 'category_average',
            categoryAverage: categoryAvg
          };
        }
      } else {
        // Compare against personal history
        const amounts = historicalTransactions.map(tx => parseFloat(tx.amount) / Math.pow(10, 18));
        const avgAmount = amounts.reduce((sum, amt) => sum + amt, 0) / amounts.length;
        const multiplier = amount / avgAmount;

        if (multiplier >= this.riskThresholds.UNUSUAL_AMOUNT) {
          return {
            isRisky: true,
            score: Math.min(multiplier * 2, 20),
            severity: multiplier >= 8 ? 'high' : 'medium',
            multiplier: multiplier.toFixed(1),
            comparison: 'personal_history',
            personalAverage: avgAmount.toFixed(2)
          };
        }
      }

      return { isRisky: false, score: 0 };
    } catch (error) {
      console.error('Unusual amount detection error:', error);
      return { isRisky: false, score: 0 };
    }
  }

  /**
   * Detect cross-category spending velocity
   */
  detectCrossCategoryVelocity(recentTransactions) {
    const lastHour = new Date(Date.now() - 60 * 60 * 1000);
    const recentHourTransactions = recentTransactions.filter(tx => tx.createdAt >= lastHour);
    
    const categories = [...new Set(recentHourTransactions.map(tx => tx.category))];
    const isRisky = categories.length >= this.riskThresholds.CROSS_CATEGORY_VELOCITY;
    const score = categories.length * 5;

    return {
      isRisky,
      score,
      categories,
      categoryCount: categories.length,
      threshold: this.riskThresholds.CROSS_CATEGORY_VELOCITY,
      timeWindow: '1 hour'
    };
  }

  /**
   * Detect vendor concentration
   */
  detectVendorConcentration(recentTransactions, currentVendor) {
    if (recentTransactions.length === 0) return { isRisky: false, score: 0 };

    const vendorSpending = {};
    let totalSpending = 0;

    recentTransactions.forEach(tx => {
      const amount = parseFloat(tx.amount) / Math.pow(10, 18);
      vendorSpending[tx.to] = (vendorSpending[tx.to] || 0) + amount;
      totalSpending += amount;
    });

    // Include current transaction
    vendorSpending[currentVendor] = (vendorSpending[currentVendor] || 0);
    const vendorPercentage = vendorSpending[currentVendor] / totalSpending;

    const isRisky = vendorPercentage >= this.riskThresholds.VENDOR_CONCENTRATION;
    const score = vendorPercentage * 15;

    return {
      isRisky,
      score,
      percentage: vendorPercentage,
      threshold: this.riskThresholds.VENDOR_CONCENTRATION,
      vendorSpending: Object.keys(vendorSpending).length
    };
  }

  /**
   * Detect time pattern anomalies
   */
  detectTimePatternAnomaly(recentTransactions, currentTime) {
    if (recentTransactions.length < 5) return { isRisky: false, score: 0 };

    // Analyze typical transaction hours
    const transactionHours = recentTransactions.map(tx => tx.createdAt.getHours());
    const currentHour = currentTime.getHours();

    // Calculate hour frequency
    const hourFrequency = {};
    transactionHours.forEach(hour => {
      hourFrequency[hour] = (hourFrequency[hour] || 0) + 1;
    });

    // Check if current hour is unusual
    const currentHourFreq = hourFrequency[currentHour] || 0;
    const totalTransactions = transactionHours.length;
    const currentHourPercentage = currentHourFreq / totalTransactions;

    // Consider it risky if this hour represents less than 10% of usual activity
    // and it's outside normal business hours (9 AM - 6 PM)
    const isUnusualHour = currentHourPercentage < 0.1 && (currentHour < 9 || currentHour > 18);
    const score = isUnusualHour ? 8 : 0;

    return {
      isRisky: isUnusualHour,
      score,
      currentHour,
      hourFrequency: currentHourPercentage,
      threshold: this.riskThresholds.TIME_PATTERN_ANOMALY
    };
  }

  /**
   * Detect category limit violations
   */
  async detectCategoryLimitViolation(beneficiaryAddress, category, amount) {
    try {
      const categoryLimit = await CategoryLimit.getLimitForCategory(category);
      if (!categoryLimit || categoryLimit.isEmergencyOverrideActive()) {
        return { isRisky: false, score: 0 };
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
      
      if (todaySpentUnits + amount > dailyLimitUnits) {
        const violationAmount = (todaySpentUnits + amount) - dailyLimitUnits;
        return {
          isRisky: true,
          score: 25, // High score for limit violations
          severity: 'high',
          limitType: 'daily',
          currentSpending: todaySpentUnits,
          limit: dailyLimitUnits,
          violationAmount: violationAmount.toFixed(2)
        };
      }

      return { isRisky: false, score: 0 };
    } catch (error) {
      console.error('Category limit violation detection error:', error);
      return { isRisky: false, score: 0 };
    }
  }

  /**
   * Detect beneficiary behavior anomalies
   */
  async detectBehaviorAnomaly(beneficiaryAddress, category, amount) {
    try {
      // Get beneficiary's spending history
      const last60Days = new Date(Date.now() - 60 * 24 * 60 * 60 * 1000);
      const spendingHistory = await Transaction.find({
        from: beneficiaryAddress,
        type: 'spending',
        createdAt: { $gte: last60Days }
      });

      if (spendingHistory.length < 10) {
        return { isRisky: false, score: 0 }; // Not enough data
      }

      // Analyze spending patterns
      const categorySpending = spendingHistory.filter(tx => tx.category === category);
      const otherCategorySpending = spendingHistory.filter(tx => tx.category !== category);

      // Check if this is a new category for the beneficiary
      if (categorySpending.length === 0 && otherCategorySpending.length > 5) {
        return {
          isRisky: true,
          score: 10,
          severity: 'medium',
          anomalyType: 'new_category',
          description: 'First time spending in this category'
        };
      }

      // Check spending frequency anomaly
      const avgDaysBetweenTransactions = this.calculateAvgDaysBetween(categorySpending);
      const daysSinceLastTransaction = this.daysSinceLastTransaction(categorySpending);

      if (avgDaysBetweenTransactions > 0 && daysSinceLastTransaction < avgDaysBetweenTransactions * 0.1) {
        return {
          isRisky: true,
          score: 12,
          severity: 'medium',
          anomalyType: 'frequency_anomaly',
          avgDaysBetween: avgDaysBetweenTransactions.toFixed(1),
          daysSinceLast: daysSinceLastTransaction.toFixed(1)
        };
      }

      return { isRisky: false, score: 0 };
    } catch (error) {
      console.error('Behavior anomaly detection error:', error);
      return { isRisky: false, score: 0 };
    }
  }

  /**
   * Get category average amount
   */
  async getCategoryAverageAmount(category) {
    try {
      const last30Days = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
      const categoryTransactions = await Transaction.aggregate([
        {
          $match: {
            type: 'spending',
            category: category,
            status: 'confirmed',
            createdAt: { $gte: last30Days }
          }
        },
        {
          $group: {
            _id: null,
            avgAmount: { $avg: { $toDouble: '$amount' } }
          }
        }
      ]);

      return categoryTransactions.length > 0 
        ? categoryTransactions[0].avgAmount / Math.pow(10, 18)
        : 100; // Default fallback
    } catch (error) {
      console.error('Category average calculation error:', error);
      return 100;
    }
  }

  /**
   * Calculate average days between transactions
   */
  calculateAvgDaysBetween(transactions) {
    if (transactions.length < 2) return 0;

    const sortedTx = transactions.sort((a, b) => a.createdAt - b.createdAt);
    const intervals = [];

    for (let i = 1; i < sortedTx.length; i++) {
      const daysDiff = (sortedTx[i].createdAt - sortedTx[i-1].createdAt) / (1000 * 60 * 60 * 24);
      intervals.push(daysDiff);
    }

    return intervals.reduce((sum, interval) => sum + interval, 0) / intervals.length;
  }

  /**
   * Calculate days since last transaction
   */
  daysSinceLastTransaction(transactions) {
    if (transactions.length === 0) return Infinity;

    const lastTransaction = transactions.reduce((latest, tx) => 
      tx.createdAt > latest.createdAt ? tx : latest
    );

    return (Date.now() - lastTransaction.createdAt.getTime()) / (1000 * 60 * 60 * 24);
  }

  /**
   * Calculate overall risk level
   */
  calculateRiskLevel(totalScore) {
    if (totalScore >= 50) return 'critical';
    if (totalScore >= 30) return 'high';
    if (totalScore >= 15) return 'medium';
    if (totalScore >= 5) return 'low';
    return 'minimal';
  }

  /**
   * Generate fraud detection report
   */
  async generateFraudReport(timeframe = 30) {
    try {
      const startDate = new Date(Date.now() - timeframe * 24 * 60 * 60 * 1000);

      // Get flagged transactions
      const flaggedTransactions = await Transaction.find({
        'metadata.fraudFlags': { $exists: true, $ne: [] },
        createdAt: { $gte: startDate }
      }).sort({ createdAt: -1 });

      // Analyze fraud patterns by category
      const categoryFraudStats = await Transaction.aggregate([
        {
          $match: {
            'metadata.fraudFlags': { $exists: true, $ne: [] },
            createdAt: { $gte: startDate }
          }
        },
        {
          $group: {
            _id: '$category',
            flaggedCount: { $sum: 1 },
            totalAmount: { $sum: { $toDouble: '$amount' } },
            riskLevels: { $push: '$metadata.riskLevel' }
          }
        }
      ]);

      // Calculate fraud statistics
      const fraudStats = {
        totalFlagged: flaggedTransactions.length,
        byCategory: categoryFraudStats.map(stat => ({
          category: stat._id,
          flaggedCount: stat.flaggedCount,
          totalAmount: (stat.totalAmount / Math.pow(10, 18)).toFixed(2),
          riskDistribution: this.calculateRiskDistribution(stat.riskLevels)
        })),
        topRiskCategories: categoryFraudStats
          .sort((a, b) => b.flaggedCount - a.flaggedCount)
          .slice(0, 5)
          .map(stat => stat._id),
        timeframe: `${timeframe} days`
      };

      return {
        success: true,
        data: fraudStats,
        generatedAt: new Date()
      };
    } catch (error) {
      console.error('Fraud report generation error:', error);
      return {
        success: false,
        message: 'Failed to generate fraud report'
      };
    }
  }

  /**
   * Calculate risk distribution
   */
  calculateRiskDistribution(riskLevels) {
    const distribution = { critical: 0, high: 0, medium: 0, low: 0, minimal: 0 };
    
    riskLevels.forEach(level => {
      if (distribution.hasOwnProperty(level)) {
        distribution[level]++;
      }
    });

    return distribution;
  }
}

export default new CategoryFraudDetectionService();