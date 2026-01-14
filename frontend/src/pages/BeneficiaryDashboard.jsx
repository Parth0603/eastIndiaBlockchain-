import { useState, useEffect } from 'react';
import { useAuth } from '../hooks/useAuth';
import { useWallet } from '../hooks/useWallet';
import { usePageTitle } from '../hooks/usePageTitle';
import apiService from '../services/api';
import QRCodeScanner from '../components/beneficiary/QRCodeScanner';

const BeneficiaryDashboard = () => {
  const { isAuthenticated, user } = useAuth();
  const { isConnected, account } = useWallet();
  
  // Set page title
  usePageTitle('Dashboard');
  const [aidBalance, setAidBalance] = useState(0);
  const [selectedCategory, setSelectedCategory] = useState(null);
  const [selectedVendor, setSelectedVendor] = useState(null);
  const [showSpendingModal, setShowSpendingModal] = useState(false);
  const [showQRScanner, setShowQRScanner] = useState(false);
  const [scannedPaymentData, setScannedPaymentData] = useState(null);
  const [paymentAmount, setPaymentAmount] = useState('');
  const [paymentDescription, setPaymentDescription] = useState('');
  const [processingPayment, setProcessingPayment] = useState(false);
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

          // Use category-specific balances if available
          if (balanceResponse.data.categoryBalances) {
            const categories = balanceResponse.data.categoryBalances.map(cat => {
              const availableBalance = parseFloat(cat.availableBalance) / Math.pow(10, 18);
              const totalReceived = parseFloat(cat.totalReceived) / Math.pow(10, 18);
              const totalSpent = parseFloat(cat.totalSpent) / Math.pow(10, 18);
              
              return {
                id: cat.category.toLowerCase(),
                name: cat.category,
                icon: getCategoryIcon(cat.category),
                units: Math.floor(availableBalance),
                availableBalance: availableBalance,
                totalReceived: totalReceived,
                totalSpent: totalSpent,
                transactionCount: cat.transactionCount,
                color: getCategoryColor(cat.category),
                iconBg: getCategoryIconBg(cat.category)
              };
            }).filter(cat => cat.availableBalance > 0 || cat.totalReceived > 0); // Show categories with balance or history

            setAidCategories(categories);
          } else {
            // Fallback to old spending-based categories
            const categories = balanceResponse.data.spendingByCategory.map(cat => ({
              id: cat.category.toLowerCase(),
              name: cat.category.charAt(0).toUpperCase() + cat.category.slice(1),
              icon: getCategoryIcon(cat.category),
              units: Math.floor(parseFloat(cat.totalSpent) / 10),
              color: getCategoryColor(cat.category),
              iconBg: getCategoryIconBg(cat.category)
            }));

            // Add default categories if none exist
            if (categories.length === 0) {
              setAidCategories([
                {
                  id: 'food',
                  name: 'Food',
                  icon: '🍽️',
                  units: Math.floor(balance * 0.5),
                  availableBalance: balance * 0.5,
                  color: 'bg-blue-100 text-blue-800',
                  iconBg: 'bg-blue-500'
                },
                {
                  id: 'medical',
                  name: 'Medical',
                  icon: '💊',
                  units: Math.floor(balance * 0.3),
                  availableBalance: balance * 0.3,
                  color: 'bg-purple-100 text-purple-800',
                  iconBg: 'bg-purple-500'
                },
                {
                  id: 'shelter',
                  name: 'Shelter',
                  icon: '🏠',
                  units: Math.floor(balance * 0.2),
                  availableBalance: balance * 0.2,
                  color: 'bg-green-100 text-green-800',
                  iconBg: 'bg-green-500'
                }
              ]);
            } else {
              setAidCategories(categories);
            }
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

  // Helper functions for category display
  const getCategoryIcon = (category) => {
    const iconMap = {
      'Food': '🍽️',
      'Medical': '💊',
      'Shelter': '🏠',
      'Water': '💧',
      'Clothing': '👕',
      'Emergency Supplies': '📦'
    };
    return iconMap[category] || '📦';
  };

  const getCategoryColor = (category) => {
    const colorMap = {
      'Food': 'bg-blue-100 text-blue-800',
      'Medical': 'bg-purple-100 text-purple-800',
      'Shelter': 'bg-green-100 text-green-800',
      'Water': 'bg-cyan-100 text-cyan-800',
      'Clothing': 'bg-pink-100 text-pink-800',
      'Emergency Supplies': 'bg-orange-100 text-orange-800'
    };
    return colorMap[category] || 'bg-gray-100 text-gray-800';
  };

  const getCategoryIconBg = (category) => {
    const bgMap = {
      'Food': 'bg-blue-500',
      'Medical': 'bg-purple-500',
      'Shelter': 'bg-green-500',
      'Water': 'bg-cyan-500',
      'Clothing': 'bg-pink-500',
      'Emergency Supplies': 'bg-orange-500'
    };
    return bgMap[category] || 'bg-gray-500';
  };

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

  const handleQRScan = () => {
    setShowQRScanner(true);
    setScannedPaymentData(null);
  };

  const handleQRScanSuccess = (qrData) => {
    console.log('QR Code scanned successfully:', qrData);
    setScannedPaymentData(qrData);
    setShowQRScanner(false);
    
    // Find vendor from nearby vendors list
    const vendor = nearbyVendors.find(v => v.id === qrData.vendorId);
    if (vendor) {
      setSelectedVendor(vendor);
    }
    
    // Show payment modal
    setShowSpendingModal(true);
  };

  const handleQRScanError = (error) => {
    console.error('QR scan error:', error);
    alert(error);
  };

  const processPayment = async () => {
    if (!scannedPaymentData || !paymentAmount || !paymentDescription) {
      alert('Please fill in all payment details');
      return;
    }

    if (!selectedCategory) {
      alert('Please select a category for this payment');
      return;
    }

    // Validate category balance
    const categoryBalance = selectedCategory.availableBalance || selectedCategory.units;
    const requestedAmount = parseFloat(paymentAmount);
    
    if (requestedAmount > categoryBalance) {
      alert(`Insufficient balance in ${selectedCategory.name} category. Available: ${categoryBalance.toFixed(2)} units, Requested: ${requestedAmount} units`);
      return;
    }

    setProcessingPayment(true);
    
    try {
      // Process the payment through the backend
      const paymentData = {
        vendorId: scannedPaymentData.vendorId,
        paymentCode: scannedPaymentData.paymentCode,
        amount: requestedAmount,
        description: paymentDescription,
        category: selectedCategory.name,
        timestamp: Date.now()
      };

      const response = await apiService.processSpending(paymentData);
      
      if (response.success) {
        // Update local state - subtract from total balance
        setAidBalance(prev => prev - requestedAmount);
        
        // Update category balance
        setAidCategories(prev => prev.map(cat => {
          if (cat.id === selectedCategory.id) {
            return {
              ...cat,
              units: Math.max(0, cat.units - requestedAmount),
              availableBalance: Math.max(0, (cat.availableBalance || cat.units) - requestedAmount),
              totalSpent: (cat.totalSpent || 0) + requestedAmount
            };
          }
          return cat;
        }));
        
        // Add to recent transactions
        const newTransaction = {
          id: response.data.transactionId || `txn-${Date.now()}`,
          vendor: selectedVendor?.name || 'Unknown Vendor',
          items: paymentDescription,
          amount: requestedAmount,
          category: selectedCategory.name,
          date: 'Just now',
          status: 'confirmed'
        };
        
        setRecentTransactions(prev => [newTransaction, ...prev.slice(0, 9)]);
        
        // Reset form
        setScannedPaymentData(null);
        setPaymentAmount('');
        setPaymentDescription('');
        setSelectedVendor(null);
        setSelectedCategory(null);
        setShowSpendingModal(false);
        
        // Show success message with category balance info
        const categoryBalanceInfo = response.data.categoryBalance;
        if (categoryBalanceInfo) {
          alert(`Payment processed successfully!\n\n${categoryBalanceInfo.category} Category:\n- Spent: ${categoryBalanceInfo.spentAmount} units\n- Remaining: ${parseFloat(categoryBalanceInfo.availableAfterSpending).toFixed(2)} units`);
        } else {
          alert('Payment processed successfully!');
        }
      } else {
        throw new Error(response.message || 'Payment failed');
      }
    } catch (error) {
      console.error('Payment processing error:', error);
      
      // Handle category-specific error messages
      if (error.message.includes('Insufficient balance for')) {
        alert(`Payment failed: ${error.message}`);
      } else {
        alert(`Payment failed: ${error.message}`);
      }
    } finally {
      setProcessingPayment(false);
    }
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
          <div className="grid md:grid-cols-2 gap-4">
            <button
              onClick={handleSpendAid}
              className="bg-green-500 hover:bg-green-600 text-white font-semibold py-4 px-6 rounded-3xl shadow-lg hover:shadow-xl transition-all duration-200 transform hover:-translate-y-1 flex items-center justify-center text-lg"
            >
              🛒 Spend Aid Now
            </button>
            <button
              onClick={handleQRScan}
              className="bg-blue-500 hover:bg-blue-600 text-white font-semibold py-4 px-6 rounded-3xl shadow-lg hover:shadow-xl transition-all duration-200 transform hover:-translate-y-1 flex items-center justify-center text-lg"
            >
              📱 Scan QR Code
            </button>
          </div>
        </div>
        
        {/* Category-Specific Balances */}
        <div className="mb-8">
          <h3 className="text-xl font-semibold text-gray-900 mb-6">Category-Specific Aid Balances</h3>
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
                    <div className="text-sm text-gray-600">
                      Available: {category.units} Units
                    </div>
                  </div>
                </div>
                
                {/* Balance Progress Bar */}
                <div className="w-full bg-gray-200 rounded-full h-3 mb-3">
                  <div 
                    className={`h-3 rounded-full ${category.iconBg}`}
                    style={{ 
                      width: `${Math.min((category.availableBalance || category.units) / Math.max(...aidCategories.map(c => c.availableBalance || c.units)) * 100, 100)}%` 
                    }}
                  ></div>
                </div>
                
                {/* Category Details */}
                <div className="space-y-1 text-xs text-gray-500">
                  {category.availableBalance !== undefined && (
                    <>
                      <div className="flex justify-between">
                        <span>Available:</span>
                        <span className="font-medium">{category.availableBalance.toFixed(2)} units</span>
                      </div>
                      {category.totalReceived > 0 && (
                        <div className="flex justify-between">
                          <span>Total Received:</span>
                          <span className="text-green-600 font-medium">{category.totalReceived.toFixed(2)} units</span>
                        </div>
                      )}
                      {category.totalSpent > 0 && (
                        <div className="flex justify-between">
                          <span>Total Spent:</span>
                          <span className="text-red-600 font-medium">{category.totalSpent.toFixed(2)} units</span>
                        </div>
                      )}
                      {category.transactionCount > 0 && (
                        <div className="flex justify-between">
                          <span>Transactions:</span>
                          <span className="font-medium">{category.transactionCount}</span>
                        </div>
                      )}
                    </>
                  )}
                  {category.availableBalance === undefined && (
                    <div className="text-center">
                      <span>Available: {category.units} units</span>
                    </div>
                  )}
                </div>
                
                {/* Category Status Indicator */}
                <div className="mt-3 flex justify-center">
                  <span className={`text-xs px-2 py-1 rounded-full ${
                    (category.availableBalance || category.units) > 0 
                      ? 'bg-green-100 text-green-800' 
                      : 'bg-gray-100 text-gray-600'
                  }`}>
                    {(category.availableBalance || category.units) > 0 ? 'Available' : 'No Balance'}
                  </span>
                </div>
              </div>
            ))}
          </div>
          
          {aidCategories.length === 0 && (
            <div className="bg-white rounded-3xl shadow-lg p-8 text-center">
              <div className="text-4xl mb-4">📊</div>
              <h4 className="text-lg font-semibold text-gray-900 mb-2">No Category Balances</h4>
              <p className="text-gray-600">Your category-specific aid balances will appear here once you receive donations.</p>
            </div>
          )}
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

      {/* QR Scanner Modal */}
      {showQRScanner && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-3xl shadow-2xl max-w-md w-full p-6">
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-xl font-semibold text-gray-900">Scan Vendor QR Code</h3>
              <button
                onClick={() => setShowQRScanner(false)}
                className="text-gray-400 hover:text-gray-600 text-2xl"
              >
                ×
              </button>
            </div>
            
            <QRCodeScanner
              isActive={showQRScanner}
              onScanSuccess={handleQRScanSuccess}
              onScanError={handleQRScanError}
            />
            
            <div className="mt-6 text-center">
              <button
                onClick={() => setShowQRScanner(false)}
                className="bg-gray-500 text-white px-6 py-2 rounded-xl hover:bg-gray-600 transition-colors"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Payment Processing Modal */}
      {showSpendingModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-3xl shadow-2xl max-w-md w-full p-6">
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-xl font-semibold text-gray-900">
                {scannedPaymentData ? 'Process Payment' : 'Spend Aid'}
              </h3>
              <button
                onClick={() => {
                  setShowSpendingModal(false);
                  setScannedPaymentData(null);
                  setPaymentAmount('');
                  setPaymentDescription('');
                }}
                className="text-gray-400 hover:text-gray-600 text-2xl"
              >
                ×
              </button>
            </div>

            {scannedPaymentData && (
              <div className="mb-6 p-4 bg-green-50 border border-green-200 rounded-2xl">
                <div className="flex items-center mb-2">
                  <span className="text-green-600 text-xl mr-2">✅</span>
                  <span className="font-semibold text-green-800">QR Code Scanned</span>
                </div>
                <div className="text-sm text-green-700">
                  <div>Vendor ID: {scannedPaymentData.vendorId}</div>
                  <div>Payment Code: {scannedPaymentData.paymentCode}</div>
                  {selectedVendor && (
                    <div className="mt-2 font-medium">
                      Vendor: {selectedVendor.name}
                    </div>
                  )}
                </div>
              </div>
            )}

            <div className="space-y-4">
              {/* Category Selection */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Category
                </label>
                <div className="grid grid-cols-3 gap-2">
                  {aidCategories.map((category) => {
                    const availableBalance = category.availableBalance || category.units;
                    const hasBalance = availableBalance > 0;
                    
                    return (
                      <button
                        key={category.id}
                        onClick={() => hasBalance ? setSelectedCategory(category) : null}
                        disabled={!hasBalance}
                        className={`p-3 rounded-xl border text-center transition-colors ${
                          selectedCategory?.id === category.id
                            ? 'border-blue-500 bg-blue-50 text-blue-700'
                            : hasBalance
                            ? 'border-gray-200 hover:border-gray-300'
                            : 'border-gray-100 bg-gray-50 text-gray-400 cursor-not-allowed'
                        }`}
                      >
                        <div className="text-xl mb-1">{category.icon}</div>
                        <div className="text-xs font-medium">{category.name}</div>
                        <div className={`text-xs ${hasBalance ? 'text-gray-500' : 'text-gray-400'}`}>
                          {availableBalance.toFixed(1)} units
                        </div>
                        {!hasBalance && (
                          <div className="text-xs text-red-500 mt-1">No Balance</div>
                        )}
                      </button>
                    );
                  })}
                </div>
                {aidCategories.length === 0 && (
                  <div className="text-center py-4 text-gray-500">
                    <div className="text-sm">No categories available</div>
                    <div className="text-xs mt-1">Please receive donations first</div>
                  </div>
                )}
              </div>

              {/* Amount Input */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Amount (Aid Units)
                </label>
                <input
                  type="number"
                  value={paymentAmount}
                  onChange={(e) => setPaymentAmount(e.target.value)}
                  placeholder="Enter amount"
                  className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  min="1"
                  max={selectedCategory?.availableBalance || selectedCategory?.units || aidBalance}
                  step="0.01"
                />
                {selectedCategory && (
                  <div className="text-xs text-gray-500 mt-1">
                    Available in {selectedCategory.name}: {(selectedCategory.availableBalance || selectedCategory.units).toFixed(2)} units
                    {selectedCategory.totalReceived > 0 && (
                      <div className="mt-1">
                        <span className="text-green-600">Received: {selectedCategory.totalReceived.toFixed(2)}</span>
                        {selectedCategory.totalSpent > 0 && (
                          <span className="text-red-600 ml-2">Spent: {selectedCategory.totalSpent.toFixed(2)}</span>
                        )}
                      </div>
                    )}
                  </div>
                )}
                {!selectedCategory && (
                  <div className="text-xs text-red-500 mt-1">
                    Please select a category first
                  </div>
                )}
              </div>

              {/* Description Input */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Description
                </label>
                <input
                  type="text"
                  value={paymentDescription}
                  onChange={(e) => setPaymentDescription(e.target.value)}
                  placeholder="What are you purchasing?"
                  className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>

              {/* Action Buttons */}
              <div className="flex gap-3 pt-4">
                <button
                  onClick={() => {
                    setShowSpendingModal(false);
                    setScannedPaymentData(null);
                    setPaymentAmount('');
                    setPaymentDescription('');
                  }}
                  className="flex-1 bg-gray-500 text-white py-3 px-4 rounded-xl hover:bg-gray-600 transition-colors"
                  disabled={processingPayment}
                >
                  Cancel
                </button>
                <button
                  onClick={processPayment}
                  disabled={processingPayment || !paymentAmount || !paymentDescription || !selectedCategory}
                  className="flex-1 bg-green-500 text-white py-3 px-4 rounded-xl hover:bg-green-600 transition-colors disabled:bg-gray-300 disabled:cursor-not-allowed flex items-center justify-center"
                >
                  {processingPayment ? (
                    <>
                      <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                      Processing...
                    </>
                  ) : (
                    scannedPaymentData ? 'Pay Vendor' : 'Spend Aid'
                  )}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default BeneficiaryDashboard;