import mongoose from 'mongoose';

const transactionSchema = new mongoose.Schema({
  txHash: {
    type: String,
    required: true,
    unique: true,
    validate: {
      validator: function(v) {
        return /^0x[a-fA-F0-9]{64}$/.test(v);
      },
      message: 'Invalid transaction hash format'
    }
  },
  from: {
    type: String,
    required: true,
    validate: {
      validator: function(v) {
        return /^0x[a-fA-F0-9]{40}$/.test(v);
      },
      message: 'Invalid from address format'
    }
  },
  to: {
    type: String,
    required: true,
    validate: {
      validator: function(v) {
        return /^0x[a-fA-F0-9]{40}$/.test(v);
      },
      message: 'Invalid to address format'
    }
  },
  amount: {
    type: String, // Store as string to handle large numbers
    required: true,
    validate: {
      validator: function(v) {
        return /^\d+$/.test(v) && BigInt(v) >= 0;
      },
      message: 'Amount must be a valid positive number'
    }
  },
  type: {
    type: String,
    enum: ['donation', 'allocation', 'spending', 'vendor_payment'],
    required: true
  },
  category: {
    type: String,
    trim: true,
    validate: {
      validator: function(v) {
        // Category is required for spending transactions
        if (this.type === 'spending' || this.type === 'vendor_payment') {
          return v && v.length > 0;
        }
        return true;
      },
      message: 'Category is required for spending transactions'
    }
  },
  status: {
    type: String,
    enum: ['pending', 'confirmed', 'failed'],
    default: 'pending'
  },
  blockNumber: {
    type: Number,
    min: 0
  },
  gasUsed: {
    type: String,
    validate: {
      validator: function(v) {
        return !v || (/^\d+$/.test(v) && BigInt(v) >= 0);
      },
      message: 'Gas used must be a valid positive number'
    }
  },
  gasPrice: {
    type: String,
    validate: {
      validator: function(v) {
        return !v || (/^\d+$/.test(v) && BigInt(v) >= 0);
      },
      message: 'Gas price must be a valid positive number'
    }
  },
  metadata: {
    description: String,
    purpose: String,
    vendorName: String,
    beneficiaryName: String,
    disasterType: String,
    location: String,
    // Fraud detection fields
    fraudFlags: [{
      pattern: String,
      severity: String,
      description: String,
      detectedAt: {
        type: Date,
        default: Date.now
      }
    }],
    riskLevel: {
      type: String,
      enum: ['low', 'medium', 'high', 'critical'],
      default: 'low'
    },
    requiresReview: {
      type: Boolean,
      default: false
    },
    reviewedBy: String, // Address of reviewer
    reviewedAt: Date,
    reviewNotes: String
  },
  networkId: {
    type: Number,
    default: 31337 // localhost by default
  }
}, {
  timestamps: true,
  toJSON: {
    transform: function(doc, ret) {
      delete ret.__v;
      return ret;
    }
  }
});

// Indexes for better query performance
transactionSchema.index({ txHash: 1 });
transactionSchema.index({ from: 1 });
transactionSchema.index({ to: 1 });
transactionSchema.index({ type: 1 });
transactionSchema.index({ status: 1 });
transactionSchema.index({ blockNumber: -1 });
transactionSchema.index({ createdAt: -1 });
transactionSchema.index({ category: 1 });

// Compound indexes
transactionSchema.index({ from: 1, type: 1 });
transactionSchema.index({ to: 1, type: 1 });
transactionSchema.index({ type: 1, status: 1 });

// Instance methods
transactionSchema.methods.isConfirmed = function() {
  return this.status === 'confirmed';
};

transactionSchema.methods.isPending = function() {
  return this.status === 'pending';
};

transactionSchema.methods.isFailed = function() {
  return this.status === 'failed';
};

transactionSchema.methods.getAmountInEther = function() {
  // Convert wei to ether (assuming 18 decimals)
  const amountBigInt = BigInt(this.amount);
  const etherValue = Number(amountBigInt) / Math.pow(10, 18);
  return etherValue;
};

// Fraud-related methods
transactionSchema.methods.flagAsSuspicious = function(flags, riskLevel, requiresReview = false) {
  this.metadata = this.metadata || {};
  this.metadata.fraudFlags = flags;
  this.metadata.riskLevel = riskLevel;
  this.metadata.requiresReview = requiresReview;
};

transactionSchema.methods.isFlagged = function() {
  return this.metadata?.fraudFlags && this.metadata.fraudFlags.length > 0;
};

transactionSchema.methods.requiresManualReview = function() {
  return this.metadata?.requiresReview === true;
};

transactionSchema.methods.markReviewed = function(reviewerAddress, notes = '') {
  this.metadata = this.metadata || {};
  this.metadata.reviewedBy = reviewerAddress.toLowerCase();
  this.metadata.reviewedAt = new Date();
  this.metadata.reviewNotes = notes;
  this.metadata.requiresReview = false;
};

// Static methods
transactionSchema.statics.findByAddress = function(address) {
  const lowerAddress = address.toLowerCase();
  return this.find({
    $or: [
      { from: lowerAddress },
      { to: lowerAddress }
    ]
  }).sort({ createdAt: -1 });
};

transactionSchema.statics.findByType = function(type) {
  return this.find({ type }).sort({ createdAt: -1 });
};

transactionSchema.statics.findByStatus = function(status) {
  return this.find({ status }).sort({ createdAt: -1 });
};

transactionSchema.statics.getTransactionStats = function() {
  return this.aggregate([
    {
      $group: {
        _id: '$type',
        count: { $sum: 1 },
        totalAmount: { $sum: { $toDecimal: '$amount' } }
      }
    }
  ]);
};

transactionSchema.statics.getDonationStats = function() {
  return this.aggregate([
    {
      $match: { type: 'donation', status: 'confirmed' }
    },
    {
      $group: {
        _id: null,
        totalDonations: { $sum: 1 },
        totalAmount: { $sum: { $toDecimal: '$amount' } },
        avgAmount: { $avg: { $toDecimal: '$amount' } }
      }
    }
  ]);
};

// Fraud-related static methods
transactionSchema.statics.findFlaggedTransactions = function(riskLevel = null) {
  const query = { 'metadata.fraudFlags': { $exists: true, $ne: [] } };
  if (riskLevel) {
    query['metadata.riskLevel'] = riskLevel;
  }
  return this.find(query).sort({ createdAt: -1 });
};

transactionSchema.statics.findTransactionsRequiringReview = function() {
  return this.find({ 'metadata.requiresReview': true })
    .sort({ 'metadata.riskLevel': -1, createdAt: 1 });
};

transactionSchema.statics.getFraudStatistics = function(timeframe = 30) {
  const startDate = new Date(Date.now() - timeframe * 24 * 60 * 60 * 1000);
  
  return this.aggregate([
    { $match: { createdAt: { $gte: startDate } } },
    {
      $group: {
        _id: '$metadata.riskLevel',
        count: { $sum: 1 },
        flagged: {
          $sum: {
            $cond: [
              { $gt: [{ $size: { $ifNull: ['$metadata.fraudFlags', []] } }, 0] },
              1,
              0
            ]
          }
        }
      }
    }
  ]);
};

const Transaction = mongoose.model('Transaction', transactionSchema);

export default Transaction;