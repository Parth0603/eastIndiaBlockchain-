import { body, param, query, validationResult } from 'express-validator';
import { ethers } from 'ethers';

/**
 * Validation schemas for different endpoints
 */
export const validationSchemas = {
  // Authentication validation
  auth: {
    connect: [
      body('address')
        .isEthereumAddress()
        .withMessage('Invalid Ethereum address')
        .customSanitizer(value => value.toLowerCase()),
      body('signature')
        .notEmpty()
        .withMessage('Signature is required')
        .isLength({ min: 132, max: 132 })
        .withMessage('Invalid signature format'),
      body('message')
        .notEmpty()
        .withMessage('Message is required')
        .isJSON()
        .withMessage('Message must be valid JSON')
    ],
    
    nonce: [
      param('address')
        .isEthereumAddress()
        .withMessage('Invalid Ethereum address')
        .customSanitizer(value => value.toLowerCase())
    ]
  },

  // Donation validation
  donation: {
    create: [
      body('amount')
        .isFloat({ min: 0.000001 })
        .withMessage('Amount must be a positive number greater than 0.000001')
        .custom(value => {
          // Validate that amount can be represented in wei
          try {
            ethers.parseEther(value.toString());
            return true;
          } catch {
            throw new Error('Invalid amount format');
          }
        }),
      body('transactionHash')
        .matches(/^0x[a-fA-F0-9]{64}$/)
        .withMessage('Invalid transaction hash format'),
      body('donor')
        .isEthereumAddress()
        .withMessage('Invalid donor address')
        .customSanitizer(value => value.toLowerCase())
    ],

    history: [
      query('page')
        .optional()
        .isInt({ min: 1 })
        .withMessage('Page must be a positive integer'),
      query('limit')
        .optional()
        .isInt({ min: 1, max: 100 })
        .withMessage('Limit must be between 1 and 100'),
      query('donor')
        .optional()
        .isEthereumAddress()
        .withMessage('Invalid donor address')
    ]
  },

  // Beneficiary validation
  beneficiary: {
    application: [
      body('personalInfo.fullName')
        .isLength({ min: 2, max: 100 })
        .withMessage('Full name must be between 2 and 100 characters')
        .matches(/^[a-zA-Z\s]+$/)
        .withMessage('Full name can only contain letters and spaces'),
      body('personalInfo.dateOfBirth')
        .isISO8601()
        .withMessage('Invalid date of birth format')
        .custom(value => {
          const age = (Date.now() - new Date(value).getTime()) / (1000 * 60 * 60 * 24 * 365);
          if (age < 0 || age > 120) {
            throw new Error('Invalid age');
          }
          return true;
        }),
      body('personalInfo.nationalId')
        .isLength({ min: 5, max: 20 })
        .withMessage('National ID must be between 5 and 20 characters')
        .matches(/^[a-zA-Z0-9]+$/)
        .withMessage('National ID can only contain letters and numbers'),
      body('contactInfo.phone')
        .isMobilePhone()
        .withMessage('Invalid phone number format'),
      body('contactInfo.email')
        .optional()
        .isEmail()
        .withMessage('Invalid email format'),
      body('emergencyInfo.situation')
        .isIn(['natural_disaster', 'conflict', 'economic_crisis', 'health_emergency', 'other'])
        .withMessage('Invalid emergency situation type'),
      body('emergencyInfo.description')
        .isLength({ min: 10, max: 1000 })
        .withMessage('Emergency description must be between 10 and 1000 characters'),
      body('emergencyInfo.urgencyLevel')
        .isIn(['low', 'medium', 'high', 'critical'])
        .withMessage('Invalid urgency level'),
      body('requestedAmount')
        .isFloat({ min: 1 })
        .withMessage('Requested amount must be at least 1')
        .custom(value => {
          if (value > 10000) {
            throw new Error('Requested amount cannot exceed 10,000');
          }
          return true;
        })
    ],

    spending: [
      body('vendor')
        .isEthereumAddress()
        .withMessage('Invalid vendor address')
        .customSanitizer(value => value.toLowerCase()),
      body('amount')
        .isFloat({ min: 0.000001 })
        .withMessage('Amount must be a positive number'),
      body('category')
        .isIn(['food', 'shelter', 'medical', 'education', 'transportation', 'utilities'])
        .withMessage('Invalid spending category'),
      body('description')
        .isLength({ min: 5, max: 500 })
        .withMessage('Description must be between 5 and 500 characters'),
      body('receiptHash')
        .optional()
        .matches(/^0x[a-fA-F0-9]{64}$/)
        .withMessage('Invalid receipt hash format')
    ]
  },

  // Vendor validation
  vendor: {
    registration: [
      body('businessInfo.name')
        .isLength({ min: 2, max: 100 })
        .withMessage('Business name must be between 2 and 100 characters'),
      body('businessInfo.registrationNumber')
        .isLength({ min: 5, max: 50 })
        .withMessage('Registration number must be between 5 and 50 characters'),
      body('businessInfo.type')
        .isIn(['grocery', 'pharmacy', 'hardware', 'clothing', 'services', 'other'])
        .withMessage('Invalid business type'),
      body('contactInfo.address')
        .isLength({ min: 10, max: 200 })
        .withMessage('Address must be between 10 and 200 characters'),
      body('contactInfo.phone')
        .isMobilePhone()
        .withMessage('Invalid phone number format'),
      body('contactInfo.email')
        .isEmail()
        .withMessage('Invalid email format'),
      body('categories')
        .isArray({ min: 1 })
        .withMessage('At least one category must be selected'),
      body('categories.*')
        .isIn(['food', 'shelter', 'medical', 'education', 'transportation', 'utilities'])
        .withMessage('Invalid category')
    ],

    transaction: [
      body('beneficiary')
        .isEthereumAddress()
        .withMessage('Invalid beneficiary address'),
      body('amount')
        .isFloat({ min: 0.000001 })
        .withMessage('Amount must be a positive number'),
      body('category')
        .isIn(['food', 'shelter', 'medical', 'education', 'transportation', 'utilities'])
        .withMessage('Invalid category'),
      body('items')
        .isArray({ min: 1 })
        .withMessage('At least one item must be specified'),
      body('items.*.name')
        .isLength({ min: 1, max: 100 })
        .withMessage('Item name must be between 1 and 100 characters'),
      body('items.*.quantity')
        .isInt({ min: 1 })
        .withMessage('Item quantity must be a positive integer'),
      body('items.*.price')
        .isFloat({ min: 0.01 })
        .withMessage('Item price must be at least 0.01')
    ]
  },

  // Admin validation
  admin: {
    roleAssignment: [
      body('address')
        .isEthereumAddress()
        .withMessage('Invalid Ethereum address')
        .customSanitizer(value => value.toLowerCase()),
      body('role')
        .isIn(['admin', 'verifier', 'beneficiary', 'vendor'])
        .withMessage('Invalid role'),
      body('action')
        .isIn(['grant', 'revoke'])
        .withMessage('Action must be either grant or revoke')
    ],

    systemConfig: [
      body('maxAllocation')
        .optional()
        .isFloat({ min: 1 })
        .withMessage('Max allocation must be at least 1'),
      body('categories')
        .optional()
        .isArray()
        .withMessage('Categories must be an array'),
      body('categories.*')
        .isIn(['food', 'shelter', 'medical', 'education', 'transportation', 'utilities'])
        .withMessage('Invalid category'),
      body('emergencyPause')
        .optional()
        .isBoolean()
        .withMessage('Emergency pause must be a boolean')
    ]
  },

  // Verifier validation
  verifier: {
    applicationReview: [
      param('applicationId')
        .isMongoId()
        .withMessage('Invalid application ID'),
      body('decision')
        .isIn(['approve', 'reject', 'request_more_info'])
        .withMessage('Decision must be approve, reject, or request_more_info'),
      body('comments')
        .optional()
        .isLength({ max: 1000 })
        .withMessage('Comments cannot exceed 1000 characters'),
      body('allocatedAmount')
        .if(body('decision').equals('approve'))
        .isFloat({ min: 1 })
        .withMessage('Allocated amount is required for approval and must be at least 1')
    ],

    vendorApproval: [
      param('vendorId')
        .isMongoId()
        .withMessage('Invalid vendor ID'),
      body('decision')
        .isIn(['approve', 'reject'])
        .withMessage('Decision must be approve or reject'),
      body('comments')
        .optional()
        .isLength({ max: 1000 })
        .withMessage('Comments cannot exceed 1000 characters')
    ]
  }
};

