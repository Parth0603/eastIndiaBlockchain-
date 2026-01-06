import { useState, useCallback } from 'react';
import { apiClient } from '../utils/api';
import { useAuth } from './useAuth';
import toast from 'react-hot-toast';

export const useApi = () => {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);
  const { isAuthenticated } = useAuth();

  // Generic API call wrapper
  const apiCall = useCallback(async (apiFunction, options = {}) => {
    const { 
      showLoading = true, 
      showSuccess = false, 
      showError = true,
      successMessage = 'Operation completed successfully',
      requireAuth = true 
    } = options;

    // Check authentication if required
    if (requireAuth && !isAuthenticated) {
      const error = new Error('Authentication required');
      if (showError) toast.error('Please authenticate to continue');
      throw error;
    }

    if (showLoading) setIsLoading(true);
    setError(null);

    try {
      const result = await apiFunction();
      
      if (showSuccess) {
        toast.success(successMessage);
      }
      
      return result;
    } catch (err) {
      const errorMessage = err.message || 'An error occurred';
      setError(errorMessage);
      
      if (showError) {
        toast.error(errorMessage);
      }
      
      throw err;
    } finally {
      if (showLoading) setIsLoading(false);
    }
  }, [isAuthenticated]);

  // Donor API methods
  const donor = {
    donate: useCallback((data) => 
      apiCall(() => apiClient.donors.donate(data), {
        showSuccess: true,
        successMessage: 'Donation processed successfully!'
      }), [apiCall]),

    getHistory: useCallback((params) => 
      apiCall(() => apiClient.donors.getHistory(params), {
        showLoading: false,
        showError: false
      }), [apiCall]),

    getImpact: useCallback(() => 
      apiCall(() => apiClient.donors.getImpact(), {
        showLoading: false
      }), [apiCall]),
  };

  // Beneficiary API methods
  const beneficiary = {
    apply: useCallback((data) => 
      apiCall(() => apiClient.beneficiaries.apply(data), {
        showSuccess: true,
        successMessage: 'Application submitted successfully!'
      }), [apiCall]),

    getStatus: useCallback(() => 
      apiCall(() => apiClient.beneficiaries.getStatus(), {
        showLoading: false
      }), [apiCall]),

    getBalance: useCallback(() => 
      apiCall(() => apiClient.beneficiaries.getBalance(), {
        showLoading: false,
        showError: false
      }), [apiCall]),

    spend: useCallback((data) => 
      apiCall(() => apiClient.beneficiaries.spend(data), {
        showSuccess: true,
        successMessage: 'Transaction completed successfully!'
      }), [apiCall]),

    getSpendingHistory: useCallback((params) => 
      apiCall(() => apiClient.beneficiaries.getSpendingHistory(params), {
        showLoading: false,
        showError: false
      }), [apiCall]),
  };

  // Verifier API methods
  const verifier = {
    getApplications: useCallback((params) => 
      apiCall(() => apiClient.verifiers.getApplications(params), {
        showLoading: false
      }), [apiCall]),

    reviewApplication: useCallback((id, data) => 
      apiCall(() => apiClient.verifiers.reviewApplication(id, data), {
        showSuccess: true,
        successMessage: 'Application reviewed successfully!'
      }), [apiCall]),

    getVendors: useCallback((params) => 
      apiCall(() => apiClient.verifiers.getVendors(params), {
        showLoading: false
      }), [apiCall]),

    approveVendor: useCallback((id, data) => 
      apiCall(() => apiClient.verifiers.approveVendor(id, data), {
        showSuccess: true,
        successMessage: 'Vendor approved successfully!'
      }), [apiCall]),

    getTransactions: useCallback((params) => 
      apiCall(() => apiClient.verifiers.getTransactions(params), {
        showLoading: false
      }), [apiCall]),
  };

  // Admin API methods
  const admin = {
    getStats: useCallback(() => 
      apiCall(() => apiClient.admin.getStats(), {
        showLoading: false
      }), [apiCall]),

    getUsers: useCallback((params) => 
      apiCall(() => apiClient.admin.getUsers(params), {
        showLoading: false
      }), [apiCall]),

    addVerifier: useCallback((data) => 
      apiCall(() => apiClient.admin.addVerifier(data), {
        showSuccess: true,
        successMessage: 'Verifier added successfully!'
      }), [apiCall]),

    removeVerifier: useCallback((id) => 
      apiCall(() => apiClient.admin.removeVerifier(id), {
        showSuccess: true,
        successMessage: 'Verifier removed successfully!'
      }), [apiCall]),

    updateCategories: useCallback((data) => 
      apiCall(() => apiClient.admin.updateCategories(data), {
        showSuccess: true,
        successMessage: 'Categories updated successfully!'
      }), [apiCall]),

    pauseSystem: useCallback(() => 
      apiCall(() => apiClient.admin.pauseSystem(), {
        showSuccess: true,
        successMessage: 'System paused successfully!'
      }), [apiCall]),

    resumeSystem: useCallback(() => 
      apiCall(() => apiClient.admin.resumeSystem(), {
        showSuccess: true,
        successMessage: 'System resumed successfully!'
      }), [apiCall]),
  };

  // Vendor API methods
  const vendor = {
    register: useCallback((data) => 
      apiCall(() => apiClient.vendors.register(data), {
        showSuccess: true,
        successMessage: 'Vendor registration submitted!'
      }), [apiCall]),

    getProfile: useCallback(() => 
      apiCall(() => apiClient.vendors.getProfile(), {
        showLoading: false
      }), [apiCall]),

    updateProfile: useCallback((data) => 
      apiCall(() => apiClient.vendors.updateProfile(data), {
        showSuccess: true,
        successMessage: 'Profile updated successfully!'
      }), [apiCall]),

    getTransactions: useCallback((params) => 
      apiCall(() => apiClient.vendors.getTransactions(params), {
        showLoading: false
      }), [apiCall]),

    getDashboardStats: useCallback(() => 
      apiCall(() => apiClient.vendors.getDashboardStats(), {
        showLoading: false
      }), [apiCall]),

    getCategories: useCallback(() => 
      apiCall(() => apiClient.vendors.getCategories(), {
        showLoading: false
      }), [apiCall]),

    validatePurchase: useCallback((data) => 
      apiCall(() => apiClient.vendors.validatePurchase(data), {
        showSuccess: true,
        successMessage: 'Purchase validated successfully!'
      }), [apiCall]),

    generateReceipt: useCallback((transactionId) => 
      apiCall(() => apiClient.vendors.generateReceipt(transactionId), {
        showLoading: false
      }), [apiCall]),
  };

  // Public API methods (no auth required)
  const publicApi = {
    getStats: useCallback(() => 
      apiCall(() => apiClient.public.getStats(), {
        showLoading: false,
        requireAuth: false
      }), [apiCall]),

    getTransactions: useCallback((params) => 
      apiCall(() => apiClient.public.getTransactions(params), {
        showLoading: false,
        requireAuth: false
      }), [apiCall]),

    searchTransactions: useCallback((params) => 
      apiCall(() => apiClient.public.searchTransactions(params), {
        showLoading: false,
        requireAuth: false
      }), [apiCall]),

    getFundFlow: useCallback(() => 
      apiCall(() => apiClient.public.getFundFlow(), {
        showLoading: false,
        requireAuth: false
      }), [apiCall]),
  };

  // Clear error
  const clearError = useCallback(() => {
    setError(null);
  }, []);

  return {
    // State
    isLoading,
    error,
    clearError,

    // API methods grouped by role
    donor,
    beneficiary,
    verifier,
    admin,
    vendor,
    public: publicApi,

    // Generic API call method
    apiCall,
  };
};