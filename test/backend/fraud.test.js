import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import request from 'supertest';
import app from '../../backend/server.js';
import { connectDB, disconnectDB, clearDB } from '../helpers/database.js';
import FraudReport from '../../backend/models/FraudReport.js';
import Transaction from '../../backend/models/Transaction.js';
import Vendor from '../../backend/models/Vendor.js';
import fraudDetectionService from '../../backend/services/fraudDetection.js';

describe('Fraud Prevention System', () => {
  let adminToken, verifierToken, vendorToken;
  let vendorAddress = '0x1234567890123456789012345678901234567890';
  let beneficiaryAddress = '0x9876543210987654321098765432109876543210';

  beforeEach(async () => {
    await connectDB();
    await clearDB();
    
    // Mock authentication tokens
    adminToken = 'mock-admin-token';
    verifierToken = 'mock-verifier-token';
    vendorToken = 'mock-vendor-token';
  });

  afterEach(async () => {
    await disconnectDB();
  });

  describe('Fraud Detection Service', () => {
    it('should detect excessive transaction amounts', async () => {
      const transactionData = {
        from: beneficiaryAddress,
        to: vendorAddress,
        amount: (2000 * Math.pow(10, 18)).toString(), // 2000 ETH - exceeds threshold
        category: 'food',
        type: 'vendor_payment'
      };

      const analysis = await fraudDetectionService.analyzeTransaction(transactionData);

      expect(analysis.isSuspicious).toBe(true);
      expect(analysis.riskLevel).toBe('high');
      expect(analysis.flags).toHaveLength(1);
      expect(analysis.flags[0].pattern).toBe('excessive_amount');
      expect(analysis.recommendation.action).toBe('review');
    });

    it('should detect rapid succession transactions', async () => {
      // Create multiple recent transactions
      const baseTime = new Date();
      for (let i = 0; i < 12; i++) {
        await Transaction.create({
          txHash: `0x${i.toString().padStart(64, '0')}`,
          from: beneficiaryAddress,
          to: vendorAddress,
          amount: (10 * Math.pow(10, 18)).toString(),
          type: 'vendor_payment',
          category: 'food',
          status: 'confirmed',
          createdAt: new Date(baseTime.getTime() - (i * 5 * 60 * 1000)) // 5 minutes apart
        });
      }

      const transactionData = {
        from: beneficiaryAddress,
        to: vendorAddress,
        amount: (10 * Math.pow(10, 18)).toString(),
        category: 'food',
        type: 'vendor_payment'
      };

      const analysis = await fraudDetectionService.analyzeTransaction(transactionData);

      expect(analysis.isSuspicious).toBe(true);
      expect(analysis.flags.some(f => f.pattern === 'rapid_succession')).toBe(true);
    });

    it('should detect excessive daily spending', async () => {
      // Create transactions totaling more than daily limit
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      
      for (let i = 0; i < 5; i++) {
        await Transaction.create({
          txHash: `0x${i.toString().padStart(64, '0')}`,
          from: beneficiaryAddress,
          to: vendorAddress,
          amount: (1200 * Math.pow(10, 18)).toString(), // 1200 ETH each
          type: 'vendor_payment',
          category: 'food',
          status: 'confirmed',
          createdAt: new Date(today.getTime() + (i * 60 * 60 * 1000)) // 1 hour apart
        });
      }

      const transactionData = {
        from: beneficiaryAddress,
        to: vendorAddress,
        amount: (100 * Math.pow(10, 18)).toString(),
        category: 'food',
        type: 'vendor_payment'
      };

      const analysis = await fraudDetectionService.analyzeTransaction(transactionData);

      expect(analysis.isSuspicious).toBe(true);
      expect(analysis.flags.some(f => f.pattern === 'excessive_daily_spending')).toBe(true);
    });

    it('should allow normal transactions', async () => {
      const transactionData = {
        from: beneficiaryAddress,
        to: vendorAddress,
        amount: (50 * Math.pow(10, 18)).toString(), // 50 ETH - normal amount
        category: 'food',
        type: 'vendor_payment'
      };

      const analysis = await fraudDetectionService.analyzeTransaction(transactionData);

      expect(analysis.isSuspicious).toBe(false);
      expect(analysis.riskLevel).toBe('low');
      expect(analysis.recommendation.action).toBe('allow');
    });
  });

  describe('Fraud Reporting API', () => {
    beforeEach(() => {
      // Mock authentication middleware
      app.request.user = {
        address: beneficiaryAddress,
        role: 'beneficiary'
      };
    });

    it('should submit fraud report successfully', async () => {
      const reportData = {
        reportedEntity: vendorAddress,
        entityType: 'vendor',
        reportType: 'fraudulent_transaction',
        severity: 'high',
        description: 'Vendor charged excessive prices for basic food items',
        evidence: [{
          type: 'transaction_hash',
          description: 'Overpriced transaction',
          data: '0x1234567890abcdef'
        }]
      };

      const response = await request(app)
        .post('/api/fraud/report')
        .set('Authorization', `Bearer ${adminToken}`)
        .send(reportData);

      expect(response.status).toBe(201);
      expect(response.body.success).toBe(true);
      expect(response.body.data).toHaveProperty('reportId');
      expect(response.body.data.status).toBe('pending');
    });

    it('should reject report with missing required fields', async () => {
      const reportData = {
        reportedEntity: vendorAddress,
        entityType: 'vendor'
        // Missing reportType and description
      };

      const response = await request(app)
        .post('/api/fraud/report')
        .set('Authorization', `Bearer ${adminToken}`)
        .send(reportData);

      expect(response.status).toBe(400);
      expect(response.body.success).toBe(false);
      expect(response.body.message).toContain('Missing required fields');
    });
  });

  describe('Fraud Report Management', () => {
    let reportId;

    beforeEach(async () => {
      // Create a test fraud report
      const report = new FraudReport({
        reportedEntity: vendorAddress,
        entityType: 'vendor',
        reportType: 'fraudulent_transaction',
        severity: 'medium',
        description: 'Test fraud report',
        reportedBy: {
          address: beneficiaryAddress,
          role: 'beneficiary',
          isAnonymous: false
        }
      });
      await report.save();
      reportId = report.reportId;

      // Mock admin authentication
      app.request.user = {
        address: '0xadmin123456789012345678901234567890',
        role: 'admin'
      };
    });

    it('should get fraud reports for admin', async () => {
      const response = await request(app)
        .get('/api/fraud/reports')
        .set('Authorization', `Bearer ${adminToken}`);

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data.reports).toHaveLength(1);
      expect(response.body.data.reports[0].reportId).toBe(reportId);
    });

    it('should assign report to investigator', async () => {
      const investigatorAddress = '0xinvestigator1234567890123456789012345678';
      
      const response = await request(app)
        .put(`/api/fraud/reports/${reportId}/assign`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ investigatorAddress });

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data.assignedTo).toBe(investigatorAddress.toLowerCase());
      expect(response.body.data.status).toBe('under_investigation');
    });

    it('should resolve fraud report', async () => {
      const resolutionData = {
        decision: 'confirmed_fraud',
        action: 'temporary_suspension',
        description: 'Evidence confirms fraudulent activity'
      };

      const response = await request(app)
        .put(`/api/fraud/reports/${reportId}/resolve`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send(resolutionData);

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data.decision).toBe('confirmed_fraud');
      expect(response.body.data.action).toBe('temporary_suspension');
    });
  });

  describe('Transaction Review', () => {
    let transactionId;

    beforeEach(async () => {
      // Create a flagged transaction
      const transaction = new Transaction({
        txHash: '0xflagged123456789012345678901234567890123456789012345678901234',
        from: beneficiaryAddress,
        to: vendorAddress,
        amount: (100 * Math.pow(10, 18)).toString(),
        type: 'vendor_payment',
        category: 'food',
        status: 'pending',
        metadata: {
          fraudFlags: [{
            pattern: 'suspicious_timing',
            severity: 'medium',
            description: 'Transaction at unusual hour'
          }],
          riskLevel: 'medium',
          requiresReview: true
        }
      });
      await transaction.save();
      transactionId = transaction._id;

      // Mock verifier authentication
      app.request.user = {
        address: '0xverifier123456789012345678901234567890',
        role: 'verifier'
      };
    });

    it('should approve flagged transaction', async () => {
      const response = await request(app)
        .put(`/api/fraud/transactions/${transactionId}/review`)
        .set('Authorization', `Bearer ${verifierToken}`)
        .send({
          decision: 'approve',
          notes: 'Reviewed and approved - legitimate transaction'
        });

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data.decision).toBe('approve');
    });

    it('should reject flagged transaction', async () => {
      const response = await request(app)
        .put(`/api/fraud/transactions/${transactionId}/review`)
        .set('Authorization', `Bearer ${verifierToken}`)
        .send({
          decision: 'reject',
          notes: 'Confirmed fraudulent activity'
        });

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data.decision).toBe('reject');
      expect(response.body.data.status).toBe('failed');
    });
  });

  describe('Vendor Fraud Status', () => {
    beforeEach(async () => {
      // Create vendor with some suspicious activity
      const vendor = new Vendor({
        address: vendorAddress,
        businessName: 'Test Vendor',
        businessType: 'grocery',
        email: 'test@vendor.com',
        address_line1: '123 Test St',
        city: 'Test City',
        state: 'TS',
        zipCode: '12345',
        status: 'approved',
        suspiciousActivityCount: 2,
        lastSuspiciousActivity: new Date()
      });
      await vendor.save();

      // Mock vendor authentication
      app.request.user = {
        address: vendorAddress,
        role: 'vendor'
      };
    });

    it('should get vendor fraud status', async () => {
      const response = await request(app)
        .get('/api/vendors/fraud-status')
        .set('Authorization', `Bearer ${vendorToken}`);

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data.suspiciousActivityCount).toBe(2);
      expect(response.body.data.riskLevel).toBe('medium');
    });

    it('should submit dispute for flagged transaction', async () => {
      // Create a flagged transaction
      const transaction = new Transaction({
        txHash: '0xdispute123456789012345678901234567890123456789012345678901234',
        from: beneficiaryAddress,
        to: vendorAddress,
        amount: (50 * Math.pow(10, 18)).toString(),
        type: 'vendor_payment',
        category: 'food',
        status: 'pending',
        metadata: {
          fraudFlags: [{
            pattern: 'price_manipulation',
            severity: 'medium',
            description: 'Unusual pricing detected'
          }],
          riskLevel: 'medium'
        }
      });
      await transaction.save();

      const disputeData = {
        transactionId: transaction._id,
        disputeReason: 'Prices were correct according to current market rates',
        evidence: 'Market price comparison document available'
      };

      const response = await request(app)
        .post('/api/vendors/dispute-flag')
        .set('Authorization', `Bearer ${vendorToken}`)
        .send(disputeData);

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data).toHaveProperty('disputeId');
      expect(response.body.data.status).toBe('pending_review');
    });
  });

  describe('Fraud Statistics', () => {
    beforeEach(async () => {
      // Mock admin authentication
      app.request.user = {
        address: '0xadmin123456789012345678901234567890',
        role: 'admin'
      };

      // Create some test data
      await FraudReport.create({
        reportedEntity: vendorAddress,
        entityType: 'vendor',
        reportType: 'fraudulent_transaction',
        severity: 'high',
        description: 'Test report 1',
        status: 'resolved',
        reportedBy: { address: beneficiaryAddress, role: 'beneficiary' }
      });

      await FraudReport.create({
        reportedEntity: '0xanother1234567890123456789012345678901234',
        entityType: 'vendor',
        reportType: 'price_manipulation',
        severity: 'medium',
        description: 'Test report 2',
        status: 'pending',
        reportedBy: { address: beneficiaryAddress, role: 'beneficiary' }
      });
    });

    it('should get fraud statistics', async () => {
      const response = await request(app)
        .get('/api/fraud/statistics?timeframe=30d')
        .set('Authorization', `Bearer ${adminToken}`);

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data).toHaveProperty('timeframe', '30d');
      expect(response.body.data).toHaveProperty('summary');
      expect(response.body.data.summary.totalReports).toBeGreaterThan(0);
    });
  });
});