import mongoose from 'mongoose';

const vendorSchema = new mongoose.Schema({
  // Wallet address (primary identifier)
  address: {
    type: String,
    required: true,
    unique: true,
    lowercase: true
  },

  // Business Information
  businessName: {
    type: String,
    required: true,
    trim: true
  },

  businessType: {
    type: String,
    enum: ['retail', 'pharmacy', 'grocery', 'hardware', 'medical', 'restaurant', 'other'],
    required: true
  },

  businessLicense: {
    type: String,
    trim: true
  },

  description: {
    type: String,
    maxlength: 1000
  },

  // Contact Information
  email: {
    type: String,
    required: true,
    lowercase: true,
    trim: true
  },

  phone: {
    type: String,
    trim: true
  },

  // Business Address
  address_line1: {
    type: String,
    required: true
  },

  address_line2: {
    type: String
  },

  city: {
    type: String,
    required: true
  },

  state: {
    type: String,
    required: true
  },

  zipCode: {
    type: String,
    required: true
  },

  country: {
    type: String,
    required: true,
    default: 'US'
  },

  // Verification Status
  status: {
    type: String,
    enum: ['pending', 'under_review', 'approved', 'rejected', 'suspended'],
    default: 'pending'
  },

  // Categories vendor is approved for
  approvedCategories: [{
    type: String,
    enum: ['food', 'medicine', 'shelter', 'clothing', 'water', 'hygiene', 'emergency_supplies']
  }],

  // Requested categories during registration
  requestedCategories: [{
    type: String,
    enum: ['food', 'medicine', 'shelter', 'clothing', 'water', 'hygiene', 'emergency_supplies']
  }],

  // Business Documents
  documents: [{
    filename: String,
    originalName: String,
    path: String,
    mimetype: String,
    size: Number,
    uploadDate: {
      type: Date,
      default: Date.now
    },
    verified: {
      type: Boolean,
      default: false
    },
    documentType: {
      type: String,
      enum: ['business_license', 'tax_id', 'insurance', 'identity', 'other']
    }
  }],

  // Verification Information
  verifiedBy: {
    type: String, // Verifier wallet address
    lowercase: true
  },

  verifiedAt: {
    type: Date
  },

  reviewNotes: {
    type: String,
    maxlength: 1000
  },

  // Business Metrics
  totalTransactions: {
    type: Number,
    default: 0
  },

  totalReceived: {
    type: String, // Store as string to handle large numbers
    default: '0'
  },

  // Fraud Prevention
  suspiciousActivityCount: {
    type: Number,
    default: 0
  },

  lastSuspiciousActivity: {
    type: Date
  },

  // System flags
  isActive: {
    type: Boolean,
    default: true
  },

  // Notification preferences
  notifications: {
    email: {
      type: Boolean,
      default: true
    },
    newTransaction: {
      type: Boolean,
      default: true
    },
    statusUpdates: {
      type: Boolean,
      default: true
    }
  }
}, {
  timestamps: true,
  toJSON: { virtuals: true },
  toObject: { virtuals: true }
});

// Indexes for performance
vendorSchema.index({ status: 1, createdAt: -1 });
vendorSchema.index({ approvedCategories: 1 });
vendorSchema.index({ businessName: 'text', description: 'text' });

// Virtual for full address
vendorSchema.virtual('fullAddress').get(function() {
  let address = this.address_line1;
  if (this.address_line2) address += `, ${this.address_line2}`;
  address += `, ${this.city}, ${this.state} ${this.zipCode}`;
  if (this.country !== 'US') address += `, ${this.country}`;
  return address;
});

// Virtual for verification status display
vendorSchema.virtual('verificationStatusDisplay').get(function() {
  return this.status.replace('_', ' ').replace(/\b\w/g, l => l.toUpperCase());
});

// Method to check if vendor is approved for a category
vendorSchema.methods.isApprovedForCategory = function(category) {
  return this.status === 'approved' && this.approvedCategories.includes(category);
};

// Method to add suspicious activity
vendorSchema.methods.flagSuspiciousActivity = function() {
  this.suspiciousActivityCount += 1;
  this.lastSuspiciousActivity = new Date();
  
  // Auto-suspend if too many suspicious activities
  if (this.suspiciousActivityCount >= 5) {
    this.status = 'suspended';
  }
};

// Static method to find approved vendors by category
vendorSchema.statics.findApprovedByCategory = function(category) {
  return this.find({
    status: 'approved',
    isActive: true,
    approvedCategories: category
  });
};

// Pre-save middleware
vendorSchema.pre('save', function(next) {
  // Ensure address is lowercase
  if (this.address) {
    this.address = this.address.toLowerCase();
  }
  
  // Set verifiedAt when status changes to approved
  if (this.isModified('status') && this.status === 'approved' && !this.verifiedAt) {
    this.verifiedAt = new Date();
  }
  
  next();
});

const Vendor = mongoose.model('Vendor', vendorSchema);

export default Vendor;