import mongoose from 'mongoose';

const userSchema = new mongoose.Schema({
  address: {
    type: String,
    required: true,
    unique: true,
    lowercase: true,
    validate: {
      validator: function(v) {
        return /^0x[a-fA-F0-9]{40}$/.test(v);
      },
      message: 'Invalid Ethereum address format'
    }
  },
  role: {
    type: String,
    enum: ['user', 'donor', 'beneficiary', 'verifier', 'admin', 'vendor'],
    default: 'user'
  },
  // Donation tracking fields
  totalDonated: {
    type: String,
    default: '0'
  },
  donationCount: {
    type: Number,
    default: 0
  },
  lastDonation: {
    type: Date
  },
  // Profile information
  profile: {
    name: {
      type: String,
      trim: true,
      maxlength: 100
    },
    email: {
      type: String,
      trim: true,
      lowercase: true,
      validate: {
        validator: function(v) {
          return !v || /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v);
        },
        message: 'Invalid email format'
      }
    },
    verificationStatus: {
      type: String,
      enum: ['pending', 'verified', 'rejected'],
      default: 'pending'
    },
    documents: [{
      type: String,
      trim: true
    }]
  },
  // Authentication tracking
  lastLogin: {
    type: Date,
    default: Date.now
  },
  loginCount: {
    type: Number,
    default: 0
  },
  isActive: {
    type: Boolean,
    default: true
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
userSchema.index({ address: 1 });
userSchema.index({ role: 1 });
userSchema.index({ totalDonated: -1 });
userSchema.index({ donationCount: -1 });
userSchema.index({ 'profile.verificationStatus': 1 });
userSchema.index({ createdAt: -1 });

// Instance methods
userSchema.methods.updateLastLogin = function() {
  this.lastLogin = new Date();
  this.loginCount += 1;
  return this.save();
};

userSchema.methods.isVerified = function() {
  return this.profile.verificationStatus === 'verified';
};

userSchema.methods.hasRole = function(role) {
  return this.role === role;
};

userSchema.methods.addDonation = function(amount) {
  this.totalDonated = (parseFloat(this.totalDonated || 0) + parseFloat(amount)).toString();
  this.donationCount = (this.donationCount || 0) + 1;
  this.lastDonation = new Date();
  return this.save();
};

// Static methods
userSchema.statics.findByAddress = function(address) {
  return this.findOne({ address: address.toLowerCase() });
};

userSchema.statics.findByRole = function(role) {
  return this.find({ role, isActive: true });
};

userSchema.statics.getActiveUsers = function() {
  return this.find({ isActive: true });
};

userSchema.statics.getTopDonors = function(limit = 10) {
  return this.find({ donationCount: { $gt: 0 } })
    .sort({ totalDonated: -1 })
    .limit(limit);
};

const User = mongoose.model('User', userSchema);

export default User;