/**
 * Middleware to handle validation errors
 */
export const handleValidationErrors = (req, res, next) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({
      success: false,
      message: 'Validation failed',
      errors: errors.array().map(error => ({
        field: error.path,
        message: error.msg,
        value: error.value
      }))
    });
  }
  next();
};

/**
 * Business rule validation functions
 */
export const businessRules = {
  /**
   * Validate donation amount against system limits
   */
  validateDonationAmount: (amount) => {
    const minDonation = 0.000001; // Minimum donation in ETH
    const maxDonation = 1000000; // Maximum donation in ETH
    
    if (amount < minDonation) {
      throw new Error(`Minimum donation amount is ${minDonation} ETH`);
    }
    
    if (amount > maxDonation) {
      throw new Error(`Maximum donation amount is ${maxDonation} ETH`);
    }
    
    return true;
  },

  /**
   * Validate beneficiary allocation request
   */
  validateAllocationRequest: (requestedAmount, emergencyLevel, situation) => {
    const maxAllocations = {
      low: 500,
      medium: 1000,
      high: 2000,
      critical: 5000
    };

    const situationMultipliers = {
      natural_disaster: 1.5,
      conflict: 2.0,
      economic_crisis: 1.0,
      health_emergency: 1.2,
      other: 0.8
    };

    const maxAllowed = maxAllocations[emergencyLevel] * situationMultipliers[situation];
    
    if (requestedAmount > maxAllowed) {
      throw new Error(`Requested amount exceeds maximum allowed (${maxAllowed}) for ${emergencyLevel} ${situation}`);
    }
    
    return true;
  },

  /**
   * Validate spending transaction
   */
  validateSpending: (amount, category, beneficiaryBalance) => {
    if (amount > beneficiaryBalance) {
      throw new Error('Insufficient balance for this transaction');
    }

    const categoryLimits = {
      food: { min: 0.01, max: 500 },
      shelter: { min: 0.01, max: 2000 },
      medical: { min: 0.01, max: 1000 },
      education: { min: 0.01, max: 300 },
      transportation: { min: 0.01, max: 100 },
      utilities: { min: 0.01, max: 200 }
    };

    const limits = categoryLimits[category];
    if (amount < limits.min || amount > limits.max) {
      throw new Error(`Amount for ${category} must be between ${limits.min} and ${limits.max}`);
    }

    return true;
  },

  /**
   * Validate vendor transaction
   */
  validateVendorTransaction: (items, totalAmount) => {
    let calculatedTotal = 0;
    
    for (const item of items) {
      if (item.quantity <= 0) {
        throw new Error(`Invalid quantity for item: ${item.name}`);
      }
      
      if (item.price <= 0) {
        throw new Error(`Invalid price for item: ${item.name}`);
      }
      
      calculatedTotal += item.quantity * item.price;
    }

    // Allow for small rounding differences
    if (Math.abs(calculatedTotal - totalAmount) > 0.01) {
      throw new Error('Total amount does not match sum of item prices');
    }

    return true;
  }
};

