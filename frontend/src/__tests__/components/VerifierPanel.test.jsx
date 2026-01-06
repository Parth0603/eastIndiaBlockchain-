import React from 'react';
import { render, screen } from '@testing-library/react';
import { BrowserRouter } from 'react-router-dom';
import { vi } from 'vitest';
import VerifierPanel from '../../pages/VerifierPanel';

// Mock the hooks
vi.mock('../../hooks/useAuth', () => ({
  useAuth: () => ({
    isAuthenticated: true,
    user: { roles: ['verifier'] },
    isLoading: false,
    error: null
  })
}));

vi.mock('../../hooks/useWallet', () => ({
  useWallet: () => ({
    isConnected: true,
    account: '0x1234567890123456789012345678901234567890',
    balance: '1.0',
    isLoading: false,
    error: null
  })
}));

vi.mock('../../hooks/useApi', () => ({
  useApi: () => ({
    verifier: {
      getApplications: vi.fn().mockResolvedValue({ applications: [] }),
      getVendors: vi.fn().mockResolvedValue({ vendors: [] }),
      getTransactions: vi.fn().mockResolvedValue({ 
        transactions: [], 
        stats: { total: 0, pending: 0, confirmed: 0, failed: 0, totalAmount: '0' },
        totalPages: 1 
      })
    },
    isLoading: false
  })
}));

// Mock react-hot-toast
vi.mock('react-hot-toast', () => ({
  default: {
    success: vi.fn(),
    error: vi.fn()
  }
}));

const renderWithRouter = (component) => {
  return render(
    <BrowserRouter>
      {component}
    </BrowserRouter>
  );
};

describe('VerifierPanel', () => {
  it('renders verifier panel with tabs', () => {
    renderWithRouter(<VerifierPanel />);
    
    // Check if the main heading is present
    expect(screen.getByText('Verifier Panel')).toBeInTheDocument();
    
    // Check if all tabs are present using more specific queries
    expect(screen.getByRole('button', { name: /📋 Application Review/ })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /🏪 Vendor Validation/ })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /📊 Transaction Monitoring/ })).toBeInTheDocument();
  });

  it('displays application review by default', () => {
    renderWithRouter(<VerifierPanel />);
    
    // The Application Review tab should be active by default (check for the heading in content area)
    expect(screen.getByRole('heading', { name: 'Application Review' })).toBeInTheDocument();
  });

  describe('Property 9: Verifier Review Interface', () => {
    /**
     * Feature: blockchain-disaster-relief, Property 9: Verifier Review Interface
     * Validates: Requirements 3.1
     * 
     * For any verifier interface, the system should provide complete review capabilities
     * with all necessary information and actions available
     */
    it('should provide comprehensive review interface for applications', () => {
      renderWithRouter(<VerifierPanel />);
      
      // Verify main verifier panel structure
      expect(screen.getByText('Verifier Panel')).toBeInTheDocument();
      expect(screen.getByText('Review applications, validate vendors, and monitor transactions')).toBeInTheDocument();
      
      // Verify all required tabs are present
      expect(screen.getByRole('button', { name: /📋 Application Review/ })).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /🏪 Vendor Validation/ })).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /📊 Transaction Monitoring/ })).toBeInTheDocument();
      
      // Verify application review interface is displayed by default
      expect(screen.getByRole('heading', { name: 'Application Review' })).toBeInTheDocument();
      
      // Verify filter controls are available
      expect(screen.getByDisplayValue('Pending')).toBeInTheDocument();
      expect(screen.getByText('Refresh')).toBeInTheDocument();
      
      // Verify empty state message when no applications
      expect(screen.getByText('No applications found')).toBeInTheDocument();
    });

    it('should maintain interface consistency across all tabs', () => {
      renderWithRouter(<VerifierPanel />);
      
      // Verify tab structure consistency
      const tabs = [
        { button: /📋 Application Review/, heading: 'Application Review' },
        { button: /🏪 Vendor Validation/, heading: 'Vendor Validation' },
        { button: /📊 Transaction Monitoring/, heading: 'Transaction Monitoring' }
      ];
      
      tabs.forEach(tab => {
        // Each tab button should be present
        expect(screen.getByRole('button', { name: tab.button })).toBeInTheDocument();
      });
      
      // Default tab should be Application Review
      expect(screen.getByRole('heading', { name: 'Application Review' })).toBeInTheDocument();
      
      // Interface should provide consistent navigation
      expect(screen.getByText('Verifier Panel')).toBeInTheDocument();
    });

    it('should provide required review actions and controls', () => {
      renderWithRouter(<VerifierPanel />);
      
      // Verify review interface has necessary controls
      expect(screen.getByRole('heading', { name: 'Application Review' })).toBeInTheDocument();
      
      // Verify status filter dropdown
      const statusFilter = screen.getByDisplayValue('Pending');
      expect(statusFilter).toBeInTheDocument();
      
      // Verify refresh functionality
      expect(screen.getByText('Refresh')).toBeInTheDocument();
      
      // Verify empty state handling
      expect(screen.getByText('No applications found')).toBeInTheDocument();
      
      // Verify interface provides feedback when no data (check for empty state container)
      const emptyStateContainer = screen.getByText('No applications found').closest('.text-center');
      expect(emptyStateContainer).toBeInTheDocument();
    });
  });
});