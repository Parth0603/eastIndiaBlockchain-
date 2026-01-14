import mongoose from 'mongoose';

const categoryLimitSchema = new mongoose.Schema({
  category: {
    type: String,
    required: true,
    enum: ['Food', 'Medical', 'Shelter', 'Water', 'Clothing', 'Emergency Supplies'],
    unique: true
  },
  dailyLimit: {
    type: String, // Store as string to handle large numbers
    required: true,
    validate: {
      validator: function(v) {
        return /^\d+$/.test(v) && BigInt(v) >= 0;
      },
      message: 'Daily limit must be a valid positive number'
    }
  },
  weeklyLimit: {
    type: String,
    required: true,
    validate: {
      validator: function(v) {
        return /^\d+$/.test(v) && BigInt(v) >= 0;
      },
      message: 'Weekly limit must be a valid positive number'
    }
  },
  monthlyLimit: {
    type: String,
    required: true,
    validate: {
      validator: function(v) {
        return /^\d+$/.test(v) && BigInt(v) >= 0;
      },
      message: 'Monthly limit must be a valid positive number'
    }
  },
  perTransactionLimit: {
    type: String,
    required: true,
    validate: {
      validator: function(v) {
        return /^\d+$/.test(v) && BigInt(v) >= 0;
      },
      message: 'Per transaction limit must be a valid positive number'
    }
  },
  isActive: {
    type: Boolean,
    default: true
  },
  createdBy: {
    type: String,
    required: true,
    validate: {
      validator: function(v) {
        return /^0x[a-fA-F0-9]{40}$/.test(v);
      },
      message: 'Invalid creator address format'
    }
  },
  updatedBy: {
    type: String,
    validate: {
      validator: function(v) {
        return !v || /^0x[a-fA-F0-9]{40}$/.test(v);
      },
      message: 'Invalid updater address format'
    }
  },
  metadata: {
    description: String,
    reason: String,
    emergencyOverride: {
      type: Boolean,
      default: false
    },
    overrideReason: String,
    overrideExpiry: Date
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
categoryLimitSchema.index({ category: 1 });
categoryLimitSchema.index({ isActive: 1 });
categoryLimitSchema.index({ createdBy: 1 });

// Instance methods
categoryLimitSchema.methods.getDailyLimitInUnits = function() {
  return Number(BigInt(this.dailyLimit)) / Math.pow(10, 18);
};

categoryLimitSchema.methods.getWeeklyLimitInUnits = function() {
  return Number(BigInt(this.weeklyLimit)) / Math.pow(10, 18);
};

categoryLimitSchema.methods.getMonthlyLimitInUnits = function() {
  return Number(BigInt(this.monthlyLimit)) / Math.pow(10, 18);
};

categoryLimitSchema.methods.getPerTransactionLimitInUnits = function() {
  return Number(BigInt(this.perTransactionLimit)) / Math.pow(10, 18);
};

categoryLimitSchema.methods.isEmergencyOverrideActive = function() {
  if (!this.metadata?.emergencyOverride) return false;
  if (!this.metadata?.overrideExpiry) return true;
  return new Date() < this.metadata.overrideExpiry;
};

// Static methods
categoryLimitSchema.statics.getActiveLimits = function() {
  return this.find({ isActive: true }).sort({ category: 1 });
};

categoryLimitSchema.statics.getLimitForCategory = function(category) {
  return this.findOne({ category, isActive: true });
};

categoryLimitSchema.statics.createDefaultLimits = async function(creatorAddress) {
  const defaultLimits = [
    {
      category: 'Food',
      dailyLimit: (500 * Math.pow(10, 18)).toString(), // 500 units per day
      weeklyLimit: (2000 * Math.pow(10, 18)).toString(), // 2000 units per week
      monthlyLimit: (8000 * Math.pow(10, 18)).toString(), // 8000 units per month
      perTransactionLimit: (200 * Math.pow(10, 18)).toString(), // 200 units per transaction
      createdBy: creatorAddress,
      metadata: {
        description: 'Default spending limits for food category',
        reason: 'System initialization'
      }
    },
    {
      category: 'Medical',
      dailyLimit: (1000 * Math.pow(10, 18)).toString(), // 1000 units per day
      weeklyLimit: (5000 * Math.pow(10, 18)).toString(), // 5000 units per week
      monthlyLimit: (15000 * Math.pow(10, 18)).toString(), // 15000 units per month
      perTransactionLimit: (500 * Math.pow(10, 18)).toString(), // 500 units per transaction
      createdBy: creatorAddress,
      metadata: {
        description: 'Default spending limits for medical category',
        reason: 'System initialization'
      }
    },
    {
      category: 'Shelter',
      dailyLimit: (2000 * Math.pow(10, 18)).toString(), // 2000 units per day
      weeklyLimit: (10000 * Math.pow(10, 18)).toString(), // 10000 units per week
      monthlyLimit: (30000 * Math.pow(10, 18)).toString(), // 30000 units per month
      perTransactionLimit: (1000 * Math.pow(10, 18)).toString(), // 1000 units per transaction
      createdBy: creatorAddress,
      metadata: {
        description: 'Default spending limits for shelter category',
        reason: 'System initialization'
      }
    },
    {
      category: 'Water',
      dailyLimit: (300 * Math.pow(10, 18)).toString(), // 300 units per day
      weeklyLimit: (1500 * Math.pow(10, 18)).toString(), // 1500 units per week
      monthlyLimit: (6000 * Math.pow(10, 18)).toString(), // 6000 units per month
      perTransactionLimit: (100 * Math.pow(10, 18)).toString(), // 100 units per transaction
      createdBy: creatorAddress,
      metadata: {
        description: 'Default spending limits for water category',
        reason: 'System initialization'
      }
    },
    {
      category: 'Clothing',
      dailyLimit: (400 * Math.pow(10, 18)).toString(), // 400 units per day
      weeklyLimit: (1200 * Math.pow(10, 18)).toString(), // 1200 units per week
      monthlyLimit: (4000 * Math.pow(10, 18)).toString(), // 4000 units per month
      perTransactionLimit: (200 * Math.pow(10, 18)).toString(), // 200 units per transaction
      createdBy: creatorAddress,
      metadata: {
        description: 'Default spending limits for clothing category',
        reason: 'System initialization'
      }
    },
    {
      category: 'Emergency Supplies',
      dailyLimit: (1500 * Math.pow(10, 18)).toString(), // 1500 units per day
      weeklyLimit: (7000 * Math.pow(10, 18)).toString(), // 7000 units per week
      monthlyLimit: (20000 * Math.pow(10, 18)).toString(), // 20000 units per month
      perTransactionLimit: (800 * Math.pow(10, 18)).toString(), // 800 units per transaction
      createdBy: creatorAddress,
      metadata: {
        description: 'Default spending limits for emergency supplies category',
        reason: 'System initialization'
      }
    }
  ];

  const results = [];
  for (const limitData of defaultLimits) {
    try {
      const existingLimit = await this.findOne({ category: limitData.category });
      if (!existingLimit) {
        const limit = new this(limitData);
        await limit.save();
        results.push(limit);
      } else {
        results.push(existingLimit);
      }
    } catch (error) {
      console.error(`Error creating default limit for ${limitData.category}:`, error);
    }
  }

  return results;
};

const CategoryLimit = mongoose.model('CategoryLimit', categoryLimitSchema);

export default CategoryLimit;