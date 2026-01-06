import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import request from 'supertest';
import jwt from 'jsonwebtoken';
import app from '../../backend/server.js';
import User from '../../backend/models/User.js';
import Application from '../../backend/models/Application.js';
import Transaction from '../../backend/models/Transaction.js';
import { connectDB, disconnectDB, clearDB } from '../helpers/database.js';

describe('Admin Operations - Property Tests', () => {
  let adminToken, verifierToken, userToken;
  let adminUser, verifierUser, regularUser;

  beforeEach(async () => {
    await connectDB();
    await clearDB();

    // Create test users
    adminUser = await User.create({
      address: '0x1111111111111111111111111111111111111111',
      role: 'admin',
      profile: {
        name: 'Test Admin',
        email: 'admin@test.com',
        verificationStatus: 'verified'
      },
      isActive: true
    });

    verifierUser = await User.create({
      address: '0x2222222222222222222222222222222222222222',
      role: 'verifier',
      profile: {
        name: 'Test Verifier',
        email: 'verifier@test.com',
        verificationStatus: 'verified'
      },
      isActive: true
    });

    regularUser = await User.create({
      address: '0x3333333333333333333333333333333333333333',
      role: 'user',
      profile: {
        name: 'Test User',
        email: 'user@test.com',
        verificationStatus: 'pending'
      },
      isActive: true
    });

    // Generate tokens
    adminToken = jwt.sign(
      { 
        address: adminUser.address, 
        role: adminUser.role,
        name: adminUser.profile.name
      },
      process.env.JWT_SECRET,
      { expiresIn: '1h' }
    );

    verifierToken = jwt.sign(
      { 
        address: verifierUser.address, 
        role: verifierUser.role,
        name: verifierUser.profile.name
      },
      process.env.JWT_SECRET,
      { expiresIn: '1h' }
    );

    userToken = jwt.sign(
      { 
        address: regularUser.address, 
        role: regularUser.role,
        name: regularUser.profile.name
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
   * Property 14: Permission Management
   * Validates: Requirements 4.2, 4.3
   * 
   * Property: Admin operations must maintain proper access control and system integrity
   */
  describe('Property 14: Permission Management', () => {
    it('should enforce admin-only access to system statistics', async () => {
      // Create test data for statistics
      await Transaction.create({
        type: 'donation',
        from: '0x4444444444444444444444444444444444444444',
        to: '0x5555555555555555555555555555555555555555',
        amount: (100 * Math.pow(10, 18)).toString(),
        txHash: '0x1111111111111111111111111111111111111111111111111111111111111111',
        status: 'confirmed',
        category: 'donation'
      });

      // Property: Only admins can access system statistics
      const adminStatsResponse = await request(app)
        .get('/api/admin/stats')
        .set('Authorization', `Bearer ${adminToken}`);

      expect(adminStatsResponse.status).toBe(200);
      expect(adminStatsResponse.body.success).toBe(true);
      expect(adminStatsResponse.body.data.overview).toBeDefined();
      expect(adminStatsResponse.body.data.financial).toBeDefined();

      // Property: Non-admins cannot access system statistics
      const verifierStatsResponse = await request(app)
        .get('/api/admin/stats')
        .set('Authorization', `Bearer ${verifierToken}`);

      expect(verifierStatsResponse.status).toBe(403);
      expect(verifierStatsResponse.body.success).toBe(false);

      const userStatsResponse = await request(app)
        .get('/api/admin/stats')
        .set('Authorization', `Bearer ${userToken}`);

      expect(userStatsResponse.status).toBe(403);
      expect(userStatsResponse.body.success).toBe(false);
    });

    it('should properly manage role assignments and revocations', async () => {
      // Property: Admin can grant roles to users
      const grantRoleResponse = await request(app)
        .post(`/api/admin/users/${regularUser._id}/role`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          role: 'verifier',
          action: 'grant'
        });

      expect(grantRoleResponse.status).toBe(200);
      expect(grantRoleResponse.body.success).toBe(true);
      expect(grantRoleResponse.body.data.newRole).toBe('verifier');

      // Verify database state
      const updatedUser = await User.findById(regularUser._id);
      expect(updatedUser.role).toBe('verifier');
      expect(updatedUser.profile.verificationStatus).toBe('verified');

      // Property: Admin can revoke roles from users
      const revokeRoleResponse = await request(app)
        .post(`/api/admin/users/${regularUser._id}/role`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          role: 'verifier',
          action: 'revoke'
        });

      expect(revokeRoleResponse.status).toBe(200);
      expect(revokeRoleResponse.body.data.newRole).toBe('user');

      // Verify role revocation
      const revokedUser = await User.findById(regularUser._id);
      expect(revokedUser.role).toBe('user');
      expect(revokedUser.profile.verificationStatus).toBe('pending');
    });

    it('should prevent non-admins from managing roles', async () => {
      // Property: Non-admins cannot grant or revoke roles
      const unauthorizedRoleResponse = await request(app)
        .post(`/api/admin/users/${regularUser._id}/role`)
        .set('Authorization', `Bearer ${verifierToken}`)
        .send({
          role: 'admin',
          action: 'grant'
        });

      expect(unauthorizedRoleResponse.status).toBe(403);
      expect(unauthorizedRoleResponse.body.success).toBe(false);

      // Verify user role unchanged
      const unchangedUser = await User.findById(regularUser._id);
      expect(unchangedUser.role).toBe('user');
    });

    it('should provide comprehensive system statistics', async () => {
      // Create comprehensive test data
      const testUsers = await User.insertMany([
        {
          address: '0x6666666666666666666666666666666666666666',
          role: 'beneficiary',
          profile: { verificationStatus: 'verified' }
        },
        {
          address: '0x7777777777777777777777777777777777777777',
          role: 'vendor',
          profile: { verificationStatus: 'verified' }
        }
      ]);

      await Transaction.insertMany([
        {
          type: 'donation',
          from: '0x8888888888888888888888888888888888888888',
          to: '0x9999999999999999999999999999999999999999',
          amount: (500 * Math.pow(10, 18)).toString(),
          status: 'confirmed',
          category: 'donation'
        },
        {
          type: 'spending',
          from: testUsers[0].address,
          to: testUsers[1].address,
          amount: (100 * Math.pow(10, 18)).toString(),
          status: 'confirmed',
          category: 'food'
        }
      ]);

      await Application.create({
        applicantAddress: '0xaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa',
        disasterType: 'earthquake',
        location: 'Test City',
        requestedAmount: (1000 * Math.pow(10, 18)).toString(),
        status: 'pending',
        priority: 'high'
      });

      // Property: Statistics must accurately reflect system state
      const statsResponse = await request(app)
        .get('/api/admin/stats')
        .set('Authorization', `Bearer ${adminToken}`);

      expect(statsResponse.status).toBe(200);
      const stats = statsResponse.body.data;

      // Verify counts
      expect(stats.overview.totalUsers).toBeGreaterThan(0);
      expect(stats.overview.totalDonations).toBe(1);
      expect(stats.overview.totalSpending).toBe(1);
      expect(stats.overview.pendingApplications).toBe(1);
      expect(stats.overview.approvedBeneficiaries).toBe(1);
      expect(stats.overview.verifiedVendors).toBe(1);

      // Verify financial data
      expect(parseFloat(stats.financial.totalDonated)).toBe(500);
      expect(parseFloat(stats.financial.totalSpent)).toBe(100);
      expect(parseFloat(stats.financial.availableFunds)).toBe(400);

      // Verify category breakdown
      expect(stats.categories).toHaveLength(1);
      expect(stats.categories[0].category).toBe('food');
      expect(parseFloat(stats.categories[0].totalSpent)).toBe(100);
    });

    it('should handle emergency system controls', async () => {
      // Property: Admin can pause system in emergency
      const pauseResponse = await request(app)
        .post('/api/admin/emergency/pause')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          pause: true,
          reason: 'Security incident detected'
        });

      expect(pauseResponse.status).toBe(200);
      expect(pauseResponse.body.success).toBe(true);
      expect(pauseResponse.body.data.emergencyState.isPaused).toBe(true);
      expect(pauseResponse.body.data.emergencyState.reason).toBe('Security incident detected');

      // Property: Admin can resume system after pause
      const resumeResponse = await request(app)
        .post('/api/admin/emergency/pause')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          pause: false,
          reason: 'Issue resolved'
        });

      expect(resumeResponse.status).toBe(200);
      expect(resumeResponse.body.data.emergencyState.isPaused).toBe(false);
    });

    it('should prevent non-admins from emergency controls', async () => {
      // Property: Non-admins cannot control emergency state
      const unauthorizedPauseResponse = await request(app)
        .post('/api/admin/emergency/pause')
        .set('Authorization', `Bearer ${verifierToken}`)
        .send({
          pause: true,
          reason: 'Unauthorized attempt'
        });

      expect(unauthorizedPauseResponse.status).toBe(403);
      expect(unauthorizedPauseResponse.body.success).toBe(false);
    });

    it('should provide comprehensive user management', async () => {
      // Create additional test users
      await User.insertMany([
        {
          address: '0xbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb',
          role: 'beneficiary',
          profile: { 
            name: 'Beneficiary 1',
            verificationStatus: 'verified' 
          },
          totalReceived: '500'
        },
        {
          address: '0xcccccccccccccccccccccccccccccccccccccccc',
          role: 'vendor',
          profile: { 
            name: 'Vendor 1',
            verificationStatus: 'pending' 
          }
        }
      ]);

      // Property: Admin can view all users with proper filtering
      const allUsersResponse = await request(app)
        .get('/api/admin/users')
        .set('Authorization', `Bearer ${adminToken}`);

      expect(allUsersResponse.status).toBe(200);
      expect(allUsersResponse.body.data.users.length).toBeGreaterThan(0);

      // Property: Admin can filter users by role
      const beneficiariesResponse = await request(app)
        .get('/api/admin/users')
        .set('Authorization', `Bearer ${adminToken}`)
        .query({ role: 'beneficiary' });

      expect(beneficiariesResponse.status).toBe(200);
      expect(beneficiariesResponse.body.data.users).toHaveLength(1);
      expect(beneficiariesResponse.body.data.users[0].role).toBe('beneficiary');

      // Property: Admin can filter users by verification status
      const pendingUsersResponse = await request(app)
        .get('/api/admin/users')
        .set('Authorization', `Bearer ${adminToken}`)
        .query({ status: 'pending' });

      expect(pendingUsersResponse.status).toBe(200);
      expect(pendingUsersResponse.body.data.users.length).toBeGreaterThan(0);
    });

    it('should provide audit trail functionality', async () => {
      // Create audit-relevant data
      await Transaction.insertMany([
        {
          type: 'donation',
          from: '0xdddddddddddddddddddddddddddddddddddddddd',
          to: '0xeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeee',
          amount: (200 * Math.pow(10, 18)).toString(),
          status: 'confirmed',
          category: 'donation'
        },
        {
          type: 'spending',
          from: '0xeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeee',
          to: '0xffffffffffffffffffffffffffffffffffffffff',
          amount: (50 * Math.pow(10, 18)).toString(),
          status: 'confirmed',
          category: 'medical'
        }
      ]);

      await Application.create({
        applicantAddress: '0xeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeee',
        disasterType: 'flood',
        location: 'Audit City',
        requestedAmount: (800 * Math.pow(10, 18)).toString(),
        status: 'approved',
        priority: 'medium'
      });

      // Property: Audit logs must provide comprehensive activity trail
      const auditResponse = await request(app)
        .get('/api/admin/audit/logs')
        .set('Authorization', `Bearer ${adminToken}`);

      expect(auditResponse.status).toBe(200);
      expect(auditResponse.body.success).toBe(true);
      expect(auditResponse.body.data.logs.length).toBeGreaterThan(0);

      // Verify audit log structure
      const logs = auditResponse.body.data.logs;
      logs.forEach(log => {
        expect(log).toHaveProperty('id');
        expect(log).toHaveProperty('type');
        expect(log).toHaveProperty('action');
        expect(log).toHaveProperty('user');
        expect(log).toHaveProperty('timestamp');
      });
    });

    it('should maintain data consistency during concurrent admin operations', async () => {
      // Create multiple users for concurrent role assignments
      const testUsers = await User.insertMany([
        {
          address: '0x1010101010101010101010101010101010101010',
          role: 'user',
          profile: { verificationStatus: 'pending' }
        },
        {
          address: '0x2020202020202020202020202020202020202020',
          role: 'user',
          profile: { verificationStatus: 'pending' }
        },
        {
          address: '0x3030303030303030303030303030303030303030',
          role: 'user',
          profile: { verificationStatus: 'pending' }
        }
      ]);

      // Property: Concurrent role assignments must maintain individual integrity
      const roleAssignmentPromises = testUsers.map((user, index) =>
        request(app)
          .post(`/api/admin/users/${user._id}/role`)
          .set('Authorization', `Bearer ${adminToken}`)
          .send({
            role: index === 0 ? 'verifier' : index === 1 ? 'beneficiary' : 'vendor',
            action: 'grant'
          })
      );

      const responses = await Promise.all(roleAssignmentPromises);

      // Verify all operations succeeded
      responses.forEach(response => {
        expect(response.status).toBe(200);
        expect(response.body.success).toBe(true);
      });

      // Verify final states are correct
      const updatedUsers = await User.find({
        _id: { $in: testUsers.map(user => user._id) }
      });

      expect(updatedUsers[0].role).toBe('verifier');
      expect(updatedUsers[1].role).toBe('beneficiary');
      expect(updatedUsers[2].role).toBe('vendor');

      // All should be verified after role assignment
      updatedUsers.forEach(user => {
        expect(user.profile.verificationStatus).toBe('verified');
      });
    });

    it('should validate role assignment business rules', async () => {
      // Property: Invalid role assignments must be rejected
      const invalidRoleResponse = await request(app)
        .post(`/api/admin/users/${regularUser._id}/role`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          role: 'invalid_role',
          action: 'grant'
        });

      expect(invalidRoleResponse.status).toBe(400);
      expect(invalidRoleResponse.body.success).toBe(false);

      // Property: Invalid actions must be rejected
      const invalidActionResponse = await request(app)
        .post(`/api/admin/users/${regularUser._id}/role`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          role: 'verifier',
          action: 'invalid_action'
        });

      expect(invalidActionResponse.status).toBe(400);
      expect(invalidActionResponse.body.success).toBe(false);

      // Verify user role unchanged
      const unchangedUser = await User.findById(regularUser._id);
      expect(unchangedUser.role).toBe('user');
    });

    it('should handle pagination correctly for large datasets', async () => {
      // Create large dataset
      const users = [];
      for (let i = 0; i < 55; i++) {
        users.push({
          address: `0x${i.toString().padStart(40, '0')}`,
          role: i % 3 === 0 ? 'beneficiary' : i % 3 === 1 ? 'vendor' : 'user',
          profile: {
            name: `User ${i}`,
            verificationStatus: i % 2 === 0 ? 'verified' : 'pending'
          }
        });
      }
      await User.insertMany(users);

      // Property: Pagination must work correctly for large user lists
      const page1Response = await request(app)
        .get('/api/admin/users')
        .set('Authorization', `Bearer ${adminToken}`)
        .query({ page: 1, limit: 20 });

      expect(page1Response.status).toBe(200);
      expect(page1Response.body.data.users).toHaveLength(20);
      expect(page1Response.body.data.pagination.totalCount).toBeGreaterThan(55);

      const page2Response = await request(app)
        .get('/api/admin/users')
        .set('Authorization', `Bearer ${adminToken}`)
        .query({ page: 2, limit: 20 });

      expect(page2Response.status).toBe(200);
      expect(page2Response.body.data.users).toHaveLength(20);

      // Verify no duplicate users between pages
      const page1Addresses = page1Response.body.data.users.map(u => u.address);
      const page2Addresses = page2Response.body.data.users.map(u => u.address);
      const intersection = page1Addresses.filter(addr => page2Addresses.includes(addr));
      expect(intersection).toHaveLength(0);
    });
  });

  describe('Admin System Integrity', () => {
    it('should maintain referential integrity during user role changes', async () => {
      // Create user with existing data
      const userWithData = await User.create({
        address: '0x4040404040404040404040404040404040404040',
        role: 'beneficiary',
        profile: {
          name: 'Beneficiary with Data',
          verificationStatus: 'verified'
        },
        totalReceived: '1000'
      });

      // Create related application
      await Application.create({
        applicantAddress: userWithData.address,
        disasterType: 'earthquake',
        location: 'Test City',
        requestedAmount: (1000 * Math.pow(10, 18)).toString(),
        status: 'approved',
        priority: 'high'
      });

      // Property: Role changes must preserve existing data relationships
      const roleChangeResponse = await request(app)
        .post(`/api/admin/users/${userWithData._id}/role`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          role: 'vendor',
          action: 'grant'
        });

      expect(roleChangeResponse.status).toBe(200);

      // Verify related data still exists
      const relatedApplication = await Application.findOne({
        applicantAddress: userWithData.address
      });
      expect(relatedApplication).toBeDefined();
      expect(relatedApplication.status).toBe('approved');

      // Verify user data preserved
      const updatedUser = await User.findById(userWithData._id);
      expect(updatedUser.totalReceived).toBe('1000');
    });
  });
});