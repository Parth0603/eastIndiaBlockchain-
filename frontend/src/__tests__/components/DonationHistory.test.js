import { describe, it, expect, beforeEach, vi } from 'vitest';
import React from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import DonationHistory from '../../components/donor/DonationHistory';

// Mock the hooks
vi.mock('../../hooks/useWallet', () => ({
  useWallet: vi.fn()
}));

vi.mock('../../hooks/useApi', () => ({
  useApi: vi.fn()
}));

describe('DonationHistory Component - Property Tests', () => {
  const mockGet = vi.fn();
  const mockUseWallet = vi.mocked(vi.importMock('../../hooks/useWallet').useWallet);
  const mockUseApi = vi.mocked(vi.importMock('../../hooks/useApi').useApi);
  
  beforeEach(() => {
    vi.clearAllMocks();
    mockUseApi.mockReturnValue({ get: mockGet });
  });

  describe('Property 3: Donation History Completeness', () => {
    it('should display wallet connection prompt when not connected', () => {
      // Arrange
      mockUseWallet.mockReturnValue({
        account: null,
        isConnected: false
      });

      // Act
      render(<DonationHistory refreshTrigger={0} />);

      // Assert
      expect(screen.getByText('Connect your wallet to view your donation history')).toBeInTheDocument();
    });

    it('should display empty state when no donations exist', async () => {
      // Arrange
      mockUseWallet.mockReturnValue({
        account: '0x123',
        isConnected: true
      });

      mockGet.mockResolvedValue({
        success: true,
        data: {
          donations: [],
          pagination: {
            currentPage: 1,
            totalPages: 0,
            totalCount: 0,
            hasNextPage: false,
            hasPrevPage: false
          },
          statistics: {
            totalDonated: '0',
            donationCount: 0,
            averageDonation: '0'
          }
        }
      });

      // Act
      render(<DonationHistory refreshTrigger={0} />);

      // Assert
      await waitFor(() => {
        expect(screen.getByText('No donations yet. Make your first donation to get started!')).toBeInTheDocument();
      });
    });

    it('should handle API errors gracefully', async () => {
      // Arrange
      mockUseWallet.mockReturnValue({
        account: '0x123',
        isConnected: true
      });

      mockGet.mockRejectedValue(new Error('Network error'));

      // Act
      render(<DonationHistory refreshTrigger={0} />);

      // Assert
      await waitFor(() => {
        expect(screen.getByText('Network error')).toBeInTheDocument();
      });

      expect(screen.getByText('Try Again')).toBeInTheDocument();
    });

    it('should validate donation data structure', async () => {
      // Arrange
      mockUseWallet.mockReturnValue({
        account: '0x123',
        isConnected: true
      });

      const mockDonations = [
        {
          id: 'donation1',
          amount: '100.00',
          transactionHash: '0xabc123',
          status: 'completed',
          timestamp: '2024-01-01T10:00:00Z',
          metadata: {}
        }
      ];

      mockGet.mockResolvedValue({
        success: true,
        data: {
          donations: mockDonations,
          pagination: {
            currentPage: 1,
            totalPages: 1,
            totalCount: 1,
            hasNextPage: false,
            hasPrevPage: false
          },
          statistics: {
            totalDonated: '100.00',
            donationCount: 1,
            averageDonation: '100.00'
          }
        }
      });

      // Act
      render(<DonationHistory refreshTrigger={0} />);

      // Assert - Verify data consistency
      await waitFor(() => {
        expect(screen.getByText('$100.00')).toBeInTheDocument();
      });

      expect(screen.getByText('completed')).toBeInTheDocument();
    });
  });
});

/**
 * Property 3: Donation History Completeness
 * Validates: Requirements 1.4
 * 
 * This test ensures that the donation history component displays complete
 * and accurate donation records, handles various states properly, and
 * maintains data consistency across all operations.
 */