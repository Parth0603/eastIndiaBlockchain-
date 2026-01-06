import { describe, it, expect, beforeEach } from 'vitest';
import { ethers } from 'ethers';
import { businessRules, sanitizers } from '../../backend/services/validation.js';

describe('Data Validation Service Property Tests', () => {
  describe('Property 31: Data Validation Enforcement', () => {
    describe('Donation Amount Validation', () => {
      it('should accept valid donation amounts', () => {
        const validAmounts = [0.000001, 0.1, 1, 100, 1000, 999999];
        
        for (const amount of validAmounts) {
          expect(() => businessRules.validateDonationAmount(amount)).not.toThrow();
        }
      });

      it('should reject invalid donation amounts', () => {
        const invalidAmounts = [0, -1, 0.0000001, 1000001, Infinity, NaN];
        
        for (const amount of invalidAmounts) {
          expect(() => businessRules.validateDonationAmount(amount)).toThrow();
        }
      });

      it('should maintain donation amount boundaries', () => {
        // Test boundary conditions
        expect(() => businessRules.validateDonationAmount(0.000001)).not.toThrow(); // Min valid
        expect(() => businessRules.validateDonationAmount(0.0000009)).toThrow(); // Below min
        expect(() => businessRules.validateDonationAmount(1000000)).not.toThrow(); // Max valid
        expect(() => businessRules.validateDonationAmount(1000001)).toThrow(); // Above max
      });
    });

    describe('Allocation Request Validation', () => {
      it('should validate allocation requests based on emergency level and situation', () => {
        const testCases = [
          { amount: 100, level: 'low', situation: 'economic_crisis', shouldPass: true },
          { amount: 1000, level: 'medium', situation: 'natural_disaster', shouldPass: true },
          { amount: 3000, level: 'high', situation: 'conflict', shouldPass: true },
          { amount: 5000, level: 'critical', situation: 'health_emergency', shouldPass: true },
          { amount: 10000, level: 'low', situation: 'economic_crisis', shouldPass: false },
          { amount: 15000, level: 'critical', situation: 'conflict', shouldPass: false }
        ];

        for (const testCase of testCases) {
          if (testCase.shouldPass) {
            expect(() => businessRules.validateAllocationRequest(
              testCase.amount, 
              testCase.level, 
              testCase.situation
            )).not.toThrow();
          } else {
            expect(() => businessRules.validateAllocationRequest(
              testCase.amount, 
              testCase.level, 
              testCase.situation
            )).toThrow();
          }
        }
      });

      it('should apply correct multipliers for different situations', () => {
        // Conflict situations should allow higher amounts
        expect(() => businessRules.validateAllocationRequest(1000, 'medium', 'conflict')).not.toThrow();
        expect(() => businessRules.validateAllocationRequest(1000, 'medium', 'economic_crisis')).not.toThrow();
        
        // Other situations should have lower limits
        expect(() => businessRules.validateAllocationRequest(500, 'medium', 'other')).not.toThrow();
        expect(() => businessRules.validateAllocationRequest(900, 'medium', 'other')).toThrow();
      });
    });

    describe('Spending Validation', () => {
      it('should validate spending against beneficiary balance', () => {
        const balance = 1000;
        
        expect(() => businessRules.validateSpending(500, 'food', balance)).not.toThrow();
        expect(() => businessRules.validateSpending(1000, 'food', balance)).not.toThrow();
        expect(() => businessRules.validateSpending(1001, 'food', balance)).toThrow();
      });

      it('should enforce category-specific spending limits', () => {
        const balance = 10000; // High balance to test category limits
        
        const testCases = [
          { amount: 100, category: 'food', shouldPass: true },
          { amount: 600, category: 'food', shouldPass: false }, // Exceeds food limit
          { amount: 1500, category: 'shelter', shouldPass: true },
          { amount: 2500, category: 'shelter', shouldPass: false }, // Exceeds shelter limit
          { amount: 800, category: 'medical', shouldPass: true },
          { amount: 1200, category: 'medical', shouldPass: false }, // Exceeds medical limit
        ];

        for (const testCase of testCases) {
          if (testCase.shouldPass) {
            expect(() => businessRules.validateSpending(
              testCase.amount, 
              testCase.category, 
              balance
            )).not.toThrow();
          } else {
            expect(() => businessRules.validateSpending(
              testCase.amount, 
              testCase.category, 
              balance
            )).toThrow();
          }
        }
      });

      it('should enforce minimum spending amounts', () => {
        const balance = 1000;
        
        expect(() => businessRules.validateSpending(0.005, 'food', balance)).toThrow();
        expect(() => businessRules.validateSpending(0.01, 'food', balance)).not.toThrow();
      });
    });

    describe('Vendor Transaction Validation', () => {
      it('should validate vendor transactions with correct totals', () => {
        const validItems = [
          { name: 'Rice', quantity: 2, price: 10 },
          { name: 'Beans', quantity: 1, price: 5 }
        ];
        const totalAmount = 25; // 2*10 + 1*5

        expect(() => businessRules.validateVendorTransaction(validItems, totalAmount)).not.toThrow();
      });

      it('should reject transactions with incorrect totals', () => {
        const items = [
          { name: 'Rice', quantity: 2, price: 10 },
          { name: 'Beans', quantity: 1, price: 5 }
        ];
        const wrongTotal = 30; // Should be 25

        expect(() => businessRules.validateVendorTransaction(items, wrongTotal)).toThrow();
      });

      it('should reject transactions with invalid item data', () => {
        const invalidItemSets = [
          [{ name: 'Rice', quantity: 0, price: 10 }], // Zero quantity
          [{ name: 'Rice', quantity: 2, price: 0 }], // Zero price
          [{ name: 'Rice', quantity: -1, price: 10 }], // Negative quantity
          [{ name: 'Rice', quantity: 2, price: -5 }], // Negative price
        ];

        for (const items of invalidItemSets) {
          expect(() => businessRules.validateVendorTransaction(items, 20)).toThrow();
        }
      });

      it('should handle rounding differences in totals', () => {
        const items = [
          { name: 'Item', quantity: 3, price: 0.33 }
        ];
        const totalAmount = 0.99; // 3 * 0.33 = 0.99

        expect(() => businessRules.validateVendorTransaction(items, totalAmount)).not.toThrow();
        
        // Small rounding difference should be acceptable
        expect(() => businessRules.validateVendorTransaction(items, 1.00)).not.toThrow();
        
        // Large difference should be rejected
        expect(() => businessRules.validateVendorTransaction(items, 1.10)).toThrow();
      });
    });

    describe('Address Sanitization', () => {
      it('should sanitize valid Ethereum addresses', () => {
        const testWallet = ethers.Wallet.createRandom();
        const upperCaseAddress = testWallet.address.toUpperCase();
        const mixedCaseAddress = testWallet.address;

        expect(sanitizers.sanitizeAddress(upperCaseAddress)).toBe(testWallet.address.toLowerCase());
        expect(sanitizers.sanitizeAddress(mixedCaseAddress)).toBe(testWallet.address.toLowerCase());
      });

      it('should reject invalid Ethereum addresses', () => {
        const invalidAddresses = [
          'invalid-address',
          '0x123',
          'not-an-address',
          '0xInvalidAddress',
          null,
          undefined,
          ''
        ];

        for (const address of invalidAddresses) {
          expect(() => sanitizers.sanitizeAddress(address)).toThrow();
        }
      });
    });

    describe('Amount Sanitization', () => {
      it('should sanitize valid amounts', () => {
        const validAmounts = [1, 1.5, '2.5', 100, '0.001'];
        
        for (const amount of validAmounts) {
          const result = sanitizers.sanitizeAmount(amount);
          expect(typeof result).toBe('string');
          expect(parseFloat(result)).toBeGreaterThan(0);
        }
      });

      it('should reject invalid amounts', () => {
        const invalidAmounts = [0, -1, 'invalid', null, undefined, NaN, Infinity];
        
        for (const amount of invalidAmounts) {
          expect(() => sanitizers.sanitizeAmount(amount)).toThrow();
        }
      });
    });

    describe('Text Sanitization', () => {
      it('should sanitize valid text input', () => {
        const validTexts = [
          'Hello World',
          'This is a test message',
          'Special chars: !@#$%^&*()',
          '   Trimmed text   '
        ];

        for (const text of validTexts) {
          const result = sanitizers.sanitizeText(text);
          expect(typeof result).toBe('string');
          expect(result.length).toBeGreaterThan(0);
          expect(result).not.toContain('<script>');
          expect(result).not.toContain('<>');
        }
      });

      it('should remove dangerous content', () => {
        const dangerousTexts = [
          '<script>alert("xss")</script>Hello',
          'Text with <script>malicious</script> content',
          'Text with < and > characters'
        ];

        for (const text of dangerousTexts) {
          const result = sanitizers.sanitizeText(text);
          expect(result).not.toContain('<script>');
          expect(result).not.toContain('<');
          expect(result).not.toContain('>');
        }
      });

      it('should enforce text length limits', () => {
        const longText = 'a'.repeat(1001);
        const shortText = 'a'.repeat(100);

        expect(() => sanitizers.sanitizeText(longText)).toThrow();
        expect(() => sanitizers.sanitizeText(shortText)).not.toThrow();
        
        // Custom length limit
        expect(() => sanitizers.sanitizeText('hello', 3)).toThrow();
        expect(() => sanitizers.sanitizeText('hi', 3)).not.toThrow();
      });

      it('should reject non-string input', () => {
        const nonStringInputs = [123, null, undefined, {}, [], true];
        
        for (const input of nonStringInputs) {
          expect(() => sanitizers.sanitizeText(input)).toThrow();
        }
      });
    });
  });

  describe('Property Validation: Data Validation Invariants', () => {
    it('should maintain validation consistency across multiple calls', () => {
      const testAmount = 100;
      
      // Multiple calls should produce same result
      for (let i = 0; i < 10; i++) {
        expect(() => businessRules.validateDonationAmount(testAmount)).not.toThrow();
      }
    });

    it('should ensure sanitization is idempotent', () => {
      const testAddress = ethers.Wallet.createRandom().address;
      const testAmount = '123.45';
      const testText = '  Hello World  ';

      // Multiple sanitizations should produce same result
      const sanitizedAddress1 = sanitizers.sanitizeAddress(testAddress);
      const sanitizedAddress2 = sanitizers.sanitizeAddress(sanitizedAddress1);
      expect(sanitizedAddress1).toBe(sanitizedAddress2);

      const sanitizedAmount1 = sanitizers.sanitizeAmount(testAmount);
      const sanitizedAmount2 = sanitizers.sanitizeAmount(sanitizedAmount1);
      expect(sanitizedAmount1).toBe(sanitizedAmount2);

      const sanitizedText1 = sanitizers.sanitizeText(testText);
      const sanitizedText2 = sanitizers.sanitizeText(sanitizedText1);
      expect(sanitizedText1).toBe(sanitizedText2);
    });

    it('should maintain business rule boundaries under edge conditions', () => {
      // Test edge cases for all validation functions
      const edgeCases = [
        () => businessRules.validateDonationAmount(Number.MIN_VALUE),
        () => businessRules.validateAllocationRequest(1, 'low', 'other'),
        () => businessRules.validateSpending(0.01, 'food', 0.01),
      ];

      // All edge cases should either pass or fail consistently
      for (const testCase of edgeCases) {
        const firstResult = (() => {
          try {
            testCase();
            return 'pass';
          } catch {
            return 'fail';
          }
        })();

        // Run same test multiple times
        for (let i = 0; i < 5; i++) {
          const result = (() => {
            try {
              testCase();
              return 'pass';
            } catch {
              return 'fail';
            }
          })();
          expect(result).toBe(firstResult);
        }
      }
    });
  });
});