import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import request from 'supertest';
import jwt from 'jsonwebtoken';
import app from '../../backend/server.js';
import User from '../../backend/models/User.js';
import Application from '../../backend/models/Application.js';
import Transaction from '../../backend/models/Transaction.js';
import { connectDB, disconnectDB, clearDB } from '../helpers/database.js';

describe('Verifier Operations - Property Tests', () => {
  let verifierToken, adminToken, applicantToken;
  let verifierUser, adminUser, applicantUser;

  beforeEach(async () => {
    await connectDB();
    await clearDB();

    // Create test users
    verifierUser = await User.create({
      address: '0x1234567890123456789012345678901234567890',
      role: 'verifier',
      profile: {
        name: 'Test Verifier',
        email: 'verifier@test.com',
        verificationStatus: 'verified'
      },
      isActive: true
    });

    adminUser = await User.create({
      address: '0x2234567890123456789012345678901234567890',
      role: 'admin',
      profile: {
        name: 'Test Admin',
        email: 'admin@test.com',
        verificationStatus: 'verified'
      },
      isActive: true
    });

    applicantUser = await User.create({
      address: '0x3234567890123456789012345678901234567890',
      role: 'user',
      profile: {
        name: 'Test Applicant',
        email: 'applicant@test.com',
        verificationStatus: 'pending'
      },
      isActive: true
    });

    // Generate tokens
    verifierToken = jwt.sign(
      { 
        address: verifierUser.address, 
        role: verifierUser.role,
        name: verifierUser.profile.name
      },
      process.env.JWT_SECRET,
      { expiresIn: '1h' }
    );

    adminToken = jwt.sign(
      { 
        address: adminUser.address, 
        role: adminUser.role,
        name: adminUser.profile.name
      },
      process.env.JWT_SECRET,
      { expiresIn: '1h' }
    );

    applicantToken = jwt.sign(
      { 
        address: applicantUser.address, 
        role: applicantUser.role,
        name: applicantUser.profile.name
      },
      process.env.JWT_SECRET,
      { expiresIn: '1h' }
    );
  });

  afterEach(async () => {
    await clearDB();
    await disconnectDB();
  });

  /**
   * Property 10: Verifier Action Processing
   * Validates: Requirements 3.2, 3.3
   * 
   * Property: All verifier actions must maintain data integrity and proper state transitions
   */
  describe('Property 10: Verifier Action Processing', () => {
    it('should maintain application state consistency during review process', async () => {
      // Create test application
      const application = await Application.create({
        applicantAddress: applicantUser.address,
        disasterType: 'earthquake',
        location: 'Test City',
        requestedAmount: (1000 * Math.pow(10, 18)).toString(),
        description: 'Emergency relief needed',
        status: 'pending',
        priority: 'high',
        documents: [],
        metadata: {
          familySize: 4,
          hasChildren: true,
          hasElderly: false,
          hasDisabled: false,
          previouslyReceived: false
        }
      });

      // Property: Application review must change status appropriately
      const approvalResponse = await request(app)
        .post(`/api/admin/verifier/applications/${application._id}/review`)
        .set('Authorization', `Bearer ${verifierToken}`)
        .send({
          decision: 'approve',
          comments: 'Application approved after verification',
          allocatedAmount: 800
        });

      expect(approvalResponse.status).toBe(200);
      expect(approvalResponse.body.success).toBe(true);
      expect(approvalResponse.body.data.status).toBe('approved');

      // Verify database state consistency
      const updatedApplication = await Application.findById(application._id);
      expect(updatedApplication.status).toBe('approved');
      expect(updatedApplication.reviewedBy).toBe(verifierUser.address);
      expect(updatedApplication.approvedAmount).toBe((800 * Math.pow(10, 18)).toString());
      expect(updatedApplication.reviewedAt).toBeDefined();

      // Verify user role was updated
      const updatedUser = await User.findOne({ address: applicantUser.address });
      expect(updatedUser.role).toBe('beneficiary');
      expect(updatedUser.profile.verificationStatus).toBe('verified');
    });

    it('should properly handle application rejection', async () => {
      const application = await Application.create({
        applicantAddress: applicantUser.address,
        disasterType: 'flood',
        location: 'Test City',
        requestedAmount: (2000 * Math.pow(10, 18)).toString(),
        description: 'Emergency relief needed',
        status: 'pending',
        priority: 'medium',
        documents: [],
        metadata: { familySize: 2 }
      });

      // Property: Rejection must not grant beneficiary status
      const rejectionResponse = await request(app)
        .post(`/api/admin/verifier/applications/${application._id}/review`)
        .set('Authorization', `Bearer ${verifierToken}`)
        .send({
          decision: 'reject',
          comments: 'Insufficient documentation provided'
        });

      expect(rejectionResponse.status).toBe(200);
      expect(rejectionResponse.body.data.status).toBe('rejected');

      // Verify user role was NOT changed to beneficiary
      const updatedUser = await User.findOne({ address: applicantUser.address });
      expect(updatedUser.role).toBe('user');
      expect(updatedUser.profile.verificationStatus).toBe('pending');

      // Verify application state
      const updatedApplication = await Application.findById(application._id);
      expect(updatedApplication.status).toBe('rejected');
      expect(updatedApplication.approvedAmount).toBeUndefined();
    });

    it('should enforce proper authorization for verifier actions', async () => {
      const application = await Application.create({
        applicantAddress: applicantUser.address,
        disasterType: 'earthquake',
        location: 'Test City',
        requestedAmount: (1000 * Math.pow(10, 18)).toString(),
        description: 'Emergency relief needed',
        status: 'pending',
        priority: 'high',
        documents: []
      });

      // Property: Non-verifiers cannot perform verifier actions
      const unauthorizedResponse = await request(app)
        .post(`/api/admin/verifier/applications/${application._id}/review`)
        .set('Authorization', `Bearer ${applicantToken}`)
        .send({
          decision: 'approve',
          allocatedAmount: 800
        });

      expect(unauthorizedResponse.status).toBe(403);
      expect(unauthorizedResponse.body.success).toBe(false);

      // Verify application state unchanged
      const unchangedApplication = await Application.findById(application._id);
      expect(unchangedApplication.status).toBe('pending');
      expect(unchangedApplication.reviewedBy).toBeUndefined();
    });

    it('should validate allocation amounts against business rules', async () => {
      const application = await Application.create({
        applicantAddress: applicantUser.address,
        disasterType: 'earthquake',
        location: 'Test City',
        requestedAmount: (1000 * Math.pow(10, 18)).toString(),
        description: 'Emergency relief needed',
        status: 'pending',
        priority: 'low', // Low priority has lower limits
        documents: []
      });

      // Property: Allocation must respect business rule limits
      const excessiveAllocationResponse = await request(app)
        .post(`/api/admin/verifier/applications/${application._id}/review`)
        .set('Authorization', `Bearer ${verifierToken}`)
        .send({
          decision: 'approve',
          allocatedAmount: 10000 // Exceeds limit for low priority
        });

      expect(excessiveAllocationResponse.status).toBe(500);
      expect(excessiveAllocationResponse.body.success).toBe(false);

      // Verify application state unchanged
      const unchangedApplication = await Application.findById(application._id);
      expect(unchangedApplication.status).toBe('pending');
    });

    it('should handle vendor approval workflow correctly', async () => {
      // Create vendor user
      const vendorUser = await User.create({
        address: '0x4234567890123456789012345678901234567890',
        role: 'vendor',
        profile: {
          name: 'Test Vendor',
          email: 'vendor@test.com',
          businessName: 'Test Business',
          businessType: 'grocery',
          verificationStatus: 'pending'
        },
        isActive: false
      });

      // Property: Vendor approval must activate vendor and update status
      const approvalResponse = await request(app)
        .post(`/api/admin/verifier/vendors/${vendorUser._id}/approve`)
        .set('Authorization', `Bearer ${verifierToken}`)
        .send({
          decision: 'approve',
          comments: 'Business documents verified'
        });

      expect(approvalResponse.status).toBe(200);
      expect(approvalResponse.body.success).toBe(true);
      expect(approvalResponse.body.data.status).toBe('verified');

      // Verify vendor state
      const updatedVendor = await User.findById(vendorUser._id);
      expect(updatedVendor.profile.verificationStatus).toBe('verified');
      expect(updatedVendor.isActive).toBe(true);
      expect(updatedVendor.profile.reviewedBy).toBe(verifierUser.address);
    });

    it('should provide comprehensive transaction monitoring', async () => {
      // Create test transactions
      await Transaction.create({
        type: 'donation',
        from: '0x5234567890123456789012345678901234567890',
        to: '0x6234567890123456789012345678901234567890',
        amount: (100 * Math.pow(10, 18)).toString(),
        txHash: '0x1111111111111111111111111111111111111111111111111111111111111111',
        status: 'confirmed',
        category: 'donation'
      });

      await Transaction.create({
        type: 'spending',
        from: applicantUser.address,
        to: '0x7234567890123456789012345678901234567890',
        amount: (50 * Math.pow(10, 18)).toString(),
        txHash: '0x2222222222222222222222222222222222222222222222222222222222222222',
        status: 'confirmed',
        category: 'food',
        flagged: true,
        flagReason: 'Unusual spending pattern'
      });

      // Property: Transaction monitoring must provide complete audit trail
      const monitorResponse = await request(app)
        .get('/api/admin/verifier/transactions/monitor')
        .set('Authorization', `Bearer ${verifierToken}`)
        .query({ flagged: 'true' });

      expect(monitorResponse.status).toBe(200);
      expect(monitorResponse.body.success).toBe(true);
      expect(monitorResponse.body.data.transactions).toHaveLength(1);
      expect(monitorResponse.body.data.transactions[0].flagged).toBe(true);
      expect(monitorResponse.body.data.summary.flaggedCount).toBe(1);
    });

    it('should maintain data consistency across concurrent verifier actions', async () => {
      // Create multiple applications
      const applications = await Promise.all([
        Application.create({
          applicantAddress: '0x8234567890123456789012345678901234567890',
          disasterType: 'earthquake',
          location: 'City A',
          requestedAmount: (1000 * Math.pow(10, 18)).toString(),
          description: 'Emergency relief needed',
          status: 'pending',
          priority: 'high'
        }),
        Application.create({
          applicantAddress: '0x9234567890123456789012345678901234567890',
          disasterType: 'flood',
          location: 'City B',
          requestedAmount: (800 * Math.pow(10, 18)).toString(),
          description: 'Emergency relief needed',
          status: 'pending',
          priority: 'medium'
        })
      ]);

      // Property: Concurrent reviews must maintain individual state integrity
      const reviewPromises = applications.map((app, index) =>
        request(app)
          .post(`/api/admin/verifier/applications/${app._id}/review`)
          .set('Authorization', `Bearer ${verifierToken}`)
          .send({
            decision: index === 0 ? 'approve' : 'reject',
            comments: `Review ${index + 1}`,
            ...(index === 0 && { allocatedAmount: 900 })
          })
      );

      const responses = await Promise.all(reviewPromises);

      // Verify all responses succeeded
      responses.forEach(response => {
        expect(response.status).toBe(200);
        expect(response.body.success).toBe(true);
      });

      // Verify final states are correct
      const finalApplications = await Application.find({
        _id: { $in: applications.map(app => app._id) }
      });

      expect(finalApplications[0].status).toBe('approved');
      expect(finalApplications[1].status).toBe('rejected');
      expect(finalApplications[0].reviewedBy).toBe(verifierUser.address);
      expect(finalApplications[1].reviewedBy).toBe(verifierUser.address);
    });
  });

  describe('Verifier Access Control', () => {
    it('should allow admin users to perform verifier actions', async () => {
      const application = await Application.create({
        applicantAddress: applicantUser.address,
        disasterType: 'earthquake',
        location: 'Test City',
        requestedAmount: (1000 * Math.pow(10, 18)).toString(),
        description: 'Emergency relief needed',
        status: 'pending',
        priority: 'high'
      });

      // Property: Admins have verifier permissions
      const adminReviewResponse = await request(app)
        .post(`/api/admin/verifier/applications/${application._id}/review`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          decision: 'approve',
          allocatedAmount: 800
        });

      expect(adminReviewResponse.status).toBe(200);
      expect(adminReviewResponse.body.success).toBe(true);
    });

    it('should provide proper pagination for large datasets', async () => {
      // Create multiple applications
      const applications = [];
      for (let i = 0; i < 25; i++) {
        applications.push({
          applicantAddress: `0x${i.toString().padStart(40, '0')}`,
          disasterType: 'earthquake',
          location: `City ${i}`,
          requestedAmount: (1000 * Math.pow(10, 18)).toString(),
          description: `Emergency relief needed ${i}`,
          status: 'pending',
          priority: 'medium'
        });
      }
      await Application.insertMany(applications);

      // Property: Pagination must work correctly for large datasets
      const page1Response = await request(app)
        .get('/api/admin/verifier/applications')
        .set('Authorization', `Bearer ${verifierToken}`)
        .query({ page: 1, limit: 10 });

      expect(page1Response.status).toBe(200);
      expect(page1Response.body.data.applications).toHaveLength(10);
      expect(page1Response.body.data.pagination.totalCount).toBe(25);
      expect(page1Response.body.data.pagination.totalPages).toBe(3);

      const page2Response = await request(app)
        .get('/api/admin/verifier/applications')
        .set('Authorization', `Bearer ${verifierToken}`)
        .query({ page: 2, limit: 10 });

      expect(page2Response.status).toBe(200);
      expect(page2Response.body.data.applications).toHaveLength(10);
    });
  });
});