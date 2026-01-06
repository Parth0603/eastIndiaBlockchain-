const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'https://eastindiablockchain.onrender.com/api';

class ApiService {
  constructor() {
    this.baseURL = API_BASE_URL;
  }

  // Helper method to get auth headers
  getAuthHeaders() {
    // Try to get token from sessionStorage (our auth system)
    let token = null;
    try {
      const walletAuth = sessionStorage.getItem('walletAuth');
      if (walletAuth) {
        const authData = JSON.parse(walletAuth);
        token = authData.user?.token;
      }
    } catch (error) {
      console.error('Error parsing wallet auth:', error);
    }
    
    // Fallback to localStorage for backward compatibility
    if (!token) {
      token = localStorage.getItem('authToken');
    }
    
    return {
      'Content-Type': 'application/json',
      ...(token && { Authorization: `Bearer ${token}` })
    };
  }

  // Helper method to get public headers (no auth)
  getPublicHeaders() {
    return {
      'Content-Type': 'application/json'
    };
  }

  // Generic request method for authenticated endpoints
  async request(endpoint, options = {}) {
    const url = `${this.baseURL}${endpoint}`;
    const config = {
      headers: this.getAuthHeaders(),
      ...options
    };

    try {
      const response = await fetch(url, config);
      
      // Handle different response types
      let data;
      const contentType = response.headers.get('content-type');
      
      if (contentType && contentType.includes('application/json')) {
        data = await response.json();
      } else {
        // Handle non-JSON responses (like rate limiting errors)
        const text = await response.text();
        data = { message: text, status: response.status };
      }

      if (!response.ok) {
        // Handle specific error codes
        if (response.status === 429) {
          throw new Error('Rate limit exceeded. Please try again in a moment.');
        }
        throw new Error(data.message || `HTTP error! status: ${response.status}`);
      }

      return data;
    } catch (error) {
      console.error(`API request failed: ${endpoint}`, error);
      throw error;
    }
  }

  // Generic request method for public endpoints
  async publicRequest(endpoint, options = {}) {
    const url = `${this.baseURL}${endpoint}`;
    const config = {
      headers: this.getPublicHeaders(),
      ...options
    };

    try {
      const response = await fetch(url, config);
      
      // Handle different response types
      let data;
      const contentType = response.headers.get('content-type');
      
      if (contentType && contentType.includes('application/json')) {
        data = await response.json();
      } else {
        // Handle non-JSON responses (like rate limiting errors)
        const text = await response.text();
        data = { message: text, status: response.status };
      }

      if (!response.ok) {
        // Handle specific error codes
        if (response.status === 429) {
          throw new Error('Rate limit exceeded. Please try again in a moment.');
        }
        throw new Error(data.message || `HTTP error! status: ${response.status}`);
      }

      return data;
    } catch (error) {
      console.error(`API request failed: ${endpoint}`, error);
      throw error;
    }
  }

  // GET request (authenticated)
  async get(endpoint, params = {}) {
    const queryString = new URLSearchParams(params).toString();
    const url = queryString ? `${endpoint}?${queryString}` : endpoint;
    return this.request(url, { method: 'GET' });
  }

  // GET request (public)
  async publicGet(endpoint, params = {}) {
    const queryString = new URLSearchParams(params).toString();
    const url = queryString ? `${endpoint}?${queryString}` : endpoint;
    return this.publicRequest(url, { method: 'GET' });
  }

  // POST request
  async post(endpoint, data = {}) {
    return this.request(endpoint, {
      method: 'POST',
      body: JSON.stringify(data)
    });
  }

  // PUT request
  async put(endpoint, data = {}) {
    return this.request(endpoint, {
      method: 'PUT',
      body: JSON.stringify(data)
    });
  }

  // DELETE request
  async delete(endpoint) {
    return this.request(endpoint, { method: 'DELETE' });
  }

  // =============================================================================
  // PUBLIC ENDPOINTS
  // =============================================================================

  // Get public statistics
  async getPublicStats() {
    return this.publicGet('/public/stats');
  }

  // Get public transactions
  async getPublicTransactions(params = {}) {
    return this.publicGet('/public/transactions', params);
  }

  // Get fund flow data
  async getFundFlow() {
    return this.publicGet('/public/fund-flow');
  }

  // Search transactions
  async searchTransactions(params = {}) {
    return this.publicGet('/public/search', params);
  }

  // Get public campaigns/relief applications
  async getCampaigns(params = {}) {
    return this.publicGet('/public/campaigns', params);
  }

  // Get specific campaign details
  async getCampaign(campaignId) {
    return this.publicGet(`/public/campaigns/${campaignId}`);
  }

  // =============================================================================
  // AUTH ENDPOINTS
  // =============================================================================

  // Get nonce for wallet signature
  async getNonce(address) {
    return this.get(`/auth/nonce/${address}`);
  }

  // Connect wallet and authenticate
  async connectWallet(address, signature, message) {
    return this.post('/auth/connect', { address, signature, message });
  }

  // Get user profile
  async getProfile() {
    return this.get('/auth/profile');
  }

  // Logout
  async logout() {
    return this.post('/auth/logout');
  }

  // =============================================================================
  // DONOR ENDPOINTS
  // =============================================================================

  // Process donation
  async processDonation(donationData) {
    return this.post('/donors/donate', donationData);
  }

