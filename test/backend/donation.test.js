import { describe, it, expect, beforeAll, afterAll, beforeEach } from 'vitest';
import request from 'supertest';
import { ethers } from 'ethers';
import jwt from 'jsonwebtoken';
import app from '../../backend/server.js';
import database from '../../backend/models/database.js';
import User from '../../backend/models/User.js';
import Transaction from '../../backend/models/Transaction.js';

describe('Donation Processing Property Tests', () => {
  let testWallet;
  let authToken;

  beforeAll(async () => {
    // Set up test environment
    process.env.JWT_SECRET = 'test-secret-key';
    process.env.NODE_ENV = 'test';
    
    // Create test wallet
    testWallet = ethers.Wallet.createRandom();
    
    // Connect to test database
    await database.connect();
    
    // Create auth token
    authToken = jwt.sign(
      { 
        address: testWallet.address.toLowerCase(),
        role: 'user',
        userId: 'test-user-id'
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
    await Transaction.deleteMany({});
  });

  describe('Property 2: Donation Processing Integrity', () => {
    it('should process valid donations correctly', async () => {
      const donationData = {
        amount: '1.5',
        transactionHash: '0x' + '1'.repeat(64),
        donor: testWallet.address
      };

      const response = await request(app)
        .post('/api/donors/donate')
        .set('Authorization', `Bearer ${authToken}`)
        .send(donationData)
        .expect(201);

      expect(response.body.success).toBe(true);
      expect(response.body.data.amount).toBe(donationData.amount);
      expect(response.body.data.transactionHash).toBe(donationData.transactionHash);

      // Verify database record
      const transaction = await Transaction.findOne({ 
        transactionHash: donationData.transactionHash 
      });
      expect(transaction).toBeTruthy();
      expect(transaction.type).toBe('donation');
      expect(transaction.amount).toBe(donationData.amount);
    });

    it('should reject donations with invalid amounts', async () => {
      const invalidAmounts = [0, -1, 'invalid', null, undefined];

      for (const amount of invalidAmounts) {
        const donationData = {
          amount,
          transactionHash: '0x' + Math.random().toString(16).padStart(64, '0'),
          donor: testWallet.address
        };

        const response = await request(app)
          .post('/api/donors/donate')
          .set('Authorization', `Bearer ${authToken}`)
          .send(donationData)
          .expect(400);

        expect(response.body.success).toBe(false);
      }
    });

    it('should reject donations with invalid transaction hashes', async () => {
      const invalidHashes = [
        'invalid-hash',
        '0x123', // Too short
        '0x' + 'g'.repeat(64), // Invalid characters
        null,
        undefined
      ];

      for (const transactionHash of invalidHashes) {
        const donationData = {
          amount: '1.0',
          transactionHash,
          donor: testWallet.address
        };

        const response = await request(app)
          .post('/api/donors/donate')
          .set('Authorization', `Bearer ${authToken}`)
          .send(donationData)
          .expect(400);

        expect(response.body.success).toBe(false);
      }
    });

    it('should reject donations with mismatched donor address', async () => {
      const otherWallet = ethers.Wallet.createRandom();
      
      const donationData = {
        amount: '1.0',
        transactionHash: '0x' + '2'.repeat(64),
        donor: otherWallet.address // Different from authenticated user
      };

      const response = await request(app)
        .post('/api/donors/donate')
        .set('Authorization', `Bearer ${authToken}`)
        .send(donationData)
        .expect(403);

      expect(response.body.success).toBe(false);
      expect(response.body.message).toContain('does not match authenticated user');
    });

    it('should prevent duplicate transaction processing', async () => {
      const donationData = {
        amount: '1.0',
        transactionHash: '0x' + '3'.repeat(64),
        donor: testWallet.address
      };

      // First donation should succeed
      await request(app)
        .post('/api/donors/donate')
        .set('Authorization', `Bearer ${authToken}`)
        .send(donationData)
        .expect(201);

      // Second donation with same hash should fail
      const response = await request(app)
        .post('/api/donors/donate')
        .set('Authorization', `Bearer ${authToken}`)
        .send(donationData)
        .expect(409);

      expect(response.body.success).toBe(false);
      expect(response.body.message).toBe('Transaction already recorded');
    });

    it('should update donor statistics correctly', async () => {
      const donations = [
        { amount: '1.0', hash: '0x' + '4'.repeat(64) },
        { amount: '2.5', hash: '0x' + '5'.repeat(64) },
        { amount: '0.5', hash: '0x' + '6'.repeat(64) }
      ];

      for (const donation of donations) {
        await request(app)
          .post('/api/donors/donate')
          .set('Authorization', `Bearer ${authToken}`)
          .send({
            amount: donation.amount,
            transactionHash: donation.hash,
            donor: testWallet.address
          })
          .expect(201);
      }

      // Check user statistics
      const user = await User.findOne({ address: testWallet.address.toLowerCase() });
      expect(user).toBeTruthy();
      expect(user.donationCount).toBe(3);
      expect(parseFloat(user.totalDonated)).toBe(4.0); // 1.0 + 2.5 + 0.5
    });

    it('should require authentication for donation processing', async () => {
      const donationData = {
        amount: '1.0',
        transactionHash: '0x' + '7'.repeat(64),
        donor: testWallet.address
      };

      const response = await request(app)
        .post('/api/donors/donate')
        .send(donationData)
        .expect(401);

      expect(response.body.success).toBe(false);
      expect(response.body.message).toBe('Access token required');
    });

    it('should validate donation amounts against business rules', async () => {
      const testCases = [
        { amount: '0.000001', shouldPass: true }, // Minimum valid
        { amount: '0.0000005', shouldPass: false }, // Below minimum
        { amount: '1000000', shouldPass: true }, // Maximum valid
        { amount: '1000001', shouldPass: false } // Above maximum
      ];

      for (const testCase of testCases) {
        const donationData = {
          amount: testCase.amount,
          transactionHash: '0x' + Math.random().toString(16).padStart(64, '0'),
          donor: testWallet.address
        };

        const response = await request(app)
          .post('/api/donors/donate')
          .set('Authorization', `Bearer ${authToken}`)
          .send(donationData);

        if (testCase.shouldPass) {
          expect(response.status).toBe(201);
          expect(response.body.success).toBe(true);
        } else {
          expect(response.status).toBeGreaterThanOrEqual(400);
          expect(response.body.success).toBe(false);
        }
      }
    });
  });

  describe('Property 3: Donation History Completeness', () => {
    beforeEach(async () => {
      // Create test donations
      const donations = [
        { amount: '1.0', hash: '0x' + '1'.repeat(64) },
        { amount: '2.0', hash: '0x' + '2'.repeat(64) },
        { amount: '3.0', hash: '0x' + '3'.repeat(64) }
      ];

      for (const donation of donations) {
        await request(app)
          .post('/api/donors/donate')
          .set('Authorization', `Bearer ${authToken}`)
          .send({
            amount: donation.amount,
            transactionHash: donation.hash,
            donor: testWallet.address
          });
      }
    });

    it('should return complete donation history', async () => {
      const response = await request(app)
        .get('/api/donors/history')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.donations).toHaveLength(3);
      expect(response.body.data.statistics.donationCount).toBe(3);
      expect(parseFloat(response.body.data.statistics.totalDonated)).toBe(6.0);
    });

    it('should support pagination correctly', async () => {
      const response = await request(app)
        .get('/api/donors/history?page=1&limit=2')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(response.body.data.donations).toHaveLength(2);
      expect(response.body.data.pagination.currentPage).toBe(1);
      expect(response.body.data.pagination.totalCount).toBe(3);
      expect(response.body.data.pagination.hasNextPage).toBe(true);
    });

    it('should return donations in chronological order (newest first)', async () => {
      const response = await request(app)
        .get('/api/donors/history')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      const donations = response.body.data.donations;
      expect(donations).toHaveLength(3);

      // Check that timestamps are in descending order
      for (let i = 0; i < donations.length - 1; i++) {
        const current = new Date(donations[i].timestamp);
        const next = new Date(donations[i + 1].timestamp);
        expect(current.getTime()).toBeGreaterThanOrEqual(next.getTime());
      }
    });

    it('should prevent access to other users donation history', async () => {
      const otherWallet = ethers.Wallet.createRandom();
      
      const response = await request(app)
        .get(`/api/donors/history?donor=${otherWallet.address}`)
        .set('Authorization', `Bearer ${authToken}`)
        .expect(403);

      expect(response.body.success).toBe(false);
      expect(response.body.message).toContain('Cannot access other users');
    });

    it('should calculate statistics correctly', async () => {
      const response = await request(app)
        .get('/api/donors/history')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      const stats = response.body.data.statistics;
      expect(stats.donationCount).toBe(3);
      expect(parseFloat(stats.totalDonated)).toBe(6.0);
      expect(parseFloat(stats.averageDonation)).toBe(2.0); // 6.0 / 3
    });

    it('should handle empty donation history', async () => {
      // Clear donations
      await Transaction.deleteMany({});
      await User.deleteMany({});

      const response = await request(app)
        .get('/api/donors/history')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(response.body.data.donations).toHaveLength(0);
      expect(response.body.data.statistics.donationCount).toBe(0);
      expect(response.body.data.statistics.totalDonated).toBe('0');
    });
  });

  describe('Property Validation: Donation System Invariants', () => {
    it('should maintain transaction integrity across operations', async () => {
      const donationData = {
        amount: '5.0',
        transactionHash: '0x' + 'a'.repeat(64),
        donor: testWallet.address
      };

      // Process donation
      await request(app)
        .post('/api/donors/donate')
        .set('Authorization', `Bearer ${authToken}`)
        .send(donationData)
        .expect(201);

      // Verify consistency between transaction and user records
      const transaction = await Transaction.findOne({ 
        transactionHash: donationData.transactionHash 
      });
      const user = await User.findOne({ 
        address: testWallet.address.toLowerCase() 
      });

      expect(transaction.amount).toBe(user.totalDonated);
      expect(user.donationCount).toBe(1);
    });

    it('should handle concurrent donation processing safely', async () => {
      const donations = [
        { amount: '1.0', hash: '0x' + 'b'.repeat(64) },
        { amount: '2.0', hash: '0x' + 'c'.repeat(64) },
        { amount: '3.0', hash: '0x' + 'd'.repeat(64) }
      ];

      // Process donations concurrently
      const promises = donations.map(donation =>
        request(app)
          .post('/api/donors/donate')
          .set('Authorization', `Bearer ${authToken}`)
          .send({
            amount: donation.amount,
            transactionHash: donation.hash,
            donor: testWallet.address
          })
      );

      const responses = await Promise.all(promises);
      
      // All should succeed
      responses.forEach(response => {
        expect(response.status).toBe(201);
        expect(response.body.success).toBe(true);
      });

      // Verify final state
      const user = await User.findOne({ 
        address: testWallet.address.toLowerCase() 
      });
      expect(user.donationCount).toBe(3);
      expect(parseFloat(user.totalDonated)).toBe(6.0);
    });

    it('should maintain data consistency after multiple operations', async () => {
      // Process multiple donations
      const donations = [
        { amount: '1.5', hash: '0x' + 'e'.repeat(64) },
        { amount: '2.5', hash: '0x' + 'f'.repeat(64) }
      ];

      for (const donation of donations) {
        await request(app)
          .post('/api/donors/donate')
          .set('Authorization', `Bearer ${authToken}`)
          .send({
            amount: donation.amount,
            transactionHash: donation.hash,
            donor: testWallet.address
          });
      }

      // Get history and verify consistency
      const historyResponse = await request(app)
        .get('/api/donors/history')
        .set('Authorization', `Bearer ${authToken}`);

      const stats = historyResponse.body.data.statistics;
      const donations_count = historyResponse.body.data.donations.length;

      expect(donations_count).toBe(stats.donationCount);
      
      // Calculate total from individual donations
      const calculatedTotal = historyResponse.body.data.donations
        .reduce((sum, d) => sum + parseFloat(d.amount), 0);
      
      expect(calculatedTotal).toBeCloseTo(parseFloat(stats.totalDonated), 6);
    });
  });
});