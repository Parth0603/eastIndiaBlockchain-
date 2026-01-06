import mongoose from 'mongoose';

const applicationSchema = new mongoose.Schema({
  applicantAddress: {
    type: String,
    required: true,
    validate: {
      validator: function(v) {
        return /^0x[a-fA-F0-9]{40}$/.test(v);
      },
      message: 'Invalid Ethereum address format'
    }
  },
  disasterType: {
    type: String,
    required: true,
    trim: true,
    enum: ['earthquake', 'flood', 'hurricane', 'wildfire', 'tornado', 'tsunami', 'drought', 'other'],
    maxlength: 50
  },
  location: {
    type: String,
    required: true,
    trim: true,
    maxlength: 200
  },
  requestedAmount: {
    type: String, // Store as string to handle large numbers
    required: true,
    validate: {
      validator: function(v) {
        return /^\d+$/.test(v) && BigInt(v) > 0;
      },
      message: 'Requested amount must be a valid positive number'
    }
  },
  description: {
    type: String,
    trim: true,
    maxlength: 1000
  },
  documents: [{
    filename: {
      type: String,
      required: true
    },
    originalName: String,
    mimetype: String,
    size: Number,
    uploadDate: {
      type: Date,
      default: Date.now
    },
    verified: {
      type: Boolean,
      default: false
    }
  }],
  status: {
    type: String,
    enum: ['pending', 'under_review', 'approved', 'rejected', 'cancelled'],
    default: 'pending'
  },
  verifierAddress: {
    type: String,
    validate: {
      validator: function(v) {
        return !v || /^0x[a-fA-F0-9]{40}$/.test(v);
      },
      message: 'Invalid verifier address format'
    }
  },
  reviewNotes: {
    type: String,
    trim: true,
    maxlength: 500
  },
  reviewedAt: Date,
  approvedAmount: {
    type: String,
    validate: {
      validator: function(v) {
        return !v || (/^\d+$/.test(v) && BigInt(v) >= 0);
      },
      message: 'Approved amount must be a valid positive number'
    }
  },
  priority: {
    type: String,
    enum: ['low', 'medium', 'high', 'urgent'],
    default: 'medium'
  },
  metadata: {
    familySize: Number,
    hasChildren: Boolean,
    hasElderly: Boolean,
    hasDisabled: Boolean,
    previouslyReceived: Boolean,
    emergencyContact: {
      name: String,
      phone: String,
      relationship: String
    }
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
applicationSchema.index({ applicantAddress: 1 });
applicationSchema.index({ status: 1 });
applicationSchema.index({ disasterType: 1 });
applicationSchema.index({ verifierAddress: 1 });
applicationSchema.index({ createdAt: -1 });
applicationSchema.index({ priority: 1 });

// Compound indexes
applicationSchema.index({ status: 1, createdAt: -1 });
applicationSchema.index({ disasterType: 1, status: 1 });
applicationSchema.index({ verifierAddress: 1, status: 1 });

// Instance methods
applicationSchema.methods.isPending = function() {
  return this.status === 'pending' || this.status === 'under_review';
};

applicationSchema.methods.isApproved = function() {
  return this.status === 'approved';
};

applicationSchema.methods.isRejected = function() {
  return this.status === 'rejected';
};

applicationSchema.methods.approve = function(verifierAddress, approvedAmount, notes) {
  this.status = 'approved';
  this.verifierAddress = verifierAddress;
  this.approvedAmount = approvedAmount.toString();
  this.reviewNotes = notes;
  this.reviewedAt = new Date();
  return this.save();
};

applicationSchema.methods.reject = function(verifierAddress, notes) {
  this.status = 'rejected';
  this.verifierAddress = verifierAddress;
  this.reviewNotes = notes;
  this.reviewedAt = new Date();
  return this.save();
};

applicationSchema.methods.getRequestedAmountInEther = function() {
  const amountBigInt = BigInt(this.requestedAmount);
  return Number(amountBigInt) / Math.pow(10, 18);
};

applicationSchema.methods.getApprovedAmountInEther = function() {
  if (!this.approvedAmount) return 0;
  const amountBigInt = BigInt(this.approvedAmount);
  return Number(amountBigInt) / Math.pow(10, 18);
};

// Static methods
applicationSchema.statics.findByApplicant = function(applicantAddress) {
  return this.find({ applicantAddress: applicantAddress.toLowerCase() })
    .sort({ createdAt: -1 });
};

applicationSchema.statics.findByStatus = function(status) {
  return this.find({ status }).sort({ createdAt: -1 });
};

applicationSchema.statics.findByVerifier = function(verifierAddress) {
  return this.find({ verifierAddress: verifierAddress.toLowerCase() })
    .sort({ reviewedAt: -1 });
};

applicationSchema.statics.getPendingApplications = function() {
  return this.find({ 
    status: { $in: ['pending', 'under_review'] } 
  }).sort({ priority: 1, createdAt: 1 });
};

applicationSchema.statics.getApplicationStats = function() {
  return this.aggregate([
    {
      $group: {
        _id: '$status',
        count: { $sum: 1 },
        totalRequested: { 
          $sum: { 
            $toDecimal: '$requestedAmount' 
          } 
        },
        totalApproved: { 
          $sum: { 
            $cond: [
              { $ne: ['$approvedAmount', null] },
              { $toDecimal: '$approvedAmount' },
              0
            ]
          }
        }
      }
    }
  ]);
};

const Application = mongoose.model('Application', applicationSchema);

export default Application;