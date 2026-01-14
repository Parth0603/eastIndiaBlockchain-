import { useState, useEffect } from 'react';
import { useAuth } from '../hooks/useAuth';
import { useWallet } from '../hooks/useWallet';
import { usePageTitle } from '../hooks/usePageTitle';
import apiService from '../services/api';

const AdminPanel = () => {
  const { isAuthenticated, user } = useAuth();
  const { isConnected, account } = useWallet();
  
  // Set page title
  usePageTitle('Admin Panel');
  
  const [activeTab, setActiveTab] = useState('overview');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  
  // Overview data
  const [systemStats, setSystemStats] = useState(null);
  
  // Category management data
  const [categoryLimits, setCategoryLimits] = useState([]);
  const [categoryUsage, setCategoryUsage] = useState(null);
  const [editingCategory, setEditingCategory] = useState(null);
  const [limitForm, setLimitForm] = useState({
    dailyLimit: '',
    weeklyLimit: '',
    monthlyLimit: '',
    perTransactionLimit: '',
    reason: ''
  });
  
  // Users management data
  const [users, setUsers] = useState([]);
  const [userFilters, setUserFilters] = useState({
    role: '',
    status: '',
    page: 1
  });

  useEffect(() => {
    if (isConnected && isAuthenticated && user?.role === 'admin') {
      fetchAdminData();
    }
  }, [isConnected, isAuthenticated, user, activeTab]);

  const fetchAdminData = async () => {
    try {
      setLoading(true);
      setError(null);

      if (activeTab === 'overview') {
        const statsResponse = await apiService.getAdminStats();
        if (statsResponse.success) {
          setSystemStats(statsResponse.data);
        }
      } else if (activeTab === 'categories') {
        const [limitsResponse, usageResponse] = await Promise.all([
          apiService.getAdminCategoryLimits(),
          apiService.getCategoryUsage('daily')
        ]);
        
        if (limitsResponse.success) {
          setCategoryLimits(limitsResponse.data.limits);
        }
        
        if (usageResponse.success) {
          setCategoryUsage(usageResponse.data);
        }
      } else if (activeTab === 'users') {
        const usersResponse = await apiService.getUsers(userFilters);
        if (usersResponse.success) {
          setUsers(usersResponse.data.users);
        }
      }
    } catch (error) {
      console.error('Error fetching admin data:', error);
      setError('Failed to load admin data');
    } finally {
      setLoading(false);
    }
  };

  const handleUpdateCategoryLimits = async (category) => {
    try {
      const response = await apiService.updateCategoryLimits(category, {
        ...limitForm,
        isActive: true
      });
      
      if (response.success) {
        alert('Category limits updated successfully!');
        setEditingCategory(null);
        setLimitForm({
          dailyLimit: '',
          weeklyLimit: '',
          monthlyLimit: '',
          perTransactionLimit: '',
          reason: ''
        });
        fetchAdminData(); // Refresh data
      }
    } catch (error) {
      console.error('Error updating category limits:', error);
      alert(`Failed to update category limits: ${error.message}`);
    }
  };

  const handleEmergencyOverride = async (category, enable) => {
    try {
      const reason = enable ? 
        prompt('Enter reason for emergency override:') : 
        'Emergency override deactivated';
      
      if (enable && !reason) return;
      
      const response = await apiService.setCategoryEmergencyOverride(category, {
        enable,
        reason,
        expiryHours: 24
      });
      
      if (response.success) {
        alert(response.data.message);
        fetchAdminData(); // Refresh data
      }
    } catch (error) {
      console.error('Error setting emergency override:', error);
      alert(`Failed to set emergency override: ${error.message}`);
    }
  };

  const startEditingCategory = (category) => {
    const limit = categoryLimits.find(l => l.category === category);
    if (limit) {
      setLimitForm({
        dailyLimit: limit.dailyLimit.toString(),
        weeklyLimit: limit.weeklyLimit.toString(),
        monthlyLimit: limit.monthlyLimit.toString(),
        perTransactionLimit: limit.perTransactionLimit.toString(),
        reason: 'Admin update'
      });
    }
    setEditingCategory(category);
  };

  if (!isConnected || !isAuthenticated) {
    return (
      <div className="min-h-screen bg-red-50 flex items-center justify-center">
        <div className="max-w-md w-full bg-white rounded-3xl shadow-2xl p-8 text-center">
          <div className="w-20 h-20 bg-red-500 rounded-2xl flex items-center justify-center mx-auto mb-6">
            <span className="text-3xl">🔒</span>
          </div>
          <h2 className="text-2xl font-bold text-gray-900 mb-4">Access Restricted</h2>
          <p className="text-gray-600 mb-6">
            Connect your wallet and authenticate as an admin to access the admin panel.
          </p>
        </div>
      </div>
    );
  }

  if (user?.role !== 'admin') {
    return (
      <div className="min-h-screen bg-red-50 flex items-center justify-center">
        <div className="max-w-md w-full bg-white rounded-3xl shadow-2xl p-8 text-center">
          <div className="w-20 h-20 bg-red-500 rounded-2xl flex items-center justify-center mx-auto mb-6">
            <span className="text-3xl">⚠️</span>
          </div>
          <h2 className="text-2xl font-bold text-gray-900 mb-4">Insufficient Permissions</h2>
          <p className="text-gray-600 mb-6">
            You need admin privileges to access this panel.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white shadow-sm border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <div className="flex items-center justify-between">
            <h1 className="text-3xl font-bold text-gray-900">Admin Panel</h1>
            <div className="flex items-center space-x-3">
              <div className="text-sm text-gray-600">Welcome, Admin</div>
              <div className="w-10 h-10 bg-red-500 rounded-full flex items-center justify-center">
                <span className="text-white font-semibold">👑</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Navigation Tabs */}
        <div className="mb-8">
          <nav className="flex space-x-8">
            {[
              { id: 'overview', name: 'System Overview', icon: '📊' },
              { id: 'categories', name: 'Category Management', icon: '🏷️' },
              { id: 'users', name: 'User Management', icon: '👥' },
              { id: 'transactions', name: 'Transaction Monitor', icon: '💳' }
            ].map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`flex items-center px-4 py-2 rounded-xl font-medium transition-colors ${
                  activeTab === tab.id
                    ? 'bg-blue-500 text-white'
                    : 'text-gray-600 hover:text-gray-900 hover:bg-gray-100'
                }`}
              >
                <span className="mr-2">{tab.icon}</span>
                {tab.name}
              </button>
            ))}
          </nav>
        </div>

        {loading && (
          <div className="text-center py-12">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
            <p className="text-gray-600">Loading admin data...</p>
          </div>
        )}

        {error && (
          <div className="bg-red-50 border border-red-200 rounded-xl p-6 mb-6">
            <div className="flex items-center">
              <span className="text-red-500 text-xl mr-3">⚠️</span>
              <div>
                <h3 className="text-red-800 font-semibold">Error</h3>
                <p className="text-red-600">{error}</p>
              </div>
            </div>
          </div>
        )}

        {/* System Overview Tab */}
        {activeTab === 'overview' && systemStats && (
          <div className="space-y-6">
            {/* Key Metrics */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
              <div className="bg-white rounded-2xl shadow-lg p-6">
                <div className="flex items-center">
                  <div className="w-12 h-12 bg-blue-100 rounded-xl flex items-center justify-center mr-4">
                    <span className="text-2xl">👥</span>
                  </div>
                  <div>
                    <p className="text-sm text-gray-600">Total Users</p>
                    <p className="text-2xl font-bold text-gray-900">{systemStats.overview.totalUsers}</p>
                  </div>
                </div>
              </div>

              <div className="bg-white rounded-2xl shadow-lg p-6">
                <div className="flex items-center">
                  <div className="w-12 h-12 bg-green-100 rounded-xl flex items-center justify-center mr-4">
                    <span className="text-2xl">💰</span>
                  </div>
                  <div>
                    <p className="text-sm text-gray-600">Total Donations</p>
                    <p className="text-2xl font-bold text-gray-900">{systemStats.overview.totalDonations}</p>
                  </div>
                </div>
              </div>

              <div className="bg-white rounded-2xl shadow-lg p-6">
                <div className="flex items-center">
                  <div className="w-12 h-12 bg-purple-100 rounded-xl flex items-center justify-center mr-4">
                    <span className="text-2xl">🛒</span>
                  </div>
                  <div>
                    <p className="text-sm text-gray-600">Total Spending</p>
                    <p className="text-2xl font-bold text-gray-900">{systemStats.overview.totalSpending}</p>
                  </div>
                </div>
              </div>

              <div className="bg-white rounded-2xl shadow-lg p-6">
                <div className="flex items-center">
                  <div className="w-12 h-12 bg-orange-100 rounded-xl flex items-center justify-center mr-4">
                    <span className="text-2xl">⏳</span>
                  </div>
                  <div>
                    <p className="text-sm text-gray-600">Pending Applications</p>
                    <p className="text-2xl font-bold text-gray-900">{systemStats.overview.pendingApplications}</p>
                  </div>
                </div>
              </div>
            </div>

            {/* Financial Overview */}
            <div className="bg-white rounded-2xl shadow-lg p-6">
              <h3 className="text-xl font-semibold text-gray-900 mb-4">Financial Overview</h3>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div>
                  <p className="text-sm text-gray-600">Total Donated</p>
                  <p className="text-xl font-bold text-green-600">
                    {(parseFloat(systemStats.financial.totalDonated) / Math.pow(10, 18)).toFixed(2)} Units
                  </p>
                </div>
                <div>
                  <p className="text-sm text-gray-600">Total Spent</p>
                  <p className="text-xl font-bold text-red-600">
                    {(parseFloat(systemStats.financial.totalSpent) / Math.pow(10, 18)).toFixed(2)} Units
                  </p>
                </div>
                <div>
                  <p className="text-sm text-gray-600">Available Funds</p>
                  <p className="text-xl font-bold text-blue-600">
                    {(parseFloat(systemStats.financial.availableFunds) / Math.pow(10, 18)).toFixed(2)} Units
                  </p>
                </div>
              </div>
            </div>

            {/* Category Breakdown */}
            <div className="bg-white rounded-2xl shadow-lg p-6">
              <h3 className="text-xl font-semibold text-gray-900 mb-4">Category Spending Breakdown</h3>
              <div className="space-y-4">
                {systemStats.categories.map((category) => (
                  <div key={category.category} className="flex items-center justify-between">
                    <div className="flex items-center">
                      <div className="w-8 h-8 bg-blue-100 rounded-lg flex items-center justify-center mr-3">
                        <span className="text-sm">
                          {category.category === 'Food' && '🍽️'}
                          {category.category === 'Medical' && '💊'}
                          {category.category === 'Shelter' && '🏠'}
                          {!['Food', 'Medical', 'Shelter'].includes(category.category) && '📦'}
                        </span>
                      </div>
                      <div>
                        <p className="font-medium text-gray-900">{category.category}</p>
                        <p className="text-sm text-gray-600">{category.transactionCount} transactions</p>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="font-semibold text-gray-900">
                        {(parseFloat(category.totalSpent) / Math.pow(10, 18)).toFixed(2)} Units
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* Category Management Tab */}
        {activeTab === 'categories' && (
          <div className="space-y-6">
            {/* Category Limits Management */}
            <div className="bg-white rounded-2xl shadow-lg p-6">
              <div className="flex items-center justify-between mb-6">
                <h3 className="text-xl font-semibold text-gray-900">Category Spending Limits</h3>
                <button
                  onClick={() => fetchAdminData()}
                  className="bg-blue-500 text-white px-4 py-2 rounded-xl hover:bg-blue-600 transition-colors"
                >
                  🔄 Refresh
                </button>
              </div>

              <div className="space-y-4">
                {categoryLimits.map((limit) => (
                  <div key={limit.category} className="border border-gray-200 rounded-xl p-4">
                    <div className="flex items-center justify-between mb-4">
                      <div className="flex items-center">
                        <div className="w-10 h-10 bg-blue-100 rounded-xl flex items-center justify-center mr-3">
                          <span className="text-xl">
                            {limit.category === 'Food' && '🍽️'}
                            {limit.category === 'Medical' && '💊'}
                            {limit.category === 'Shelter' && '🏠'}
                            {limit.category === 'Water' && '💧'}
                            {limit.category === 'Clothing' && '👕'}
                            {limit.category === 'Emergency Supplies' && '📦'}
                          </span>
                        </div>
                        <div>
                          <h4 className="font-semibold text-gray-900">{limit.category}</h4>
                          <div className="flex items-center space-x-4 text-sm text-gray-600">
                            <span>Daily: {limit.dailyLimit} units</span>
                            <span>Weekly: {limit.weeklyLimit} units</span>
                            <span>Monthly: {limit.monthlyLimit} units</span>
                            <span>Per Transaction: {limit.perTransactionLimit} units</span>
                          </div>
                        </div>
                      </div>
                      <div className="flex items-center space-x-2">
                        {limit.emergencyOverride && (
                          <span className="bg-red-100 text-red-800 text-xs px-2 py-1 rounded-full">
                            Emergency Override Active
                          </span>
                        )}
                        <button
                          onClick={() => startEditingCategory(limit.category)}
                          className="bg-blue-500 text-white px-3 py-1 rounded-lg text-sm hover:bg-blue-600 transition-colors"
                        >
                          Edit
                        </button>
                        <button
                          onClick={() => handleEmergencyOverride(limit.category, !limit.emergencyOverride)}
                          className={`px-3 py-1 rounded-lg text-sm transition-colors ${
                            limit.emergencyOverride
                              ? 'bg-red-500 text-white hover:bg-red-600'
                              : 'bg-orange-500 text-white hover:bg-orange-600'
                          }`}
                        >
                          {limit.emergencyOverride ? 'Disable Override' : 'Emergency Override'}
                        </button>
                      </div>
                    </div>

                    {editingCategory === limit.category && (
                      <div className="mt-4 p-4 bg-gray-50 rounded-xl">
                        <h5 className="font-medium text-gray-900 mb-3">Edit {limit.category} Limits</h5>
                        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-4">
                          <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">Daily Limit</label>
                            <input
                              type="number"
                              value={limitForm.dailyLimit}
                              onChange={(e) => setLimitForm({...limitForm, dailyLimit: e.target.value})}
                              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                              placeholder="Daily limit in units"
                            />
                          </div>
                          <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">Weekly Limit</label>
                            <input
                              type="number"
                              value={limitForm.weeklyLimit}
                              onChange={(e) => setLimitForm({...limitForm, weeklyLimit: e.target.value})}
                              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                              placeholder="Weekly limit in units"
                            />
                          </div>
                          <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">Monthly Limit</label>
                            <input
                              type="number"
                              value={limitForm.monthlyLimit}
                              onChange={(e) => setLimitForm({...limitForm, monthlyLimit: e.target.value})}
                              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                              placeholder="Monthly limit in units"
                            />
                          </div>
                          <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">Per Transaction</label>
                            <input
                              type="number"
                              value={limitForm.perTransactionLimit}
                              onChange={(e) => setLimitForm({...limitForm, perTransactionLimit: e.target.value})}
                              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                              placeholder="Per transaction limit"
                            />
                          </div>
                        </div>
                        <div className="mb-4">
                          <label className="block text-sm font-medium text-gray-700 mb-1">Reason for Change</label>
                          <input
                            type="text"
                            value={limitForm.reason}
                            onChange={(e) => setLimitForm({...limitForm, reason: e.target.value})}
                            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                            placeholder="Reason for updating limits"
                          />
                        </div>
                        <div className="flex space-x-3">
                          <button
                            onClick={() => handleUpdateCategoryLimits(limit.category)}
                            className="bg-green-500 text-white px-4 py-2 rounded-lg hover:bg-green-600 transition-colors"
                          >
                            Save Changes
                          </button>
                          <button
                            onClick={() => setEditingCategory(null)}
                            className="bg-gray-500 text-white px-4 py-2 rounded-lg hover:bg-gray-600 transition-colors"
                          >
                            Cancel
                          </button>
                        </div>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>

            {/* Category Usage Statistics */}
            {categoryUsage && (
              <div className="bg-white rounded-2xl shadow-lg p-6">
                <h3 className="text-xl font-semibold text-gray-900 mb-6">Category Usage Statistics (Today)</h3>
                <div className="space-y-4">
                  {categoryUsage.usage.map((usage) => (
                    <div key={usage.category} className="border border-gray-200 rounded-xl p-4">
                      <div className="flex items-center justify-between mb-2">
                        <h4 className="font-medium text-gray-900">{usage.category}</h4>
                        <span className={`text-xs px-2 py-1 rounded-full ${
                          usage.status === 'over_limit' ? 'bg-red-100 text-red-800' :
                          usage.status === 'near_limit' ? 'bg-yellow-100 text-yellow-800' :
                          usage.status === 'normal' ? 'bg-green-100 text-green-800' :
                          'bg-gray-100 text-gray-600'
                        }`}>
                          {usage.status.replace('_', ' ').toUpperCase()}
                        </span>
                      </div>
                      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                        <div>
                          <p className="text-gray-600">Spent Today</p>
                          <p className="font-semibold">{usage.totalSpent} units</p>
                        </div>
                        <div>
                          <p className="text-gray-600">Daily Limit</p>
                          <p className="font-semibold">{usage.limit} units</p>
                        </div>
                        <div>
                          <p className="text-gray-600">Usage %</p>
                          <p className="font-semibold">{usage.usagePercentage}%</p>
                        </div>
                        <div>
                          <p className="text-gray-600">Transactions</p>
                          <p className="font-semibold">{usage.transactionCount}</p>
                        </div>
                      </div>
                      {usage.status !== 'unused' && (
                        <div className="mt-3">
                          <div className="w-full bg-gray-200 rounded-full h-2">
                            <div 
                              className={`h-2 rounded-full ${
                                usage.status === 'over_limit' ? 'bg-red-500' :
                                usage.status === 'near_limit' ? 'bg-yellow-500' :
                                'bg-green-500'
                              }`}
                              style={{ width: `${Math.min(parseFloat(usage.usagePercentage), 100)}%` }}
                            ></div>
                          </div>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        {/* Placeholder for other tabs */}
        {activeTab === 'users' && (
          <div className="bg-white rounded-2xl shadow-lg p-6">
            <h3 className="text-xl font-semibold text-gray-900 mb-4">User Management</h3>
            <p className="text-gray-600">User management interface coming soon...</p>
          </div>
        )}

        {activeTab === 'transactions' && (
          <div className="bg-white rounded-2xl shadow-lg p-6">
            <h3 className="text-xl font-semibold text-gray-900 mb-4">Transaction Monitor</h3>
            <p className="text-gray-600">Transaction monitoring interface coming soon...</p>
          </div>
        )}
      </div>
    </div>
  );
};

export default AdminPanel;