/**
 * Vendor-specific validation functions
 */
export const validateVendorRegistration = (data) => {
  const errors = [];

  // Business name validation
  if (!data.businessName || data.businessName.trim().length < 2) {
    errors.push('Business name must be at least 2 characters long');
  }

  // Business type validation
  const validBusinessTypes = ['retail', 'pharmacy', 'grocery', 'hardware', 'medical', 'restaurant', 'other'];
  if (!data.businessType || !validBusinessTypes.includes(data.businessType)) {
    errors.push('Valid business type is required');
  }

  // Email validation
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!data.email || !emailRegex.test(data.email)) {
    errors.push('Valid email address is required');
  }

  // Address validation
  if (!data.address_line1 || data.address_line1.trim().length < 5) {
    errors.push('Address line 1 is required and must be at least 5 characters');
  }

  if (!data.city || data.city.trim().length < 2) {
    errors.push('City is required');
  }

  if (!data.state || data.state.trim().length < 2) {
    errors.push('State is required');
  }

  if (!data.zipCode || data.zipCode.trim().length < 5) {
    errors.push('Valid zip code is required');
  }

  // Categories validation
  const validCategories = ['food', 'medicine', 'shelter', 'clothing', 'water', 'hygiene', 'emergency_supplies'];
  if (data.requestedCategories && Array.isArray(data.requestedCategories)) {
    const invalidCategories = data.requestedCategories.filter(cat => !validCategories.includes(cat));
    if (invalidCategories.length > 0) {
      errors.push(`Invalid categories: ${invalidCategories.join(', ')}`);
    }
  }

  return {
    isValid: errors.length === 0,
    errors
  };
};

export const validateVendorUpdate = (data) => {
  const errors = [];

  // Only validate fields that are being updated
  if (data.businessName !== undefined && data.businessName.trim().length < 2) {
    errors.push('Business name must be at least 2 characters long');
  }

  if (data.email !== undefined) {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(data.email)) {
      errors.push('Valid email address is required');
    }
  }

  if (data.address_line1 !== undefined && data.address_line1.trim().length < 5) {
    errors.push('Address line 1 must be at least 5 characters');
  }

  if (data.city !== undefined && data.city.trim().length < 2) {
    errors.push('City is required');
  }

  if (data.state !== undefined && data.state.trim().length < 2) {
    errors.push('State is required');
  }

  if (data.zipCode !== undefined && data.zipCode.trim().length < 5) {
    errors.push('Valid zip code is required');
  }

  return {
    isValid: errors.length === 0,
    errors
  };
};

/**
 * Sanitization functions
 */
export const sanitizers = {
  /**
   * Sanitize Ethereum address
   */
  sanitizeAddress: (address) => {
    if (!ethers.isAddress(address)) {
      throw new Error('Invalid Ethereum address');
    }
    return address.toLowerCase();
  },

  /**
   * Sanitize amount for blockchain operations
   */
  sanitizeAmount: (amount) => {
    const sanitized = parseFloat(amount);
    if (isNaN(sanitized) || sanitized <= 0) {
      throw new Error('Invalid amount');
    }
    return sanitized.toString();
  },

  /**
   * Sanitize text input
   */
  sanitizeText: (text, maxLength = 1000) => {
    if (typeof text !== 'string') {
      throw new Error('Text must be a string');
    }
    
    // Remove potentially dangerous characters
    const sanitized = text
      .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '')
      .replace(/[<>]/g, '')
      .trim();
    
    if (sanitized.length > maxLength) {
      throw new Error(`Text exceeds maximum length of ${maxLength} characters`);
    }
    
    return sanitized;
  }
};