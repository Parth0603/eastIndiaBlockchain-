import axios from 'axios';

// API configuration
const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:3001/api';

// Create axios instance with default config
const api = axios.create({
  baseURL: API_BASE_URL,
  timeout: 10000,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Request interceptor to add auth token
api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('authToken');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// Response interceptor for error handling
api.interceptors.response.use(
  (response) => {
    return response.data;
  },
  (error) => {
    if (error.response?.status === 401) {
      // Token expired or invalid
      localStorage.removeItem('authToken');
      window.location.href = '/';
    }
    
    const errorMessage = error.response?.data?.message || error.message || 'An error occurred';
    return Promise.reject(new Error(errorMessage));
  }
);

// API methods
export const apiClient = {
  // Authentication
  auth: {
    connect: (data) => api.post('/auth/connect', data),
    getProfile: () => api.get('/auth/profile'),
    logout: () => api.post('/auth/logout'),
  },

  // Donor endpoints
  donors: {
    donate: (data) => api.post('/donors/donate', data),
    getHistory: (params) => api.get('/donors/history', { params }),
    getImpact: () => api.get('/donors/impact'),
  },

  // Beneficiary endpoints
  beneficiaries: {
    apply: (data) => api.post('/beneficiaries/apply', data),
    getStatus: () => api.get('/beneficiaries/status'),
    getBalance: () => api.get('/beneficiaries/balance'),
    spend: (data) => api.post('/beneficiaries/spend', data),
    getSpendingHistory: (params) => api.get('/beneficiaries/spending', { params }),
  },

  // Verifier endpoints
  verifiers: {
    getApplications: (params) => api.get('/verifiers/applications', { params }),
    reviewApplication: (id, data) => api.post(`/verifiers/applications/${id}/review`, data),
    getVendors: (params) => api.get('/verifiers/vendors', { params }),
    approveVendor: (id, data) => api.post(`/verifiers/vendors/${id}/approve`, data),
    getTransactions: (params) => api.get('/verifiers/transactions', { params }),
  },

  // Admin endpoints
  admin: {
    getStats: () => api.get('/admin/stats'),
    getUsers: (params) => api.get('/admin/users', { params }),
    addVerifier: (data) => api.post('/admin/verifiers', data),
    removeVerifier: (id) => api.delete(`/admin/verifiers/${id}`),
    updateCategories: (data) => api.put('/admin/categories', data),
    getSystemHealth: () => api.get('/admin/health'),
    pauseSystem: () => api.post('/admin/pause'),
    resumeSystem: () => api.post('/admin/resume'),
  },

  // Vendor endpoints
  vendors: {
    register: (data) => api.post('/vendors/register', data),
    getProfile: () => api.get('/vendors/profile'),
    updateProfile: (data) => api.put('/vendors/profile', data),
    getTransactions: (params) => api.get('/vendors/transactions', { params }),
    getDashboardStats: () => api.get('/vendors/dashboard-stats'),
    getCategories: () => api.get('/vendors/categories'),
    validatePurchase: (data) => api.post('/vendors/validate-purchase', data),
    generateReceipt: (transactionId) => api.get(`/vendors/receipt/${transactionId}`),
  },

  // Public endpoints
  public: {
    getStats: () => api.get('/public/stats'),
    getTransactions: (params) => api.get('/public/transactions', { params }),
    searchTransactions: (params) => api.get('/public/search', { params }),
    getFundFlow: () => api.get('/public/fund-flow'),
  },

  // Fraud prevention endpoints
  fraud: {
    submitReport: (data) => api.post('/fraud/report', data),
    getReports: (params) => api.get('/fraud/reports', { params }),
    getReportDetails: (reportId) => api.get(`/fraud/reports/${reportId}`),
    assignReport: (reportId, investigatorAddress) => 
      api.put(`/fraud/reports/${reportId}/assign`, { investigatorAddress }),
    updateInvestigation: (reportId, data) => 
      api.put(`/fraud/reports/${reportId}/investigate`, data),
    resolveReport: (reportId, data) => 
      api.put(`/fraud/reports/${reportId}/resolve`, data),
    getStatistics: (timeframe) => 
      api.get('/fraud/statistics', { params: { timeframe } }),
    getFlaggedTransactions: (params) => 
      api.get('/fraud/flagged-transactions', { params }),
    reviewTransaction: (transactionId, data) => 
      api.put(`/fraud/transactions/${transactionId}/review`, data),
  },

  // Vendor fraud-related endpoints
  vendorFraud: {
    getFraudStatus: () => api.get('/vendors/fraud-status'),
    disputeFlag: (data) => api.post('/vendors/dispute-flag', data),
  },
};

export default api;