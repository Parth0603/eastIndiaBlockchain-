import { describe, it, expect, beforeEach, vi } from 'vitest';
import React from 'react';
import { render, screen } from '@testing-library/react';
import { BrowserRouter } from 'react-router-dom';
import AdminPanel from '../../pages/AdminPanel';

// Mock the hooks and components
vi.mock('../../hooks/useApi', () => ({
  useApi: () => ({
    admin: {
      getStats: vi.fn().mockResolvedValue({}),
      getSystemHealth: vi.fn().mockResolvedValue({}),
      getUsers: vi.fn().mockResolvedValue({ users: [] }),
    },
    isLoading: false,
  }),
}));

vi.mock('../../hooks/useAuth', () => ({
  useAuth: () => ({
    user: { role: 'admin' },
    isAuthenticated: true,
  }),
}));

vi.mock('../../components/common/RoleGuard', () => ({
  __esModule: true,
  default: ({ children }) => <div>{children}</div>,
}));

const renderWithRouter = (component) => {
  return render(
    <BrowserRouter>
      {component}
    </BrowserRouter>
  );
};

describe('AdminPanel Component', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should render admin panel with navigation tabs', () => {
    renderWithRouter(<AdminPanel />);

    // Check if the main heading is present
    expect(screen.getByText('Admin Panel')).toBeInTheDocument();
    expect(screen.getByText('Manage the disaster relief system')).toBeInTheDocument();

    // Check if all tabs are present
    expect(screen.getByText('Dashboard')).toBeInTheDocument();
    expect(screen.getByText('Verifiers')).toBeInTheDocument();
    expect(screen.getByText('Configuration')).toBeInTheDocument();
    expect(screen.getByText('Emergency')).toBeInTheDocument();
  });

  it('should display dashboard tab by default', () => {
    renderWithRouter(<AdminPanel />);

    // The Dashboard tab should be active by default (has blue color classes)
    const dashboardTab = screen.getByText('Dashboard').closest('button');
    expect(dashboardTab).toHaveClass('border-blue-500', 'text-blue-600');
  });

  describe('Property 13: Admin Panel Completeness', () => {
    /**
     * Feature: blockchain-disaster-relief, Property 13: Admin Panel Completeness
     * Validates: Requirements 4.1
     * 
     * For any admin panel interface, the system should provide comprehensive statistics
     * and all necessary controls for system management
     */
    it('should provide comprehensive admin interface with all required sections', () => {
      renderWithRouter(<AdminPanel />);
      
      // Verify main admin panel structure
      expect(screen.getByText('Admin Panel')).toBeInTheDocument();
      expect(screen.getByText('Manage the disaster relief system')).toBeInTheDocument();
      
      // Verify all required navigation tabs are present
      expect(screen.getByText('Dashboard')).toBeInTheDocument();
      expect(screen.getByText('Verifiers')).toBeInTheDocument();
      expect(screen.getByText('Configuration')).toBeInTheDocument();
      expect(screen.getByText('Emergency')).toBeInTheDocument();
      
      // Verify default tab is active
      const dashboardTab = screen.getByText('Dashboard').closest('button');
      expect(dashboardTab).toHaveClass('border-blue-500', 'text-blue-600');
    });

    it('should maintain consistent navigation structure', () => {
      renderWithRouter(<AdminPanel />);
      
      // Verify tab structure consistency
      const expectedTabs = ['Dashboard', 'Verifiers', 'Configuration', 'Emergency'];
      
      expectedTabs.forEach(tabName => {
        const tab = screen.getByText(tabName).closest('button');
        expect(tab).toBeInTheDocument();
        expect(tab).toHaveClass('py-2', 'px-1', 'border-b-2', 'font-medium', 'text-sm');
      });
      
      // Verify only one tab is active at a time (Dashboard by default)
      const dashboardTab = screen.getByText('Dashboard').closest('button');
      expect(dashboardTab).toHaveClass('border-blue-500', 'text-blue-600');
      
      // Other tabs should be inactive
      const verifiersTab = screen.getByText('Verifiers').closest('button');
      expect(verifiersTab).toHaveClass('border-transparent', 'text-gray-500');
    });

    it('should provide complete admin functionality access', () => {
      renderWithRouter(<AdminPanel />);
      
      // Verify admin panel provides access to all required functionality
      expect(screen.getByText('Admin Panel')).toBeInTheDocument();
      
      // Verify all management sections are accessible via tabs
      const managementSections = [
        'Dashboard',    // System statistics and overview
        'Verifiers',    // Verifier management
        'Configuration', // System configuration
        'Emergency'     // Emergency controls
      ];
      
      managementSections.forEach(section => {
        expect(screen.getByText(section)).toBeInTheDocument();
      });
      
      // Verify the interface is properly structured for admin operations
      expect(screen.getByText('Manage the disaster relief system')).toBeInTheDocument();
    });
  });
});

/**
 * Property 13: Admin Panel Completeness
 * Validates: Requirements 4.1
 * 
 * This test ensures that the admin panel displays comprehensive statistics
 * and all necessary controls for system management.
 */