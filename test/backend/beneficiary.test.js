import { describe, it, expect, beforeAll, afterAll, beforeEach } from 'vitest';
import request from 'supertest';
import { ethers } from 'ethers';
import jwt from 'jsonwebtoken';
import app from '../../backend/server.js';
import database from '../../backend/models/database.js';
import User from '../../backend/models/User.js';
import Application from '../../backend/models/Application.js';
import Transaction from '../../backend/models/Transaction.js';

describe('Beneficiary Operations Property Tests', () => {
  let testWallet;
  let authToken;
  let vendorWallet;
  let vendorToken;

  beforeAll(async () => {
    // Set up test environment
    process.env.JWT_SECRET = 'test-secret-key';
    process.env.NODE_ENV = 'test';
    
    // Create test wallets
    testWallet = ethers.Wallet.createRandom();
    vendorWallet = ethers.Wallet.createRandom();
    
    // Connect to test database
    await database.connect();
    
    // Create auth tokens
    authToken = jwt.sign(
      { 
        address: testWallet.address.toLowerCase(),
        role: 'beneficiary',
        userId: 'test-beneficiary-id'
      },
      process.env.JWT_SECRET,
      { expiresIn: '1h' }
    );

    vendorToken = jwt.sign(
      { 
        address: vendorWallet.address.toLowerCase(),
        role: 'vendor',
        userId: 'test-vendor-id'
      },
      process.env.JWT_SECRET,
      { expiresIn: '1h' }
    );
  });

  afterAll(async () => {
    // Clean up
    await database.disconnect();
  });

  beforeEach(async () => {
    // Clear collections
    await User.deleteMany({});
    await Application.deleteMany({});
    await Transaction.deleteMany({});

    // Create test users
    await User.create({
      address: testWallet.address.toLowerCase(),
      role: 'beneficiary',
      profile: {
        name: 'Test Beneficiary',
        verificationStatus: 'verified'
      }
    });

    await User.create({
      address: vendorWallet.address.toLowerCase(),
      role: 'vendor',
      profile: {
        name: 'Test Vendor',
        verificationStatus: 'verified'
      }
    });
  });

  describe('Property 6: Fund Allocation and Spending Validation', () => {
    it('should process valid applications correctly', async () => {
      const applicationData = {
        personalInfo: JSON.stringify({
          fullName: 'John Doe',
          familySize: 4,
          hasChildren: true
        }),
        contactInfo: JSON.stringify({
          email: 'john@example.com',
          address: '123 Test St, Test City'
        }),
        emergencyInfo: JSON.stringify({
          situation: 'natural_disaster',
          description: 'Lost home in earthquake, need emergency assistance',
          urgencyLevel: 'high'
        }),
        requestedAmount: '1000'
      };

      const response = await request(app)
        .post('/api/beneficiaries/apply')
        .set('Authorization', `Bearer ${authToken}`)
        .send(applicationData)
        .expect(201);

      expect(response.body.success).toBe(true);
      expect(response.body.data.status).toBe('pending');

      // Verify database record
      const application = await Application.findById(response.body.data.applicationId);
      expect(application).toBeTruthy();
      expect(application.applicantAddress).toBe(testWallet.address.toLowerCase());
    });

    it('should reject applications with invalid amounts', async () => {
      const invalidAmounts = [0, -100, 'invalid', null];

      for (const amount of invalidAmounts) {
        const applicationData = {
          personalInfo: JSON.stringify({
            fullName: 'John Doe',
            familySize: 4
          }),
          contactInfo: JSON.stringify({
            email: 'john@example.com',
            address: '123 Test St'
          }),
          emergencyInfo: JSON.stringify({
            situation: 'natural_disaster',
            description: 'Emergency assistance needed',
            urgencyLevel: 'medium'
          }),
          requestedAmount: amount
        };

        const response = await request(app)
          .post('/api/beneficiaries/apply')
          .set('Authorization', `Bearer ${authToken}`)
          .send(applicationData)
          .expect(400);

        expect(response.body.success).toBe(false);
      }
    });

    it('should prevent duplicate applications', async () => {
      const applicationData = {
        personalInfo: JSON.stringify({
          fullName: 'John Doe',
          familySize: 4
        }),
        contactInfo: JSON.stringify({
          email: 'john@example.com',
          address: '123 Test St'
        }),
        emergencyInfo: JSON.stringify({
          situation: 'natural_disaster',
          description: 'Emergency assistance needed',
          urgencyLevel: 'medium'
        }),
        requestedAmount: '1000'
      };

      // First application should succeed
      await request(app)
        .post('/api/beneficiaries/apply')
        .set('Authorization', `Bearer ${authToken}`)
        .send(applicationData)
        .expect(201);

      // Second application should fail
      const response = await request(app)
        .post('/api/beneficiaries/apply')
        .set('Authorization', `Bearer ${authToken}`)
        .send(applicationData)
        .expect(409);

      expect(response.body.success).toBe(false);
      expect(response.body.message).toContain('active application');
    });

    it('should validate spending amounts against business rules', async () => {
      const testCases = [
        { amount: '0.005', category: 'food', shouldPass: false }, // Below minimum
        { amount: '10', category: 'food', shouldPass: true }, // Valid amount
        { amount: '600', category: 'food', shouldPass: false }, // Above category limit
        { amount: '100', category: 'invalid_category', shouldPass: false } // Invalid category
      ];

      for (const testCase of testCases) {
        const spendingData = {
          vendor: vendorWallet.address,
          amount: testCase.amount,
          category: testCase.category,
          description: 'Test purchase'
        };

        const response = await request(app)
          .post('/api/beneficiaries/spend')
          .set('Authorization', `Bearer ${authToken}`)
          .send(spendingData);

        if (testCase.shouldPass) {
          expect(response.status).toBe(201);
          expect(response.body.success).toBe(true);
        } else {
          expect(response.status).toBeGreaterThanOrEqual(400);
          expect(response.body.success).toBe(false);
        }
      }
    });

    it('should maintain spending transaction integrity', async () => {
      const spendingData = {
        vendor: vendorWallet.address,
        amount: '100',
        category: 'food',
        description: 'Food purchase'
      };

      const response = await request(app)
        .post('/api/beneficiaries/spend')
        .set('Authorization', `Bearer ${authToken}`)
        .send(spendingData)
        .expect(201);

      expect(response.body.success).toBe(true);
      expect(response.body.data.amount).toBe(spendingData.amount);
      expect(response.body.data.category).toBe(spendingData.category);

      // Verify transaction record
      const transaction = await Transaction.findById(response.body.data.transactionId);
      expect(transaction).toBeTruthy();
      expect(transaction.type).toBe('spending');
      expect(transaction.from).toBe(testWallet.address.toLowerCase());
      expect(transaction.to).toBe(vendorWallet.address.toLowerCase());
    });

    it('should require authentication for all beneficiary operations', async () => {
      const endpoints = [
        { method: 'get', path: '/api/beneficiaries/status' },
        { method: 'get', path: '/api/beneficiaries/balance' },
        { method: 'post', path: '/api/beneficiaries/spend' },
        { method: 'get', path: '/api/beneficiaries/transactions' }
      ];

      for (const endpoint of endpoints) {
        const response = await request(app)[endpoint.method](endpoint.path);
        
        expect(response.status).toBe(401);
        expect(response.body.success).toBe(false);
        expect(response.body.message).toBe('Access token required');
      }
    });

    it('should return accurate application status', async () => {
      // Test when no application exists
      let response = await request(app)
        .get('/api/beneficiaries/status')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(response.body.data.status).toBe('not_applied');
      expect(response.body.data.hasApplication).toBe(false);

      // Create an application
      const application = new Application({
        applicantAddress: testWallet.address.toLowerCase(),
        disasterType: 'earthquake',
        location: 'Test City',
        requestedAmount: '1000000000000000000000', // 1000 tokens in wei
        description: 'Test application',
        status: 'pending',
        priority: 'medium'
      });
      await application.save();

      // Test when application exists
      response = await request(app)
        .get('/api/beneficiaries/status')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(response.body.data.hasApplication).toBe(true);
      expect(response.body.data.status).toBe('pending');
      expect(response.body.data.disasterType).toBe('earthquake');
    });

    it('should handle transaction history pagination correctly', async () => {
      // Create multiple transactions
      const transactions = [];
      for (let i = 0; i < 5; i++) {
        const tx = new Transaction({
          type: 'spending',
          from: testWallet.address.toLowerCase(),
          to: vendorWallet.address.toLowerCase(),
          amount: `${(i + 1) * 10}000000000000000000`, // Different amounts in wei
          txHash: '0x' + i.toString().repeat(64),
          status: 'confirmed',
          category: 'food',
          metadata: {
            description: `Test transaction ${i + 1}`
          }
        });
        transactions.push(tx);
      }
      await Transaction.insertMany(transactions);

      // Test pagination
      const response = await request(app)
        .get('/api/beneficiaries/transactions?page=1&limit=3')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(response.body.data.transactions).toHaveLength(3);
      expect(response.body.data.pagination.currentPage).toBe(1);
      expect(response.body.data.pagination.totalCount).toBe(5);
      expect(response.body.data.pagination.hasNextPage).toBe(true);
    });

    it('should filter transactions by category and status', async () => {
      // Create transactions with different categories and statuses
      const transactions = [
        {
          type: 'spending',
          from: testWallet.address.toLowerCase(),
          to: vendorWallet.address.toLowerCase(),
          amount: '10000000000000000000',
          txHash: '0x' + '1'.repeat(64),
          status: 'confirmed',
          category: 'food'
        },
        {
          type: 'spending',
          from: testWallet.address.toLowerCase(),
          to: vendorWallet.address.toLowerCase(),
          amount: '20000000000000000000',
          txHash: '0x' + '2'.repeat(64),
          status: 'pending',
          category: 'medical'
        }
      ];
      await Transaction.insertMany(transactions);

      // Filter by category
      let response = await request(app)
        .get('/api/beneficiaries/transactions?category=food')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(response.body.data.transactions).toHaveLength(1);
      expect(response.body.data.transactions[0].category).toBe('food');

      // Filter by status
      response = await request(app)
        .get('/api/beneficiaries/transactions?status=pending')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(response.body.data.transactions).toHaveLength(1);
      expect(response.body.data.transactions[0].status).toBe('pending');
    });

    it('should return approved vendors list', async () => {
      const response = await request(app)
        .get('/api/beneficiaries/vendors')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.vendors).toBeInstanceOf(Array);
      expect(response.body.data.totalCount).toBeGreaterThanOrEqual(0);
    });

    it('should allow profile updates', async () => {
      const updateData = {
        name: 'Updated Name',
        email: 'updated@example.com',
        phone: '+1234567890'
      };

      const response = await request(app)
        .put('/api/beneficiaries/profile')
        .set('Authorization', `Bearer ${authToken}`)
        .send(updateData)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.profile.name).toBe(updateData.name);
      expect(response.body.data.profile.email).toBe(updateData.email);

      // Verify database update
      const user = await User.findOne({ address: testWallet.address.toLowerCase() });
      expect(user.profile.name).toBe(updateData.name);
      expect(user.profile.email).toBe(updateData.email);
    });
  });

  describe('Property Validation: Beneficiary System Invariants', () => {
    it('should maintain data consistency across operations', async () => {
      // Create application
      const applicationData = {
        personalInfo: JSON.stringify({
          fullName: 'John Doe',
          familySize: 4
        }),
        contactInfo: JSON.stringify({
          email: 'john@example.com',
          address: '123 Test St'
        }),
        emergencyInfo: JSON.stringify({
          situation: 'natural_disaster',
          description: 'Emergency assistance needed',
          urgencyLevel: 'medium'
        }),
        requestedAmount: '1000'
      };

      const appResponse = await request(app)
        .post('/api/beneficiaries/apply')
        .set('Authorization', `Bearer ${authToken}`)
        .send(applicationData);

      // Check status consistency
      const statusResponse = await request(app)
        .get('/api/beneficiaries/status')
        .set('Authorization', `Bearer ${authToken}`);

      expect(statusResponse.body.data.applicationId).toBe(appResponse.body.data.applicationId);
      expect(statusResponse.body.data.status).toBe(appResponse.body.data.status);
    });

    it('should handle concurrent spending requests safely', async () => {
      const spendingRequests = [
        {
          vendor: vendorWallet.address,
          amount: '50',
          category: 'food',
          description: 'Food purchase 1'
        },
        {
          vendor: vendorWallet.address,
          amount: '30',
          category: 'medical',
          description: 'Medical purchase'
        },
        {
          vendor: vendorWallet.address,
          amount: '20',
          category: 'food',
          description: 'Food purchase 2'
        }
      ];

      // Process spending requests concurrently
      const promises = spendingRequests.map(spending =>
        request(app)
          .post('/api/beneficiaries/spend')
          .set('Authorization', `Bearer ${authToken}`)
          .send(spending)
      );

      const responses = await Promise.all(promises);
      
      // All should succeed (assuming sufficient balance)
      responses.forEach(response => {
        expect(response.status).toBe(201);
        expect(response.body.success).toBe(true);
      });

      // Verify all transactions were recorded
      const transactions = await Transaction.find({
        from: testWallet.address.toLowerCase(),
        type: 'spending'
      });
      expect(transactions).toHaveLength(3);
    });

    it('should maintain referential integrity between users and applications', async () => {
      // Create application
      const application = new Application({
        applicantAddress: testWallet.address.toLowerCase(),
        disasterType: 'earthquake',
        location: 'Test City',
        requestedAmount: '1000000000000000000000',
        description: 'Test application',
        status: 'approved',
        priority: 'medium'
      });
      await application.save();

      // Verify user exists
      const user = await User.findOne({ address: testWallet.address.toLowerCase() });
      expect(user).toBeTruthy();

      // Status endpoint should return consistent data
      const response = await request(app)
        .get('/api/beneficiaries/status')
        .set('Authorization', `Bearer ${authToken}`);

      expect(response.body.data.hasApplication).toBe(true);
      expect(response.body.data.applicationId).toBe(application._id.toString());
    });
  });
});