  // Get donation history
  async getDonationHistory(params = {}) {
    return this.get('/donors/history', params);
  }

  // Get donor impact data
  async getDonorImpact() {
    return this.get('/donors/impact');
  }

  // Get donor transactions (alias for getDonationHistory)
  async getDonorTransactions(params = {}) {
    return this.getDonationHistory(params);
  }

  // =============================================================================
  // BENEFICIARY ENDPOINTS
  // =============================================================================

  // Submit relief application
  async submitApplication(applicationData) {
    const formData = new FormData();
    
    // Add text fields
    Object.keys(applicationData).forEach(key => {
      if (key !== 'documents') {
        if (typeof applicationData[key] === 'object') {
          formData.append(key, JSON.stringify(applicationData[key]));
        } else {
          formData.append(key, applicationData[key]);
        }
      }
    });

    // Add documents
    if (applicationData.documents) {
      applicationData.documents.forEach((file, index) => {
        formData.append('documents', file);
      });
    }

    return this.request('/beneficiaries/apply', {
      method: 'POST',
      headers: { Authorization: `Bearer ${localStorage.getItem('authToken')}` },
      body: formData
    });
  }

  // Get application status
  async getApplicationStatus() {
    return this.get('/beneficiaries/status');
  }

  // Get beneficiary balance
  async getBeneficiaryBalance() {
    return this.get('/beneficiaries/balance');
  }

  // Process spending transaction
  async processSpending(spendingData) {
    return this.post('/beneficiaries/spend', spendingData);
  }

  // Get beneficiary transactions
  async getBeneficiaryTransactions(params = {}) {
    return this.get('/beneficiaries/transactions', params);
  }

  // Get approved vendors
  async getApprovedVendors(params = {}) {
    return this.get('/beneficiaries/vendors', params);
  }

  // Update beneficiary profile
  async updateBeneficiaryProfile(profileData) {
    return this.put('/beneficiaries/profile', profileData);
  }

  // =============================================================================
  // VENDOR ENDPOINTS
  // =============================================================================

  // Register as vendor
  async registerVendor(vendorData) {
    const formData = new FormData();
    
    // Add text fields
    Object.keys(vendorData).forEach(key => {
      if (key !== 'documents') {
        if (Array.isArray(vendorData[key])) {
          formData.append(key, JSON.stringify(vendorData[key]));
        } else {
          formData.append(key, vendorData[key]);
        }
      }
    });

    // Add documents
    if (vendorData.documents) {
      vendorData.documents.forEach((file, index) => {
        formData.append('documents', file);
      });
    }

    return this.request('/vendors/register', {
      method: 'POST',
      headers: { Authorization: `Bearer ${localStorage.getItem('authToken')}` },
      body: formData
    });
  }

  // Get vendor profile
  async getVendorProfile() {
    return this.get('/vendors/profile');
  }

  // Update vendor profile
  async updateVendorProfile(profileData) {
    return this.put('/vendors/profile', profileData);
  }

  // Get vendor transactions
  async getVendorTransactions(params = {}) {
    return this.get('/vendors/transactions', params);
  }

  // Validate purchase
  async validatePurchase(purchaseData) {
    return this.post('/vendors/validate-purchase', purchaseData);
  }

  // Get vendor categories
  async getVendorCategories() {
    return this.get('/vendors/categories');
  }

  // Get vendor dashboard stats
  async getVendorDashboardStats() {
    return this.get('/vendors/dashboard-stats');
  }

  // Get receipt
  async getReceipt(transactionId) {
    return this.get(`/vendors/receipt/${transactionId}`);
  }

  // Get fraud status
  async getVendorFraudStatus() {
    return this.get('/vendors/fraud-status');
  }

  // =============================================================================
  // ADMIN ENDPOINTS
  // =============================================================================

  // Get system statistics
  async getAdminStats() {
    return this.get('/admin/stats');
  }

  // Get users for management
  async getUsers(params = {}) {
    return this.get('/admin/users', params);
  }

  // Assign user role
  async assignUserRole(userId, roleData) {
    return this.post(`/admin/users/${userId}/role`, roleData);
  }

  // Emergency pause/resume
  async emergencyControl(controlData) {
    return this.post('/admin/emergency/pause', controlData);
  }

  // Get audit logs
  async getAuditLogs(params = {}) {
    return this.get('/admin/audit/logs', params);
  }

  // =============================================================================
  // VERIFIER ENDPOINTS
  // =============================================================================

  // Get pending applications
  async getPendingApplications(params = {}) {
    return this.get('/admin/verifier/applications', params);
  }

  // Review application
  async reviewApplication(applicationId, reviewData) {
    return this.post(`/admin/verifier/applications/${applicationId}/review`, reviewData);
  }

  // Get pending vendors
  async getPendingVendors(params = {}) {
    return this.get('/admin/verifier/vendors/pending', params);
  }

  // Approve/reject vendor
  async reviewVendor(vendorId, reviewData) {
    return this.post(`/admin/verifier/vendors/${vendorId}/approve`, reviewData);
  }

  // Monitor transactions
  async monitorTransactions(params = {}) {
    return this.get('/admin/verifier/transactions/monitor', params);
  }
}

// Create and export singleton instance
const apiService = new ApiService();
export default apiService;