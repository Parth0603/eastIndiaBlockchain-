import { describe, it, expect, beforeAll, afterAll, beforeEach } from 'vitest';
import request from 'supertest';
import { ethers } from 'ethers';
import app from '../../backend/server.js';
import database from '../../backend/models/database.js';

/**
 * End-to-End Integration Tests
 * 
 * These tests verify complete user workflows from donation to spending,
 * ensuring all components work together correctly.
 */
describe('End-to-End Integration Tests', () => {
  let server;
  let provider;
  let adminWallet, donorWallet, beneficiaryWallet, vendorWallet, verifierWallet;
  let adminToken, donorToken, beneficiaryToken, vendorToken, verifierToken;
  
  // Contract addresses (will be set after deployment)
  let accessControlAddress, reliefTokenAddress, reliefDistributionAddress;

  beforeAll(async () => {
    // Start test server
    server = app.listen(0); // Use random port
    const port = server.address().port;
    
    // Connect to test database
    await database.connect(process.env.TEST_MONGODB_URI || 'mongodb://localhost:27017/disaster-relief-test');
    
    // Set up test blockchain provider
    provider = new ethers.JsonRpcProvider('http://localhost:8545');
    
    // Create test wallets
    adminWallet = ethers.Wallet.createRandom().connect(provider);
    donorWallet = ethers.Wallet.createRandom().connect(provider);
    beneficiaryWallet = ethers.Wallet.createRandom().connect(provider);
    vendorWallet = ethers.Wallet.createRandom().connect(provider);
    verifierWallet = ethers.Wallet.createRandom().connect(provider);
    
    // Fund wallets with ETH for gas
    const [funder] = await provider.listAccounts();
    if (funder) {
      const fundAmount = ethers.parseEther('10');
      await funder.sendTransaction({ to: adminWallet.address, value: fundAmount });
      await funder.sendTransaction({ to: donorWallet.address, value: fundAmount });
      await funder.sendTransaction({ to: beneficiaryWallet.address, value: fundAmount });
      await funder.sendTransaction({ to: vendorWallet.address, value: fundAmount });
      await funder.sendTransaction({ to: verifierWallet.address, value: fundAmount });
    }
    
    // Deploy contracts for testing
    await deployTestContracts();
    
    // Authenticate all users
    await authenticateUsers();
  });

  afterAll(async () => {
    if (server) {
      server.close();
    }
    await database.disconnect();
  });

  beforeEach(async () => {
    // Clean up database before each test
    await database.db.collection('users').deleteMany({});
    await database.db.collection('applications').deleteMany({});
    await database.db.collection('transactions').deleteMany({});
    await database.db.collection('vendors').deleteMany({});
    await database.db.collection('fraudreports').deleteMany({});
  });

  /**
   * Deploy test contracts
   */
  async function deployTestContracts() {
    try {
      // This would normally use Hardhat deployment scripts
      // For testing, we'll mock the contract addresses
      accessControlAddress = '0x' + '1'.repeat(40);
      reliefTokenAddress = '0x' + '2'.repeat(40);
      reliefDistributionAddress = '0x' + '3'.repeat(40);
      
      // Set environment variables for the backend
      process.env.ACCESS_CONTROL_ADDRESS = accessControlAddress;
      process.env.RELIEF_TOKEN_ADDRESS = reliefTokenAddress;
      process.env.RELIEF_DISTRIBUTION_ADDRESS = reliefDistributionAddress;
    } catch (error) {
      console.warn('Contract deployment skipped in test environment');
    }
  }

  /**
   * Authenticate all test users
   */
  async function authenticateUsers() {
    const users = [
      { wallet: adminWallet, role: 'admin' },
      { wallet: donorWallet, role: 'donor' },
      { wallet: beneficiaryWallet, role: 'beneficiary' },
      { wallet: vendorWallet, role: 'vendor' },
      { wallet: verifierWallet, role: 'verifier' }
    ];

    for (const user of users) {
      const message = 'Login to Disaster Relief System';
      const signature = await user.wallet.signMessage(message);
      
      const response = await request(app)
        .post('/api/auth/login')
        .send({
          address: user.wallet.address,
          signature,
          message
        });

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      
      // Store tokens
      switch (user.role) {
        case 'admin':
          adminToken = response.body.data.token;
          break;
        case 'donor':
          donorToken = response.body.data.token;
          break;
        case 'beneficiary':
          beneficiaryToken = response.body.data.token;
          break;
        case 'vendor':
          vendorToken = response.body.data.token;
          break;
        case 'verifier':
          verifierToken = response.body.data.token;
          break;
      }
    }
  }

  /**
   * Test 1: Complete Donation to Spending Workflow
   * Tests the entire flow from donation to beneficiary spending
   */
  it('should complete full donation to spending workflow', async () => {
    // Step 1: Donor makes a donation
    const donationAmount = '100.50';
    const donationResponse = await request(app)
      .post('/api/donors/donate')
      .set('Authorization', `Bearer ${donorToken}`)
      .send({
        amount: donationAmount,
        transactionHash: '0x' + 'a'.repeat(64),
        donor: donorWallet.address
      });

    expect(donationResponse.status).toBe(200);
    expect(donationResponse.body.success).toBe(true);
    
    // Step 2: Beneficiary submits application
    const applicationResponse = await request(app)
      .post('/api/beneficiaries/apply')
      .set('Authorization', `Bearer ${beneficiaryToken}`)
      .field('disasterType', 'earthquake')
      .field('location', 'Test City, Test Country')
      .field('requestedAmount', '50.00')
      .field('description', 'Family of 4 lost home in earthquake')
      .field('priority', 'high');

    expect(applicationResponse.status).toBe(201);
    expect(applicationResponse.body.success).toBe(true);
    const applicationId = applicationResponse.body.data.applicationId;

    // Step 3: Verifier reviews and approves application
    const reviewResponse = await request(app)
      .post(`/api/admin/verifier/applications/${applicationId}/review`)
      .set('Authorization', `Bearer ${verifierToken}`)
      .send({
        decision: 'approve',
        comments: 'Application approved based on documentation',
        allocatedAmount: '50.00'
      });

    expect(reviewResponse.status).toBe(200);
    expect(reviewResponse.body.success).toBe(true);

    // Step 4: Vendor registers
    const vendorResponse = await request(app)
      .post('/api/vendors/register')
      .set('Authorization', `Bearer ${vendorToken}`)
      .field('businessName', 'Test Grocery Store')
      .field('businessType', 'retail')
      .field('registrationNumber', 'REG123456')
      .field('categories', JSON.stringify(['food', 'water']))
      .field('contactInfo', JSON.stringify({
        email: 'vendor@test.com',
        phone: '+1234567890',
        address: '123 Test St'
      }));

    expect(vendorResponse.status).toBe(201);
    expect(vendorResponse.body.success).toBe(true);
    const vendorId = vendorResponse.body.data.vendorId;

    // Step 5: Verifier approves vendor
    const vendorApprovalResponse = await request(app)
      .post(`/api/admin/verifier/vendors/${vendorId}/approve`)
      .set('Authorization', `Bearer ${verifierToken}`)
      .send({
        decision: 'approve',
        comments: 'Vendor approved based on documentation'
      });

    expect(vendorApprovalResponse.status).toBe(200);
    expect(vendorApprovalResponse.body.success).toBe(true);

    // Step 6: Beneficiary checks balance
    const balanceResponse = await request(app)
      .get('/api/beneficiaries/balance')
      .set('Authorization', `Bearer ${beneficiaryToken}`);

    expect(balanceResponse.status).toBe(200);
    expect(balanceResponse.body.success).toBe(true);

    // Step 7: Beneficiary makes a purchase
    const purchaseResponse = await request(app)
      .post('/api/beneficiaries/spend')
      .set('Authorization', `Bearer ${beneficiaryToken}`)
      .send({
        vendor: vendorWallet.address,
        amount: '25.00',
        category: 'food',
        description: 'Groceries for family',
        transactionHash: '0x' + 'b'.repeat(64)
      });

    expect(purchaseResponse.status).toBe(200);
    expect(purchaseResponse.body.success).toBe(true);

    // Step 8: Vendor processes payment
    const paymentResponse = await request(app)
      .post('/api/vendors/process-payment')
      .set('Authorization', `Bearer ${vendorToken}`)
      .send({
        beneficiary: beneficiaryWallet.address,
        amount: '25.00',
        category: 'food',
        description: 'Groceries',
        transactionHash: '0x' + 'b'.repeat(64)
      });

    expect(paymentResponse.status).toBe(200);
    expect(paymentResponse.body.success).toBe(true);

    // Step 9: Verify transaction history
    const donorHistoryResponse = await request(app)
      .get('/api/donors/history')
      .set('Authorization', `Bearer ${donorToken}`);

    expect(donorHistoryResponse.status).toBe(200);
    expect(donorHistoryResponse.body.data.donations.length).toBeGreaterThan(0);

    const beneficiaryHistoryResponse = await request(app)
      .get('/api/beneficiaries/spending-history')
      .set('Authorization', `Bearer ${beneficiaryToken}`);

    expect(beneficiaryHistoryResponse.status).toBe(200);

    const vendorHistoryResponse = await request(app)
      .get('/api/vendors/transactions')
      .set('Authorization', `Bearer ${vendorToken}`);

    expect(vendorHistoryResponse.status).toBe(200);
  }, 30000); // 30 second timeout for complex workflow

  /**
   * Test 2: Fraud Detection and Reporting Workflow
   * Tests the fraud detection and reporting system
   */
  it('should handle fraud detection and reporting workflow', async () => {
    // Step 1: Set up vendor and beneficiary
    const vendorResponse = await request(app)
      .post('/api/vendors/register')
      .set('Authorization', `Bearer ${vendorToken}`)
      .field('businessName', 'Suspicious Vendor')
      .field('businessType', 'retail')
      .field('registrationNumber', 'REG789')
      .field('categories', JSON.stringify(['food']))
      .field('contactInfo', JSON.stringify({
        email: 'suspicious@test.com',
        phone: '+9876543210'
      }));

    expect(vendorResponse.status).toBe(201);
    const vendorId = vendorResponse.body.data.vendorId;

    // Step 2: Approve vendor
    await request(app)
      .post(`/api/admin/verifier/vendors/${vendorId}/approve`)
      .set('Authorization', `Bearer ${verifierToken}`)
      .send({
        decision: 'approve',
        comments: 'Approved for testing'
      });

    // Step 3: Submit fraud report
    const fraudReportResponse = await request(app)
      .post('/api/fraud/report')
      .set('Authorization', `Bearer ${beneficiaryToken}`)
      .send({
        reportedEntity: vendorWallet.address,
        entityType: 'vendor',
        reportType: 'overcharging',
        severity: 'high',
        description: 'Vendor charging excessive prices for basic goods',
        evidence: [{
          type: 'screenshot',
          description: 'Price comparison',
          data: 'base64_mock_data'
        }],
        isAnonymous: false
      });

    expect(fraudReportResponse.status).toBe(201);
    expect(fraudReportResponse.body.success).toBe(true);
    const reportId = fraudReportResponse.body.data.reportId;

    // Step 4: Admin/Verifier views fraud reports
    const reportsResponse = await request(app)
      .get('/api/fraud/reports')
      .set('Authorization', `Bearer ${verifierToken}`);

    expect(reportsResponse.status).toBe(200);
    expect(reportsResponse.body.data.reports.length).toBeGreaterThan(0);

    // Step 5: Assign investigator
    const assignResponse = await request(app)
      .put(`/api/fraud/reports/${reportId}/assign`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({
        investigatorAddress: verifierWallet.address
      });

    expect(assignResponse.status).toBe(200);

    // Step 6: Investigate and resolve
    const investigateResponse = await request(app)
      .put(`/api/fraud/reports/${reportId}/investigate`)
      .set('Authorization', `Bearer ${verifierToken}`)
      .send({
        notes: 'Investigation completed. Evidence supports the claim.',
        status: 'under_investigation'
      });

    expect(investigateResponse.status).toBe(200);

    const resolveResponse = await request(app)
      .put(`/api/fraud/reports/${reportId}/resolve`)
      .set('Authorization', `Bearer ${verifierToken}`)
      .send({
        decision: 'confirmed_fraud',
        action: 'warning_issued',
        description: 'Warning issued to vendor for overcharging'
      });

    expect(resolveResponse.status).toBe(200);
  }, 20000);

  /**
   * Test 3: Admin System Management Workflow
   * Tests admin system management capabilities
   */
  it('should handle admin system management workflow', async () => {
    // Step 1: Get system statistics
    const statsResponse = await request(app)
      .get('/api/admin/stats')
      .set('Authorization', `Bearer ${adminToken}`);

    expect(statsResponse.status).toBe(200);
    expect(statsResponse.body.success).toBe(true);
    expect(statsResponse.body.data.overview).toBeDefined();

    // Step 2: Get user list
    const usersResponse = await request(app)
      .get('/api/admin/users')
      .set('Authorization', `Bearer ${adminToken}`);

    expect(usersResponse.status).toBe(200);
    expect(usersResponse.body.data.users).toBeDefined();

    // Step 3: Test emergency controls
    const pauseResponse = await request(app)
      .post('/api/admin/emergency/pause')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({
        pause: true,
        reason: 'Testing emergency pause functionality'
      });

    expect(pauseResponse.status).toBe(200);
    expect(pauseResponse.body.data.emergencyState.isPaused).toBe(true);

    // Step 4: Resume system
    const resumeResponse = await request(app)
      .post('/api/admin/emergency/pause')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({
        pause: false,
        reason: 'Testing complete'
      });

    expect(resumeResponse.status).toBe(200);
    expect(resumeResponse.body.data.emergencyState.isPaused).toBe(false);

    // Step 5: Get audit logs
    const auditResponse = await request(app)
      .get('/api/admin/audit/logs')
      .set('Authorization', `Bearer ${adminToken}`);

    expect(auditResponse.status).toBe(200);
    expect(auditResponse.body.data.logs).toBeDefined();
  });

  /**
   * Test 4: Public Transparency Features
   * Tests public transparency and verification features
   */
  it('should provide public transparency features', async () => {
    // Step 1: Get public statistics (no auth required)
    const publicStatsResponse = await request(app)
      .get('/api/public/stats');

    expect(publicStatsResponse.status).toBe(200);
    expect(publicStatsResponse.body.success).toBe(true);

    // Step 2: Search public transactions
    const transactionsResponse = await request(app)
      .get('/api/public/transactions?page=1&limit=10');

    expect(transactionsResponse.status).toBe(200);
    expect(transactionsResponse.body.data.transactions).toBeDefined();

    // Step 3: Get fund flow data
    const fundFlowResponse = await request(app)
      .get('/api/public/fund-flow');

    expect(fundFlowResponse.status).toBe(200);
  });

  /**
   * Test 5: Error Handling and Recovery
   * Tests system error handling and recovery scenarios
   */
  it('should handle errors and recovery scenarios gracefully', async () => {
    // Test 1: Invalid authentication
    const invalidAuthResponse = await request(app)
      .get('/api/donors/history')
      .set('Authorization', 'Bearer invalid-token');

    expect(invalidAuthResponse.status).toBe(401);

    // Test 2: Invalid data submission
    const invalidDataResponse = await request(app)
      .post('/api/donors/donate')
      .set('Authorization', `Bearer ${donorToken}`)
      .send({
        amount: 'invalid-amount',
        transactionHash: 'invalid-hash'
      });

    expect(invalidDataResponse.status).toBe(400);

    // Test 3: Unauthorized access
    const unauthorizedResponse = await request(app)
      .get('/api/admin/stats')
      .set('Authorization', `Bearer ${donorToken}`); // Donor trying to access admin endpoint

    expect(unauthorizedResponse.status).toBe(403);

    // Test 4: Non-existent resource
    const notFoundResponse = await request(app)
      .get('/api/admin/verifier/applications/non-existent-id/review')
      .set('Authorization', `Bearer ${verifierToken}`);

    expect(notFoundResponse.status).toBe(404);

    // Test 5: Rate limiting (would need multiple requests)
    // This is more complex to test in integration tests
  });

  /**
   * Test 6: Cross-component Data Consistency
   * Tests data consistency across different components
   */
  it('should maintain data consistency across components', async () => {
    // Step 1: Create a donation
    const donationResponse = await request(app)
      .post('/api/donors/donate')
      .set('Authorization', `Bearer ${donorToken}`)
      .send({
        amount: '200.00',
        transactionHash: '0x' + 'c'.repeat(64),
        donor: donorWallet.address
      });

    expect(donationResponse.status).toBe(200);

    // Step 2: Check donation appears in donor history
    const donorHistoryResponse = await request(app)
      .get('/api/donors/history')
      .set('Authorization', `Bearer ${donorToken}`);

    expect(donorHistoryResponse.status).toBe(200);
    const donations = donorHistoryResponse.body.data.donations;
    const testDonation = donations.find(d => d.amount === '200.00');
    expect(testDonation).toBeDefined();

    // Step 3: Check donation appears in admin stats
    const adminStatsResponse = await request(app)
      .get('/api/admin/stats')
      .set('Authorization', `Bearer ${adminToken}`);

    expect(adminStatsResponse.status).toBe(200);
    const stats = adminStatsResponse.body.data;
    expect(parseFloat(stats.financial.totalDonated)).toBeGreaterThan(0);

    // Step 4: Check donation appears in public stats
    const publicStatsResponse = await request(app)
      .get('/api/public/stats');

    expect(publicStatsResponse.status).toBe(200);
    const publicStats = publicStatsResponse.body.data;
    expect(parseFloat(publicStats.totalDonations)).toBeGreaterThan(0);

    // Data consistency check: All sources should reflect the same donation
    expect(testDonation.transactionHash).toBe('0x' + 'c'.repeat(64));
  });
});