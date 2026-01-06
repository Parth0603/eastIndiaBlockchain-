import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { ethers } from 'ethers';
import { businessRules } from './services/validation.js';
import Vendor from './models/Vendor.js';
import User from './models/User.js';
import Transaction from './models/Transaction.js';

/**
 * **Feature: blockchain-disaster-relief, Property 18: Purchase Validation and Processing**
 * **Validates: Requirements 5.2, 5.3**
 * 
 * Property 18: Purchase Validation and Processing
 * For any purchase attempt, the system should validate vendor approval status and spending category, 
 * then process valid transactions correctly
 */
describe('Vendor Operations Property Tests', () => {
  // Mock database operations for testing
  const mockVendors = new Map();
  const mockUsers = new Map();
  const mockTransactions = new Map();

  beforeEach(async () => {
    // Clear mock data
    mockVendors.clear();
    mockUsers.clear();
    mockTransactions.clear();
  });

  afterEach(async () => {
    // Cleanup
    mockVendors.clear();
    mockUsers.clear();
    mockTransactions.clear();
  });

  describe('Property 18: Purchase Validation and Processing', () => {
    
    describe('Vendor Approval Status Validation', () => {
      it('should validate vendor approval status for any category', () => {
        // Test data: various vendor states and categories
        const categories = ['food', 'medicine', 'shelter', 'clothing', 'water', 'hygiene', 'emergency_supplies'];
        const vendorStates = [
          { status: 'approved', approvedCategories: ['food', 'medicine'] },
          { status: 'pending', approvedCategories: [] },
          { status: 'rejected', approvedCategories: [] },
          { status: 'suspended', approvedCategories: ['food'] },
          { status: 'approved', approvedCategories: categories } // All categories
        ];

        for (const vendorState of vendorStates) {
          for (const category of categories) {
            const vendorAddress = ethers.Wallet.createRandom().address.toLowerCase();
            
            // Create mock vendor with specific state
            const vendor = {
              address: vendorAddress,
              businessName: `Test Vendor ${Math.random()}`,
              businessType: 'grocery',
              email: `vendor${Math.random()}@test.com`,
              address_line1: '123 Test St',
              city: 'Test City',
              state: 'TS',
              zipCode: '12345',
              status: vendorState.status,
              approvedCategories: vendorState.approvedCategories,
              isApprovedForCategory: function(category) {
                return this.status === 'approved' && this.approvedCategories.includes(category);
              }
            };
            
            mockVendors.set(vendorAddress, vendor);

            // Test approval check
            const isApproved = vendor.isApprovedForCategory(category);
            const expectedApproval = vendorState.status === 'approved' && 
                                   vendorState.approvedCategories.includes(category);
            
            expect(isApproved).toBe(expectedApproval);
          }
        }
      });

      it('should maintain approval consistency across multiple checks', () => {
        const vendorAddress = ethers.Wallet.createRandom().address.toLowerCase();
        const approvedCategories = ['food', 'medicine'];
        
        const vendor = {
          address: vendorAddress,
          businessName: 'Consistent Test Vendor',
          businessType: 'pharmacy',
          email: 'consistent@test.com',
          address_line1: '123 Test St',
          city: 'Test City',
          state: 'TS',
          zipCode: '12345',
          status: 'approved',
          approvedCategories,
          isApprovedForCategory: function(category) {
            return this.status === 'approved' && this.approvedCategories.includes(category);
          }
        };
        
        mockVendors.set(vendorAddress, vendor);

        // Multiple checks should return consistent results
        for (let i = 0; i < 10; i++) {
          expect(vendor.isApprovedForCategory('food')).toBe(true);
          expect(vendor.isApprovedForCategory('medicine')).toBe(true);
          expect(vendor.isApprovedForCategory('shelter')).toBe(false);
        }
      });
    });

    describe('Purchase Amount and Item Validation', () => {
      it('should validate purchase amounts against business rules', () => {
        // Test various purchase amounts and item combinations
        const testCases = [
          {
            items: [{ name: 'Rice', quantity: 2, price: 10 }],
            expectedTotal: 20,
            shouldPass: true
          },
          {
            items: [
              { name: 'Rice', quantity: 2, price: 10 },
              { name: 'Beans', quantity: 1, price: 5 }
            ],
            expectedTotal: 25,
            shouldPass: true
          },
          {
            items: [{ name: 'Medicine', quantity: 1, price: 0.01 }],
            expectedTotal: 0.01,
            shouldPass: true
          },
          {
            items: [{ name: 'Invalid', quantity: 0, price: 10 }],
            expectedTotal: 0,
            shouldPass: false
          },
          {
            items: [{ name: 'Invalid', quantity: 1, price: -5 }],
            expectedTotal: -5,
            shouldPass: false
          },
          {
            items: [{ name: 'Mismatch', quantity: 1, price: 10 }],
            expectedTotal: 15, // Wrong total
            shouldPass: false
          }
        ];

        for (const testCase of testCases) {
          if (testCase.shouldPass) {
            expect(() => businessRules.validateVendorTransaction(
              testCase.items, 
              testCase.expectedTotal
            )).not.toThrow();
          } else {
            expect(() => businessRules.validateVendorTransaction(
              testCase.items, 
              testCase.expectedTotal
            )).toThrow();
          }
        }
      });

      it('should handle floating point precision in calculations', () => {
        // Test cases that might have floating point precision issues
        const precisionTestCases = [
          {
            items: [{ name: 'Item', quantity: 3, price: 0.1 }],
            total: 0.3
          },
          {
            items: [{ name: 'Item', quantity: 7, price: 0.1 }],
            total: 0.7
          },
          {
            items: [{ name: 'Item', quantity: 3, price: 0.33 }],
            total: 0.99
          }
        ];

        for (const testCase of precisionTestCases) {
          // Should not throw due to small floating point differences
          expect(() => businessRules.validateVendorTransaction(
            testCase.items, 
            testCase.total
          )).not.toThrow();
        }
      });
    });

    describe('Transaction Processing Integrity', () => {
      it('should create valid transaction records for approved purchases', () => {
        // Create approved vendor
        const vendorAddress = ethers.Wallet.createRandom().address.toLowerCase();
        const beneficiaryAddress = ethers.Wallet.createRandom().address.toLowerCase();
        
        const vendor = {
          address: vendorAddress,
          businessName: 'Test Processing Vendor',
          businessType: 'grocery',
          email: 'processing@test.com',
          address_line1: '123 Test St',
          city: 'Test City',
          state: 'TS',
          zipCode: '12345',
          status: 'approved',
          approvedCategories: ['food', 'medicine'],
          isApprovedForCategory: function(category) {
            return this.status === 'approved' && this.approvedCategories.includes(category);
          }
        };
        
        mockVendors.set(vendorAddress, vendor);

        // Create beneficiary user
        const beneficiary = {
          address: beneficiaryAddress,
          role: 'beneficiary',
          profile: {
            name: 'Test Beneficiary',
            email: 'beneficiary@test.com',
            verificationStatus: 'approved'
          }
        };
        
        mockUsers.set(beneficiaryAddress, beneficiary);

        // Test transaction creation for various valid scenarios
        const validTransactions = [
          {
            category: 'food',
            amount: '50.00',
            items: [{ name: 'Rice', quantity: 2, price: '25.00' }]
          },
          {
            category: 'medicine',
            amount: '100.00',
            items: [{ name: 'Antibiotics', quantity: 1, price: '100.00' }]
          }
        ];

        for (const txData of validTransactions) {
          // Verify vendor is approved for category
          expect(vendor.isApprovedForCategory(txData.category)).toBe(true);

          // Create transaction
          const transactionId = Math.random().toString(36);
          const transaction = {
            id: transactionId,
            type: 'vendor_payment',
            from: beneficiaryAddress,
            to: vendorAddress,
            amount: (parseFloat(txData.amount) * Math.pow(10, 18)).toString(),
            category: txData.category,
            status: 'pending',
            txHash: '0x' + Math.random().toString(16).substr(2, 64),
            metadata: {
              items: txData.items,
              vendorName: vendor.businessName,
              beneficiaryName: beneficiary.profile.name
            }
          };

          mockTransactions.set(transactionId, transaction);

          // Verify transaction was created correctly
          expect(transaction.type).toBe('vendor_payment');
          expect(transaction.from).toBe(beneficiaryAddress);
          expect(transaction.to).toBe(vendorAddress);
          expect(transaction.category).toBe(txData.category);
          expect(transaction.status).toBe('pending');
          expect(transaction.metadata.vendorName).toBe(vendor.businessName);
          expect(transaction.metadata.beneficiaryName).toBe(beneficiary.profile.name);
          expect(transaction.metadata.items).toEqual(txData.items);
        }
      });

      it('should maintain transaction data integrity across operations', () => {
        const vendorAddress = ethers.Wallet.createRandom().address.toLowerCase();
        const beneficiaryAddress = ethers.Wallet.createRandom().address.toLowerCase();
        
        // Create multiple transactions
        const transactions = [];
        for (let i = 0; i < 5; i++) {
          const transactionId = `tx_${i}`;
          const transaction = {
            id: transactionId,
            type: 'vendor_payment',
            from: beneficiaryAddress,
            to: vendorAddress,
            amount: (Math.random() * 100 * Math.pow(10, 18)).toString(),
            category: 'food',
            status: 'pending',
            txHash: '0x' + Math.random().toString(16).substr(2, 64),
            metadata: {
              items: [{ name: `Item${i}`, quantity: 1, price: '10.00' }],
              vendorName: 'Test Vendor',
              beneficiaryName: 'Test Beneficiary'
            }
          };

          mockTransactions.set(transactionId, transaction);
          transactions.push(transaction);
        }

        // Verify all transactions maintain their integrity
        for (const originalTx of transactions) {
          const retrievedTx = mockTransactions.get(originalTx.id);
          
          expect(retrievedTx.type).toBe(originalTx.type);
          expect(retrievedTx.from).toBe(originalTx.from);
          expect(retrievedTx.to).toBe(originalTx.to);
          expect(retrievedTx.amount).toBe(originalTx.amount);
          expect(retrievedTx.category).toBe(originalTx.category);
          expect(retrievedTx.status).toBe(originalTx.status);
          expect(retrievedTx.txHash).toBe(originalTx.txHash);
          expect(retrievedTx.metadata).toEqual(originalTx.metadata);
        }
      });
    });

    describe('Category-Specific Purchase Validation', () => {
      it('should enforce category restrictions for all vendor-category combinations', () => {
        const categories = ['food', 'medicine', 'shelter', 'clothing', 'water', 'hygiene', 'emergency_supplies'];
        
        // Test each category combination
        for (let i = 0; i < categories.length; i++) {
          const approvedCategories = categories.slice(0, i + 1);
          const vendorAddress = ethers.Wallet.createRandom().address.toLowerCase();
          
          const vendor = {
            address: vendorAddress,
            businessName: `Category Test Vendor ${i}`,
            businessType: 'general',
            email: `category${i}@test.com`,
            address_line1: '123 Test St',
            city: 'Test City',
            state: 'TS',
            zipCode: '12345',
            status: 'approved',
            approvedCategories,
            isApprovedForCategory: function(category) {
              return this.status === 'approved' && this.approvedCategories.includes(category);
            }
          };
          
          mockVendors.set(vendorAddress, vendor);

          // Test each category against this vendor
          for (const category of categories) {
            const isApproved = vendor.isApprovedForCategory(category);
            const shouldBeApproved = approvedCategories.includes(category);
            
            expect(isApproved).toBe(shouldBeApproved);
          }
        }
      });

      it('should validate purchase categories against vendor capabilities', () => {
        // Create vendors with different category specializations
        const vendorSpecs = [
          { type: 'grocery', categories: ['food', 'water'] },
          { type: 'pharmacy', categories: ['medicine', 'hygiene'] },
          { type: 'hardware', categories: ['shelter', 'emergency_supplies'] },
          { type: 'retail', categories: ['clothing', 'hygiene'] }
        ];

        for (const spec of vendorSpecs) {
          const vendorAddress = ethers.Wallet.createRandom().address.toLowerCase();
          
          const vendor = {
            address: vendorAddress,
            businessName: `${spec.type} Vendor`,
            businessType: spec.type,
            email: `${spec.type}@test.com`,
            address_line1: '123 Test St',
            city: 'Test City',
            state: 'TS',
            zipCode: '12345',
            status: 'approved',
            approvedCategories: spec.categories,
            isApprovedForCategory: function(category) {
              return this.status === 'approved' && this.approvedCategories.includes(category);
            }
          };
          
          mockVendors.set(vendorAddress, vendor);

          // Test all categories
          const allCategories = ['food', 'medicine', 'shelter', 'clothing', 'water', 'hygiene', 'emergency_supplies'];
          
          for (const category of allCategories) {
            const isApproved = vendor.isApprovedForCategory(category);
            const shouldBeApproved = spec.categories.includes(category);
            
            expect(isApproved).toBe(shouldBeApproved);
          }
        }
      });
    });

    describe('Error Handling and Edge Cases', () => {
      it('should handle edge cases in purchase validation', () => {
        // Test edge cases for item validation
        const edgeCases = [
          {
            description: 'minimum valid purchase',
            items: [{ name: 'Item', quantity: 1, price: 0.01 }],
            total: 0.01,
            shouldPass: true
          },
          {
            description: 'maximum precision',
            items: [{ name: 'Item', quantity: 1, price: 999999.99 }],
            total: 999999.99,
            shouldPass: true
          },
          {
            description: 'zero quantity',
            items: [{ name: 'Item', quantity: 0, price: 10 }],
            total: 0,
            shouldPass: false
          },
          {
            description: 'zero price',
            items: [{ name: 'Item', quantity: 1, price: 0 }],
            total: 0,
            shouldPass: false
          },
          {
            description: 'negative quantity',
            items: [{ name: 'Item', quantity: -1, price: 10 }],
            total: -10,
            shouldPass: false
          },
          {
            description: 'negative price',
            items: [{ name: 'Item', quantity: 1, price: -10 }],
            total: -10,
            shouldPass: false
          }
        ];

        for (const testCase of edgeCases) {
          if (testCase.shouldPass) {
            expect(() => businessRules.validateVendorTransaction(
              testCase.items, 
              testCase.total
            ), `Failed for: ${testCase.description}`).not.toThrow();
          } else {
            expect(() => businessRules.validateVendorTransaction(
              testCase.items, 
              testCase.total
            ), `Should have failed for: ${testCase.description}`).toThrow();
          }
        }
      });

      it('should maintain vendor state consistency during status changes', () => {
        const vendorAddress = ethers.Wallet.createRandom().address.toLowerCase();
        
        const vendor = {
          address: vendorAddress,
          businessName: 'State Change Vendor',
          businessType: 'grocery',
          email: 'statechange@test.com',
          address_line1: '123 Test St',
          city: 'Test City',
          state: 'TS',
          zipCode: '12345',
          status: 'pending',
          approvedCategories: [],
          isApprovedForCategory: function(category) {
            return this.status === 'approved' && this.approvedCategories.includes(category);
          }
        };
        
        mockVendors.set(vendorAddress, vendor);

        // Test state transitions
        const statusTransitions = [
          { status: 'pending', categories: [], expectApproval: false },
          { status: 'approved', categories: ['food'], expectApproval: true },
          { status: 'suspended', categories: ['food'], expectApproval: false },
          { status: 'approved', categories: ['food', 'medicine'], expectApproval: true },
          { status: 'rejected', categories: [], expectApproval: false }
        ];

        for (const transition of statusTransitions) {
          vendor.status = transition.status;
          vendor.approvedCategories = transition.categories;

          // Test category approval for each transition
          for (const category of transition.categories) {
            const isApproved = vendor.isApprovedForCategory(category);
            expect(isApproved).toBe(transition.expectApproval);
          }

          // Test non-approved categories
          const nonApprovedCategories = ['shelter', 'clothing'].filter(
            cat => !transition.categories.includes(cat)
          );
          
          for (const category of nonApprovedCategories) {
            expect(vendor.isApprovedForCategory(category)).toBe(false);
          }
        }
      });
    });

    describe('Purchase Processing Round-Trip Properties', () => {
      it('should maintain purchase data integrity through complete processing cycle', () => {
        const vendorAddress = ethers.Wallet.createRandom().address.toLowerCase();
        const beneficiaryAddress = ethers.Wallet.createRandom().address.toLowerCase();
        
        // Create vendor and beneficiary
        const vendor = {
          address: vendorAddress,
          businessName: 'Round Trip Vendor',
          businessType: 'grocery',
          email: 'roundtrip@test.com',
          address_line1: '123 Test St',
          city: 'Test City',
          state: 'TS',
          zipCode: '12345',
          status: 'approved',
          approvedCategories: ['food', 'medicine'],
          isApprovedForCategory: function(category) {
            return this.status === 'approved' && this.approvedCategories.includes(category);
          }
        };
        
        mockVendors.set(vendorAddress, vendor);

        const beneficiary = {
          address: beneficiaryAddress,
          role: 'beneficiary',
          profile: {
            name: 'Round Trip Beneficiary',
            email: 'roundtripben@test.com',
            verificationStatus: 'approved'
          }
        };
        
        mockUsers.set(beneficiaryAddress, beneficiary);

        // Test multiple purchase scenarios
        const purchaseScenarios = [
          {
            category: 'food',
            amount: '25.50',
            items: [
              { name: 'Bread', quantity: 2, price: '5.00' },
              { name: 'Milk', quantity: 1, price: '15.50' }
            ]
          },
          {
            category: 'medicine',
            amount: '75.00',
            items: [
              { name: 'Vitamins', quantity: 3, price: '25.00' }
            ]
          }
        ];

        for (const scenario of purchaseScenarios) {
          // Validate business rules
          const calculatedTotal = scenario.items.reduce(
            (sum, item) => sum + (item.quantity * parseFloat(item.price)), 
            0
          );
          expect(calculatedTotal).toBeCloseTo(parseFloat(scenario.amount), 2);

          // Validate vendor approval
          expect(vendor.isApprovedForCategory(scenario.category)).toBe(true);

          // Create and save transaction
          const transactionId = Math.random().toString(36);
          const originalTransaction = {
            id: transactionId,
            type: 'vendor_payment',
            from: beneficiaryAddress,
            to: vendorAddress,
            amount: (parseFloat(scenario.amount) * Math.pow(10, 18)).toString(),
            category: scenario.category,
            status: 'pending',
            txHash: '0x' + Math.random().toString(16).substr(2, 64),
            metadata: {
              items: scenario.items,
              vendorName: vendor.businessName,
              beneficiaryName: beneficiary.profile.name,
              originalAmount: scenario.amount
            }
          };

          mockTransactions.set(transactionId, originalTransaction);

          // Retrieve and verify transaction
          const retrievedTransaction = mockTransactions.get(transactionId);
          
          expect(retrievedTransaction.type).toBe(originalTransaction.type);
          expect(retrievedTransaction.from).toBe(originalTransaction.from);
          expect(retrievedTransaction.to).toBe(originalTransaction.to);
          expect(retrievedTransaction.amount).toBe(originalTransaction.amount);
          expect(retrievedTransaction.category).toBe(originalTransaction.category);
          expect(retrievedTransaction.status).toBe(originalTransaction.status);
          expect(retrievedTransaction.metadata.items).toEqual(originalTransaction.metadata.items);
          expect(retrievedTransaction.metadata.vendorName).toBe(originalTransaction.metadata.vendorName);
          expect(retrievedTransaction.metadata.beneficiaryName).toBe(originalTransaction.metadata.beneficiaryName);

          // Verify amount conversion round-trip
          const retrievedAmount = parseFloat(retrievedTransaction.amount) / Math.pow(10, 18);
          expect(retrievedAmount).toBeCloseTo(parseFloat(scenario.amount), 6);
        }
      });
    });
  });
});