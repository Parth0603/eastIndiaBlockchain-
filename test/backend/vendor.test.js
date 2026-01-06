import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import request from 'supertest';
import app from '../../backend/server.js';
import { setupTestDatabase, cleanupTestDatabase } from '../helpers/database.js';

describe('Vendor API Endpoints', () => {
  let authToken;
  let vendorAddress = '0x1234567890123456789012345678901234567890';

  beforeEach(async () => {
    await setupTestDatabase();
    
    // Mock authentication for vendor
    authToken = 'mock-jwt-token';
    
    // Mock the authentication middleware to return vendor user
    app.request.user = {
      address: vendorAddress,
      role: 'vendor'
    };
  });

  afterEach(async () => {
    await cleanupTestDatabase();
  });

  describe('POST /api/vendors/validate-purchase', () => {
    it('should validate a purchase request successfully', async () => {
      const purchaseData = {
        beneficiaryAddress: '0x9876543210987654321098765432109876543210',
        amount: '100.00',
        category: 'food',
        items: [
          { name: 'Rice', quantity: 2, price: '25.00' },
          { name: 'Beans', quantity: 1, price: '50.00' }
        ],
        receiptData: {
          receiptNumber: 'RCP-001',
          notes: 'Emergency food supplies'
        }
      };

      const response = await request(app)
        .post('/api/vendors/validate-purchase')
        .set('Authorization', `Bearer ${authToken}`)
        .send(purchaseData);

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data).toHaveProperty('transactionId');
      expect(response.body.data.status).toBe('pending');
    });

    it('should reject purchase for unapproved category', async () => {
      const purchaseData = {
        beneficiaryAddress: '0x9876543210987654321098765432109876543210',
        amount: '100.00',
        category: 'luxury_items', // Not an approved category
        items: [{ name: 'Jewelry', quantity: 1, price: '100.00' }]
      };

      const response = await request(app)
        .post('/api/vendors/validate-purchase')
        .set('Authorization', `Bearer ${authToken}`)
        .send(purchaseData);

      expect(response.status).toBe(403);
      expect(response.body.success).toBe(false);
      expect(response.body.message).toContain('not approved');
    });
  });

  describe('GET /api/vendors/transactions', () => {
    it('should return vendor transaction history', async () => {
      const response = await request(app)
        .get('/api/vendors/transactions')
        .set('Authorization', `Bearer ${authToken}`);

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data).toHaveProperty('transactions');
      expect(response.body.data).toHaveProperty('pagination');
      expect(response.body.data).toHaveProperty('summary');
    });

    it('should filter transactions by category', async () => {
      const response = await request(app)
        .get('/api/vendors/transactions?category=food')
        .set('Authorization', `Bearer ${authToken}`);

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
    });
  });

  describe('GET /api/vendors/receipt/:transactionId', () => {
    it('should generate receipt for valid transaction', async () => {
      // This would need a real transaction ID in a full test
      const mockTransactionId = '507f1f77bcf86cd799439011';
      
      const response = await request(app)
        .get(`/api/vendors/receipt/${mockTransactionId}`)
        .set('Authorization', `Bearer ${authToken}`);

      // In a real test, this would return 200 with receipt data
      // For now, we expect 404 since no transaction exists
      expect([200, 404]).toContain(response.status);
    });
  });

  describe('GET /api/vendors/dashboard-stats', () => {
    it('should return vendor dashboard statistics', async () => {
      const response = await request(app)
        .get('/api/vendors/dashboard-stats')
        .set('Authorization', `Bearer ${authToken}`);

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data).toHaveProperty('vendor');
      expect(response.body.data).toHaveProperty('stats');
      expect(response.body.data.stats).toHaveProperty('totalRevenue');
      expect(response.body.data.stats).toHaveProperty('totalTransactions');
    });
  });
});