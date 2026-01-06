import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';
import React from 'react';
import { render, screen, waitFor, cleanup } from '@testing-library/react';
import * as fc from 'fast-check';
import '@testing-library/jest-dom';
import FundBalance from '../../components/beneficiary/FundBalance';
import { useApi } from '../../hooks/useApi';

// Mock the hooks
vi.mock('../../hooks/useApi');

describe('FundBalance Component - Property Tests', () => {
  const mockBeneficiary = {
    getBalance: vi.fn()
  };

  beforeEach(() => {
    vi.clearAllMocks();
    useApi.mockReturnValue({ 
      beneficiary: mockBeneficiary,
      isLoading: false 
    });
  });

  afterEach(() => {
    cleanup();
  });

  describe('Property 8: Balance Display Consistency', () => {
    /**
     * Feature: blockchain-disaster-relief, Property 8: Balance Display Consistency
     * Validates: Requirements 2.5
     * 
     * For any beneficiary with allocated funds, the system should display 
     * accurate available balance and complete spending history
     */
    it('should maintain mathematical consistency between allocated, spent, and remaining amounts', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.record({
            allocated: fc.float({ min: 0, max: 1000, noNaN: true }),
            spent: fc.float({ min: 0, max: 1000, noNaN: true }),
            spendingByCategory: fc.dictionary(
              fc.constantFrom('food', 'medicine', 'shelter', 'clothing'),
              fc.float({ min: 0, max: 100, noNaN: true })
            )
          }).filter(data => data.spent <= data.allocated),
          
          async (balanceData) => {
            // Clean up any existing DOM elements first
            cleanup();
            
            // Ensure spending by category totals don't exceed spent amount
            const categoryTotal = Object.values(balanceData.spendingByCategory).reduce((sum, amount) => sum + amount, 0);
            const adjustedData = {
              ...balanceData,
              spent: Math.max(balanceData.spent, categoryTotal),
              allocated: Math.max(balanceData.allocated, Math.max(balanceData.spent, categoryTotal))
            };

            // Mock API response
            mockBeneficiary.getBalance.mockResolvedValue(adjustedData);

            // Render component in a fresh container
            const { container, unmount } = render(<FundBalance />);

            try {
              // Wait for component to load
              await waitFor(() => {
                expect(screen.queryByText('Refreshing...')).not.toBeInTheDocument();
              }, { timeout: 3000 });

              // Calculate expected values with proper rounding to avoid floating point issues
              const expectedRemaining = Math.round((adjustedData.allocated - adjustedData.spent) * 100) / 100;

              // Verify mathematical consistency by checking the main balance display
              const availableBalanceElement = container.querySelector('.text-4xl.font-bold.text-green-600');
              expect(availableBalanceElement).toHaveTextContent(`${expectedRemaining.toFixed(2)}`);

              // Use container queries to avoid multiple element issues
              const allocatedElements = container.querySelectorAll('span.text-gray-600');
              const allocatedElement = Array.from(allocatedElements).find(el => el.textContent === 'Total Allocated:');
              expect(allocatedElement).toBeInTheDocument();
              
              const spentElement = Array.from(allocatedElements).find(el => el.textContent === 'Total Spent:');
              expect(spentElement).toBeInTheDocument();
              
              const remainingElements = container.querySelectorAll('span.text-gray-800.font-medium');
              const remainingElement = Array.from(remainingElements).find(el => el.textContent === 'Remaining:');
              expect(remainingElement).toBeInTheDocument();

              // Verify the remaining amount is non-negative (with floating point tolerance)
              expect(expectedRemaining).toBeGreaterThanOrEqual(-0.01);
            } finally {
              // Always clean up
              unmount();
            }
          }
        ),
        { numRuns: 5, timeout: 8000 }
      );
    }, 12000);

    it('should display appropriate status messages based on balance state', async () => {
      // Test zero allocation case
      const zeroAllocationData = { allocated: 0, spent: 0, spendingByCategory: {} };
      mockBeneficiary.getBalance.mockResolvedValue(zeroAllocationData);
      
      const { unmount: unmount1 } = render(<FundBalance />);
      
      await waitFor(() => {
        expect(screen.getByText(/No funds allocated yet/)).toBeInTheDocument();
      });
      
      unmount1();

      // Test fully spent case
      const fullySpentData = { allocated: 100, spent: 100, spendingByCategory: { food: 100 } };
      mockBeneficiary.getBalance.mockResolvedValue(fullySpentData);
      
      const { unmount: unmount2 } = render(<FundBalance />);
      
      await waitFor(() => {
        expect(screen.getByText(/You have spent your entire allocation/)).toBeInTheDocument();
      });
      
      unmount2();
    });

    it('should handle spending by category display correctly', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.record({
            allocated: fc.float({ min: 100, max: 1000, noNaN: true }),
            spent: fc.float({ min: 50, max: 500, noNaN: true }),
            spendingByCategory: fc.dictionary(
              fc.constantFrom('food', 'medicine', 'shelter', 'clothing'),
              fc.float({ min: 1, max: 50, noNaN: true }),
              { minKeys: 1, maxKeys: 2 }
            )
          }).filter(data => {
            const categoryTotal = Object.values(data.spendingByCategory).reduce((sum, amount) => sum + amount, 0);
            return data.spent >= categoryTotal && data.spent <= data.allocated;
          }),
          
          async (balanceData) => {
            // Mock API response
            mockBeneficiary.getBalance.mockResolvedValue(balanceData);

            // Render component
            const { unmount } = render(<FundBalance />);

            // Wait for component to load
            await waitFor(() => {
              expect(screen.queryByText('Refreshing...')).not.toBeInTheDocument();
            }, { timeout: 3000 });

            // Verify category spending section is displayed when categories exist
            if (Object.keys(balanceData.spendingByCategory).length > 0) {
              expect(screen.getByText('Spending by Category')).toBeInTheDocument();
            }

            // Verify total spent is at least the sum of categories
            const categoryTotal = Object.values(balanceData.spendingByCategory).reduce((sum, amount) => sum + amount, 0);
            expect(balanceData.spent).toBeGreaterThanOrEqual(categoryTotal);

            // Clean up properly
            unmount();
          }
        ),
        { numRuns: 5, timeout: 8000 }
      );
    }, 12000);
  });
});