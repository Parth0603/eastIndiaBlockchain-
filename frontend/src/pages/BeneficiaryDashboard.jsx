import { useState, useEffect } from 'react';
import { useAuth } from '../hooks/useAuth';
import { useWallet } from '../hooks/useWallet';
import { usePageTitle } from '../hooks/usePageTitle';
import apiService from '../services/api';

const BeneficiaryDashboard = () => {
  const { isAuthenticated, user } = useAuth();
  const { isConnected, account } = useWallet();
  
  // Set page title
  usePageTitle('Dashboard');
  const [aidBalance, setAidBalance] = useState(0);
  const [selectedCategory, setSelectedCategory] = useState(null);
  const [selectedVendor, setSelectedVendor] = useState(null);
  const [showSpendingModal, setShowSpendingModal] = useState(false);
  const [aidCategories, setAidCategories] = useState([]);
  const [nearbyVendors, setNearbyVendors] = useState([]);
  const [recentTransactions, setRecentTransactions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Fetch beneficiary data from backend
  useEffect(() => {
    const fetchBeneficiaryData = async () => {
      if (!isConnected || !account) {
        setLoading(false);
        return;
      }

      // If connected but not authenticated, don't try to fetch data
      if (!isAuthenticated) {
        setLoading(false);
        setAidBalance(0);
        setAidCategories([]);
        setNearbyVendors([]);
        setRecentTransactions([]);
        return;
      }

      try {
        setLoading(true);
        setError(null);

        // Get beneficiary balance and data
        const [balanceResponse, vendorsResponse, transactionsResponse] = await Promise.all([
          apiService.getBeneficiaryBalance().catch(err => ({ success: false, error: err.message })),
          apiService.getApprovedVendors().catch(err => ({ success: false, error: err.message })),
          apiService.getBeneficiaryTransactions({ limit: 10 }).catch(err => ({ success: false, error: err.message }))
        ]);

        if (balanceResponse.success) {
          const balance = parseFloat(balanceResponse.data.tokenBalance) / Math.pow(10, 18);
          setAidBalance(balance);

          // Transform spending by category into aid categories
          const categories = balanceResponse.data.spendingByCategory.map(cat => ({
            id: cat.category.toLowerCase(),
            name: cat.category.charAt(0).toUpperCase() + cat.category.slice(1),
            icon: cat.category === 'food' ? '🍽️' : 
                  cat.category === 'medical' ? '💊' : 
                  cat.category === 'shelter' ? '🏠' : '📦',
            units: Math.floor(parseFloat(cat.totalSpent) / 10), // Convert to units
            color: cat.category === 'food' ? 'bg-blue-100 text-blue-800' :
                   cat.category === 'medical' ? 'bg-purple-100 text-purple-800' :
                   'bg-green-100 text-green-800',
            iconBg: cat.category === 'food' ? 'bg-blue-500' :
                    cat.category === 'medical' ? 'bg-purple-500' :
                    'bg-green-500'
          }));

          // Add default categories if none exist
          if (categories.length === 0) {
            setAidCategories([
              {
                id: 'food',
                name: 'Food',
                icon: '🍽️',
                units: Math.floor(balance * 0.5),
                color: 'bg-blue-100 text-blue-800',
                iconBg: 'bg-blue-500'
              },
              {
                id: 'medical',
                name: 'Medical',
                icon: '💊',
                units: Math.floor(balance * 0.3),
                color: 'bg-purple-100 text-purple-800',
                iconBg: 'bg-purple-500'
              },
              {
                id: 'shelter',
                name: 'Shelter',
                icon: '🏠',
                units: Math.floor(balance * 0.2),
                color: 'bg-green-100 text-green-800',
                iconBg: 'bg-green-500'
              }
            ]);
          } else {
            setAidCategories(categories);
          }
        } else {
          // No balance data available
          setAidBalance(0);
          setAidCategories([]);
        }

        // Handle vendors response
        if (vendorsResponse.success) {
          setNearbyVendors(vendorsResponse.data.vendors || []);
        } else {
          setNearbyVendors([]);
        }

        // Handle transactions response
        if (transactionsResponse.success) {
          setRecentTransactions(transactionsResponse.data.transactions || []);
        } else {
          setRecentTransactions([]);
        }

      } catch (error) {
        console.error('Error fetching beneficiary data:', error);
        setError('Failed to load beneficiary data');
      } finally {
        setLoading(false);
      }
    };

    fetchBeneficiaryData();
  }, [isConnected, account, isAuthenticated]);

  const getTimeAgo = (date) => {
    const now = new Date();
    const diffInHours = Math.floor((now - date) / (1000 * 60 * 60));
    
    if (diffInHours < 1) return 'Just now';
    if (diffInHours < 24) return `${diffInHours} hours ago`;
    const diffInDays = Math.floor(diffInHours / 24);
    if (diffInDays < 7) return `${diffInDays} days ago`;
    const diffInWeeks = Math.floor(diffInDays / 7);
    return `${diffInWeeks} weeks ago`;
  };

  const handleSpendAid = () => {
    setShowSpendingModal(true);
  };

  const handleCategorySelect = (category) => {
    setSelectedCategory(category);
    setSelectedVendor(null);
  };

  const handleVendorSelect = (vendor) => {
    setSelectedVendor(vendor);
  };

  if (!isConnected || !isAuthenticated) {
    return (
      <div className="min-h-screen bg-blue-50 flex items-center justify-center">
        <div className="max-w-md w-full bg-white rounded-3xl shadow-2xl p-8 text-center">
          <div className="w-20 h-20 bg-blue-500 rounded-2xl flex items-center justify-center mx-auto mb-6">
            <span className="text-3xl">👤</span>
          </div>
          <h2 className="text-2xl font-bold text-gray-900 mb-4">Access Beneficiary Portal</h2>
          <p className="text-gray-600 mb-6">
            {!isConnected 
              ? "Connect your wallet to access your beneficiary dashboard and manage your aid funds."
              : "Please complete authentication to access your beneficiary dashboard."
            }
          </p>
          <div className="text-sm text-gray-500">
            {!isConnected 
              ? 'Use the "Connect Wallet" button in the header to get started.'
              : 'You need to sign up or authenticate as a beneficiary to access this dashboard.'
            }
          </div>
          {isConnected && !isAuthenticated && (
            <div className="mt-4">
              <button
                onClick={() => window.location.href = '/signup/beneficiary'}
                className="bg-green-600 text-white px-6 py-3 rounded-xl hover:bg-green-700 transition-colors"
              >
                Register as Beneficiary
              </button>
            </div>
          )}
        </div>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-blue-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading your beneficiary dashboard...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-blue-50 flex items-center justify-center">
        <div className="max-w-md w-full bg-white rounded-3xl shadow-2xl p-8 text-center">
          <div className="w-20 h-20 bg-red-100 rounded-2xl flex items-center justify-center mx-auto mb-6">
            <span className="text-3xl text-red-500">⚠️</span>
          </div>
          <h2 className="text-2xl font-bold text-gray-900 mb-4">Error Loading Data</h2>
          <p className="text-gray-600 mb-6">{error}</p>
          <button 
            onClick={() => window.location.reload()}
            className="bg-blue-600 text-white px-6 py-3 rounded-xl hover:bg-blue-700 transition-colors"
          >
            Try Again
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-blue-50">
      {/* Header */}
      <div className="bg-white shadow-sm border-b">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <div className="flex items-center justify-between">
            <h1 className="text-3xl font-bold text-gray-900">Beneficiary Dashboard</h1>
            <div className="flex items-center space-x-3">
              <div className="text-sm text-gray-600">Welcome back!</div>
              <div className="w-10 h-10 bg-blue-500 rounded-full flex items-center justify-center">
                <span className="text-white font-semibold">👤</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        {/* Aid Balance Card */}
        <div className="bg-blue-500 rounded-3xl shadow-lg p-8 mb-8 text-white text-center">
          <h2 className="text-xl font-semibold mb-4">My Aid Balance</h2>
          <div className="text-5xl font-bold mb-2">
            {aidBalance.toFixed(0)} Aid Units
          </div>
          <div className="text-blue-100 text-lg">
            (≈ ${aidBalance.toFixed(0)})
          </div>
        </div>

        {/* Spend Aid Button */}
        <div className="mb-8">
          <button
            onClick={handleSpendAid}
            className="w-full bg-green-500 hover:bg-green-600 text-white font-semibold py-4 px-6 rounded-3xl shadow-lg hover:shadow-xl transition-all duration-200 transform hover:-translate-y-1 flex items-center justify-center text-lg"
          >
            🛒 Spend Aid Now
          </button>
        </div>
        
        {/* Allowed Spending Categories */}
        <div className="mb-8">
          <h3 className="text-xl font-semibold text-gray-900 mb-6">Allowed Spending Categories</h3>
          <div className="grid md:grid-cols-3 gap-6">
            {aidCategories.map((category) => (
              <div
                key={category.id}
                onClick={() => handleCategorySelect(category)}
                className={`bg-white rounded-3xl shadow-lg p-6 cursor-pointer transition-all duration-200 hover:shadow-xl hover:-translate-y-1 ${
                  selectedCategory?.id === category.id ? 'ring-2 ring-blue-500' : ''
                }`}
              >
                <div className="flex items-center mb-4">
                  <div className={`w-12 h-12 ${category.iconBg} rounded-2xl flex items-center justify-center mr-4`}>
                    <span className="text-2xl">{category.icon}</span>
                  </div>
                  <div>
                    <h4 className="text-lg font-semibold text-gray-900">{category.name}</h4>
                    <div className="text-sm text-gray-600">({category.units} Units)</div>
                  </div>
                </div>
                <div className="w-full bg-gray-200 rounded-full h-3">
                  <div 
                    className={`h-3 rounded-full ${category.iconBg}`}
                    style={{ width: `${Math.min((category.units / Math.max(...aidCategories.map(c => c.units))) * 100, 100)}%` }}
                  ></div>
                </div>
                <div className="text-xs text-gray-500 mt-2">
                  Available: {category.units} units
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Nearby Verified Vendors */}
        <div className="mb-8">
          <h3 className="text-xl font-semibold text-gray-900 mb-6">Nearby Verified Vendors</h3>
          {nearbyVendors.length > 0 ? (
            <div className="grid md:grid-cols-3 gap-6">
              {nearbyVendors.map((vendor) => (
                <div
                  key={vendor.id}
                  onClick={() => handleVendorSelect(vendor)}
                  className={`bg-white rounded-3xl shadow-lg overflow-hidden cursor-pointer transition-all duration-200 hover:shadow-xl hover:-translate-y-1 ${
                    selectedVendor?.id === vendor.id ? 'ring-2 ring-green-500' : ''
                  }`}
                >
                  <div className="p-6">
                    <div className="flex items-start mb-4">
                      <div className="w-16 h-16 bg-gray-100 rounded-2xl flex items-center justify-center mr-4 flex-shrink-0">
                        <span className="text-2xl">
                          {vendor.category === 'food' && '🏪'}
                          {vendor.category === 'medical' && '🏥'}
                          {vendor.category === 'shelter' && '🏗️'}
                          {!['food', 'medical', 'shelter'].includes(vendor.category) && '🏢'}
                        </span>
                      </div>
                      <div className="flex-1">
                        <div className="flex items-center mb-1">
                          <h4 className="text-lg font-semibold text-gray-900 mr-2">{vendor.name}</h4>
                          {vendor.verified && (
                            <div className="w-5 h-5 bg-green-500 rounded-full flex items-center justify-center">
                              <svg className="w-3 h-3 text-white" fill="currentColor" viewBox="0 0 20 20">
                                <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                              </svg>
                            </div>
                          )}
                        </div>
                        <div className="text-sm text-gray-600 mb-2">
                          ({vendor.distance}, {vendor.type})
                        </div>
                        <div className="flex items-center">
                          <div className="flex items-center text-yellow-500 mr-2">
                            <svg className="w-4 h-4 fill-current" viewBox="0 0 20 20">
                              <path d="M10 15l-5.878 3.09 1.123-6.545L.489 6.91l6.572-.955L10 0l2.939 5.955 6.572.955-4.756 4.635 1.123 6.545z"/>
                            </svg>
                            <span className="text-sm text-gray-700 ml-1">{vendor.rating.toFixed(1)}</span>
                          </div>
                          <span className="text-xs bg-green-100 text-green-800 px-2 py-1 rounded-full">
                            Verified
                          </span>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="bg-white rounded-3xl shadow-lg p-8 text-center">
              <div className="text-4xl mb-4">🏪</div>
              <h4 className="text-lg font-semibold text-gray-900 mb-2">No Vendors Available</h4>
              <p className="text-gray-600">No verified vendors found in your area at the moment.</p>
            </div>
          )}
        </div>

        {/* Recent Transactions */}
        <div className="bg-white rounded-3xl shadow-lg p-6">
          <h3 className="text-xl font-semibold text-gray-900 mb-6">Recent Transactions</h3>
          {recentTransactions.length > 0 ? (
            <div className="space-y-4">
              {recentTransactions.map((transaction) => (
                <div key={transaction.id} className="flex items-center justify-between p-4 bg-gray-50 rounded-2xl">
                  <div className="flex items-center">
                    <div className="w-12 h-12 bg-blue-100 rounded-xl flex items-center justify-center mr-4">
                      <span className="text-xl">
                        {transaction.category === 'Food' && '🍽️'}
                        {transaction.category === 'Medicine' && '💊'}
                        {transaction.category === 'Medical' && '💊'}
                        {transaction.category === 'Shelter' && '🏠'}
                        {!['Food', 'Medicine', 'Medical', 'Shelter'].includes(transaction.category) && '📦'}
                      </span>
                    </div>
                    <div>
                      <div className="font-semibold text-gray-900">{transaction.vendor}</div>
                      <div className="text-sm text-gray-600">{transaction.items}</div>
                      <div className="text-xs text-gray-500">{transaction.date}</div>
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="font-semibold text-gray-900">-{transaction.amount.toFixed(0)} units</div>
                    <div className={`text-xs px-2 py-1 rounded-full ${
                      transaction.status === 'confirmed' ? 'bg-green-100 text-green-800' :
                      transaction.status === 'pending' ? 'bg-yellow-100 text-yellow-800' :
                      'bg-gray-100 text-gray-800'
                    }`}>
                      {transaction.status}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-8">
              <div className="text-4xl mb-4">📋</div>
              <h4 className="text-lg font-semibold text-gray-900 mb-2">No Transactions Yet</h4>
              <p className="text-gray-600">Your transaction history will appear here once you start spending your aid units.</p>
            </div>
          )}
        </div>

        {/* Help Section */}
        <div className="mt-8 bg-blue-50 border border-blue-200 rounded-3xl p-6">
          <div className="text-center">
            <div className="w-16 h-16 bg-blue-500 rounded-full flex items-center justify-center mx-auto mb-4">
              <span className="text-2xl">💡</span>
            </div>
            <h3 className="text-lg font-semibold text-gray-900 mb-2">Need Help?</h3>
            <p className="text-gray-600 mb-4">
              Contact our support team if you need assistance with spending your aid units or finding verified vendors.
            </p>
            <div className="flex flex-col sm:flex-row gap-3 justify-center">
              <button className="bg-blue-600 text-white px-6 py-2 rounded-xl hover:bg-blue-700 transition-colors">
                📞 Contact Support
              </button>
              <button className="bg-white text-blue-600 border border-blue-600 px-6 py-2 rounded-xl hover:bg-blue-50 transition-colors">
                📖 View Guide
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default BeneficiaryDashboard;