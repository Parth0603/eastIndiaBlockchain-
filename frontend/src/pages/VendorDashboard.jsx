import { useState, useEffect } from 'react';
import { useAuth } from '../hooks/useAuth';
import { useWallet } from '../hooks/useWallet';
import { usePageTitle } from '../hooks/usePageTitle';
import apiService from '../services/api';
import QRCodeGenerator from '../components/vendor/QRCodeGenerator';

const VendorDashboard = () => {
  const { isAuthenticated, user } = useAuth();
  const { isConnected, account } = useWallet();
  
  // Set page title
  usePageTitle('Portal');
  const [paymentCode, setPaymentCode] = useState('');
  const [qrCodeData, setQrCodeData] = useState(null);
  const [vendorProfile, setVendorProfile] = useState(null);
  const [dashboardStats, setDashboardStats] = useState(null);
  const [recentTransactions, setRecentTransactions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Fetch vendor data from backend
  useEffect(() => {
    const fetchVendorData = async () => {
      if (!isConnected || !account) {
        setLoading(false);
        return;
      }

      // If connected but not authenticated, don't try to fetch data
      if (!isAuthenticated) {
        setLoading(false);
        return;
      }

      try {
        setLoading(true);
        setError(null);

        // Get vendor profile and dashboard stats
        const [profileResponse, statsResponse, transactionsResponse] = await Promise.all([
          apiService.getVendorProfile().catch(err => ({ success: false, error: err.message })),
          apiService.getVendorDashboardStats().catch(err => ({ success: false, error: err.message })),
          apiService.getVendorTransactions({ limit: 10 }).catch(err => ({ success: false, error: err.message }))
        ]);

        if (profileResponse.success) {
          setVendorProfile({
            name: profileResponse.data.businessName || 'Unknown Business',
            id: `VEN-${profileResponse.data.address.slice(-6).toUpperCase()}`,
            category: formatBusinessType(profileResponse.data.businessType),
            verified: profileResponse.data.status === 'approved',
            image: '/api/placeholder/80/80',
            rating: 0, // No rating system implemented yet
            location: profileResponse.data.city || 'Unknown Location'
          });
        } else {
          // Check if user is authenticated as vendor but no profile exists
          if (user && user.roles && user.roles.includes('vendor')) {
            setVendorProfile({
              name: 'Vendor Profile Pending',
              id: `VEN-${account.slice(-6).toUpperCase()}`,
              category: 'General',
              verified: false,
              image: '/api/placeholder/80/80',
              rating: 0,
              location: 'Unknown Location'
            });
          } else {
            // No vendor profile available
            setVendorProfile({
              name: 'Unregistered Vendor',
              id: `VEN-${account.slice(-6).toUpperCase()}`,
              category: 'General',
              verified: false,
              image: '/api/placeholder/80/80',
              rating: 0,
              location: 'Unknown Location'
            });
          }
        }

        if (statsResponse.success) {
          setDashboardStats({
            totalPayments: parseFloat(statsResponse.data.stats.totalRevenue),
            transactions: statsResponse.data.stats.totalTransactions,
            status: 'Settled (Auto-deposited to bank)'
          });
        } else {
          // No stats available
          setDashboardStats({
            totalPayments: 0,
            transactions: 0,
            status: 'No transactions yet'
          });
        }

        if (transactionsResponse.success) {
          const transactions = transactionsResponse.data.transactions.map(tx => ({
            id: tx.id,
            beneficiary: tx.beneficiaryName || 'Unknown Beneficiary',
            amount: parseFloat(tx.amount),
            items: tx.description ? [tx.description] : ['Relief items'],
            time: getTimeAgo(new Date(tx.timestamp)),
            status: tx.status,
            paymentCode: tx.transactionHash ? tx.transactionHash.slice(-8).toUpperCase() : 'N/A'
          }));
          setRecentTransactions(transactions.slice(0, 5));
        } else {
          // No transactions available
          setRecentTransactions([]);
        }

      } catch (error) {
        console.error('Error fetching vendor data:', error);
        setError('Failed to load vendor data');
      } finally {
        setLoading(false);
      }
    };

    fetchVendorData();
  }, [isConnected, account, isAuthenticated]);

  // Helper function to format business type for display
  const formatBusinessType = (businessType) => {
    const typeMap = {
      'retail': 'Retail Store',
      'pharmacy': 'Pharmacy',
      'grocery': 'Grocery Store', 
      'hardware': 'Hardware Store',
      'medical': 'Medical Services',
      'restaurant': 'Restaurant/Food Service',
      'other': 'Other'
    };
    return typeMap[businessType] || businessType || 'General';
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

  // Generate initial payment code
  useEffect(() => {
    if (vendorProfile?.id) {
      generateNewPaymentCode();
    }
  }, [vendorProfile?.id]);

  // Generate new payment code from transaction hash
  const generateNewPaymentCode = () => {
    // In production, this would be generated by the backend
    const timestamp = Date.now().toString();
    const randomSuffix = Math.random().toString(36).substring(2, 6).toUpperCase();
    const newCode = `${timestamp.slice(-4)}-${randomSuffix}`;
    setPaymentCode(newCode);
  };

  // Handle QR code generation
  const handleQRCodeGenerated = (qrData) => {
    setQrCodeData(qrData);
    console.log('QR Code generated:', qrData);
  };

  const confirmPayment = async () => {
    try {
      // In a real implementation, this would validate the payment with the backend
      const newTransaction = {
        id: `txn-${Date.now()}`,
        beneficiary: 'New Beneficiary',
        amount: 150,
        items: ['Food Items'],
        time: 'Just now',
        status: 'completed',
        paymentCode: paymentCode
      };
      
      setRecentTransactions(prev => [newTransaction, ...prev.slice(0, 4)]);
      
      if (dashboardStats) {
        setDashboardStats(prev => ({
          ...prev,
          totalPayments: prev.totalPayments + 150,
          transactions: prev.transactions + 1
        }));
      }

      generateNewPaymentCode();
      alert('Payment confirmed successfully!');
    } catch (error) {
      console.error('Error confirming payment:', error);
      alert('Failed to confirm payment. Please try again.');
    }
  };

  if (!isConnected || !isAuthenticated) {
    return (
      <div className="min-h-screen bg-blue-50 flex items-center justify-center">
        <div className="max-w-md w-full bg-white rounded-3xl shadow-2xl p-8 text-center">
          <div className="w-20 h-20 bg-blue-500 rounded-2xl flex items-center justify-center mx-auto mb-6">
            <span className="text-3xl">🏪</span>
          </div>
          <h2 className="text-2xl font-bold text-gray-900 mb-4">Access Vendor Portal</h2>
          <p className="text-gray-600 mb-6">
            {!isConnected 
              ? "Connect your wallet to access your vendor portal and accept payments from beneficiaries."
              : "Please complete authentication to access your vendor dashboard."
            }
          </p>
          <div className="text-sm text-gray-500">
            {!isConnected 
              ? 'Use the "Connect Wallet" button in the header to get started.'
              : 'You need to sign up or authenticate as a vendor to access this dashboard.'
            }
          </div>
          {isConnected && !isAuthenticated && (
            <div className="mt-4">
              <button
                onClick={() => window.location.href = '/signup/vendor'}
                className="bg-purple-600 text-white px-6 py-3 rounded-xl hover:bg-purple-700 transition-colors"
              >
                Register as Vendor
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
          <p className="text-gray-600">Loading your vendor dashboard...</p>
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
            <h1 className="text-3xl font-bold text-gray-900">Vendor Portal</h1>
            <div className="flex items-center space-x-3">
              <div className="text-sm text-gray-600">Welcome back!</div>
              <div className="w-10 h-10 bg-blue-500 rounded-full flex items-center justify-center">
                <span className="text-white font-semibold">🏪</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        {/* Accept Payment Card */}
        <div className="bg-white rounded-3xl shadow-lg overflow-hidden mb-8">
          {/* Header */}
          <div className="bg-blue-500 text-white py-4 px-6">
            <h2 className="text-xl font-semibold text-center">Accept Payment</h2>
          </div>
          
          {/* Vendor Identity */}
          <div className="p-6">
            <div className="text-center mb-6">
              <div className="flex items-center justify-center mb-4">
                <div className="w-20 h-20 bg-green-100 rounded-2xl flex items-center justify-center mr-4">
                  <span className="text-3xl">🏪</span>
                </div>
                <div className="text-left">
                  <h3 className="text-lg font-semibold text-gray-900">Vendor Identity</h3>
                  <div className="flex items-center mt-1">
                    <svg className="w-4 h-4 text-green-500 mr-1" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                    </svg>
                    <span className="text-green-600 font-medium">
                      {vendorProfile?.verified ? 'Verified Vendor' : 'Pending Verification'}
                    </span>
                  </div>
                  <div className="text-sm text-gray-600 mt-1">
                    ID: {vendorProfile?.id || 'VEN-UNKNOWN'}
                  </div>
                  <div className="text-sm text-gray-600">
                    {vendorProfile?.name || 'Unknown Business'}
                  </div>
                </div>
              </div>
            </div>

            {/* QR Code Section */}
            <div className="text-center mb-6">
              <p className="text-gray-600 mb-4">Scan to Accept Payment from Beneficiary</p>
              
              {/* Real QR Code Generator */}
              <QRCodeGenerator
                vendorId={vendorProfile?.id}
                paymentCode={paymentCode}
                onCodeGenerated={handleQRCodeGenerated}
              />
              
              <div className="text-lg font-semibold text-gray-900 mb-2 mt-4">
                PAY-CODE: {paymentCode}
              </div>
              <button
                onClick={generateNewPaymentCode}
                className="text-blue-600 hover:text-blue-800 text-sm underline"
              >
                Generate New Code
              </button>
            </div>

            {/* Category Verification */}
            <div className="bg-green-50 border border-green-200 rounded-2xl p-4 mb-6">
              <h4 className="font-semibold text-green-800 mb-2">Category Auto-Verification</h4>
              <div className="flex items-center">
                <svg className="w-5 h-5 text-green-600 mr-2" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                </svg>
                <span className="text-green-700">
                  Category: {vendorProfile?.category || 'General'} (Verified for Beneficiary)
                </span>
              </div>
            </div>

            {/* Confirm Payment Button */}
            <button
              onClick={confirmPayment}
              className="w-full bg-green-500 hover:bg-green-600 text-white font-semibold py-4 px-6 rounded-2xl shadow-lg hover:shadow-xl transition-all duration-200 transform hover:-translate-y-1 flex items-center justify-center text-lg"
            >
              <svg className="w-6 h-6 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
              </svg>
              Confirm Payment
            </button>
          </div>
        </div>
        
        {/* Today's Settlement Summary */}
        <div className="bg-white rounded-3xl shadow-lg p-6 mb-8">
          <h3 className="text-xl font-semibold text-gray-900 mb-6">Today's Settlement Summary</h3>
          
          <div className="grid md:grid-cols-3 gap-6">
            <div>
              <div className="text-sm text-gray-600 mb-1">Total Payments:</div>
              <div className="text-2xl font-bold text-gray-900">
                ${dashboardStats?.totalPayments?.toFixed(2) || '0.00'}
              </div>
            </div>
            <div>
              <div className="text-sm text-gray-600 mb-1">Transactions:</div>
              <div className="text-2xl font-bold text-gray-900">
                {dashboardStats?.transactions || 0}
              </div>
            </div>
            <div>
              <div className="text-sm text-gray-600 mb-1">Status:</div>
              <div className="text-lg font-semibold text-green-600">
                {dashboardStats?.status || 'No transactions yet'}
              </div>
            </div>
          </div>
        </div>

        {/* Transparency Notice */}
        <div className="bg-blue-50 border border-blue-200 rounded-3xl p-6 mb-8">
          <div className="text-center">
            <div className="w-16 h-16 bg-blue-500 rounded-full flex items-center justify-center mx-auto mb-4">
              <span className="text-2xl">⛓️</span>
            </div>
            <h3 className="text-lg font-semibold text-gray-900 mb-2">100% Transparent & Traceable</h3>
            <p className="text-gray-600">
              Every transaction is verified and settled daily.
            </p>
          </div>
        </div>

        {/* Recent Transactions */}
        <div className="bg-white rounded-3xl shadow-lg p-6 mb-8">
          <h3 className="text-xl font-semibold text-gray-900 mb-6">Recent Transactions</h3>
          
          {recentTransactions.length > 0 ? (
            <div className="space-y-4">
              {recentTransactions.map((transaction) => (
                <div key={transaction.id} className="flex items-center justify-between p-4 bg-gray-50 rounded-2xl">
                  <div className="flex items-center">
                    <div className="w-12 h-12 bg-green-100 rounded-xl flex items-center justify-center mr-4">
                      <span className="text-xl">👤</span>
                    </div>
                    <div>
                      <div className="font-semibold text-gray-900">{transaction.beneficiary}</div>
                      <div className="text-sm text-gray-600">{transaction.items.join(', ')}</div>
                      <div className="text-xs text-gray-500">{transaction.time}</div>
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="font-semibold text-gray-900">${transaction.amount.toFixed(2)}</div>
                    <div className={`text-xs px-2 py-1 rounded-full ${
                      transaction.status === 'confirmed' ? 'bg-green-100 text-green-800' :
                      transaction.status === 'pending' ? 'bg-yellow-100 text-yellow-800' :
                      'bg-gray-100 text-gray-800'
                    }`}>
                      {transaction.status}
                    </div>
                    <div className="text-xs text-gray-500 mt-1">
                      Code: {transaction.paymentCode}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-8">
              <div className="text-4xl mb-4">📋</div>
              <h4 className="text-lg font-semibold text-gray-900 mb-2">No Transactions Yet</h4>
              <p className="text-gray-600">Your transaction history will appear here once you start accepting payments.</p>
            </div>
          )}
        </div>

        {/* Vendor Stats */}
        <div className="grid md:grid-cols-2 gap-6 mb-8">
          {/* Performance Stats */}
          <div className="bg-white rounded-3xl shadow-lg p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Performance Stats</h3>
            <div className="space-y-4">
              <div className="flex justify-between items-center">
                <span className="text-gray-600">Rating</span>
                <div className="flex items-center">
                  <div className="flex items-center text-yellow-500 mr-2">
                    <svg className="w-4 h-4 fill-current" viewBox="0 0 20 20">
                      <path d="M10 15l-5.878 3.09 1.123-6.545L.489 6.91l6.572-.955L10 0l2.939 5.955 6.572.955-4.756 4.635 1.123 6.545z"/>
                    </svg>
                    <span className="text-gray-900 font-semibold ml-1">
                      {vendorProfile?.rating?.toFixed(1) || '4.5'}
                    </span>
                  </div>
                </div>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-gray-600">Total Served</span>
                <span className="font-semibold text-gray-900">
                  {dashboardStats?.transactions || 0} beneficiaries
                </span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-gray-600">This Month</span>
                <span className="font-semibold text-gray-900">
                  ${dashboardStats?.totalPayments?.toFixed(2) || '0.00'}
                </span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-gray-600">Success Rate</span>
                <span className="font-semibold text-green-600">100%</span>
              </div>
            </div>
          </div>

          {/* Quick Actions */}
          <div className="bg-white rounded-3xl shadow-lg p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Quick Actions</h3>
            <div className="space-y-3">
              <button className="w-full bg-blue-600 text-white py-3 px-4 rounded-xl hover:bg-blue-700 transition-colors text-left flex items-center">
                <span className="text-xl mr-3">📊</span>
                View Detailed Reports
              </button>
              <button className="w-full bg-green-600 text-white py-3 px-4 rounded-xl hover:bg-green-700 transition-colors text-left flex items-center">
                <span className="text-xl mr-3">💰</span>
                Settlement History
              </button>
              <button className="w-full bg-purple-600 text-white py-3 px-4 rounded-xl hover:bg-purple-700 transition-colors text-left flex items-center">
                <span className="text-xl mr-3">⚙️</span>
                Update Profile
              </button>
              <button className="w-full bg-orange-600 text-white py-3 px-4 rounded-xl hover:bg-orange-700 transition-colors text-left flex items-center">
                <span className="text-xl mr-3">📞</span>
                Contact Support
              </button>
            </div>
          </div>
        </div>

        {/* Help Section */}
        <div className="bg-purple-50 border border-purple-200 rounded-3xl p-6">
          <div className="text-center">
            <div className="w-16 h-16 bg-purple-500 rounded-full flex items-center justify-center mx-auto mb-4">
              <span className="text-2xl">💡</span>
            </div>
            <h3 className="text-lg font-semibold text-gray-900 mb-2">Need Help?</h3>
            <p className="text-gray-600 mb-4">
              Get assistance with payment processing, settlements, or technical issues.
            </p>
            <div className="flex flex-col sm:flex-row gap-3 justify-center">
              <button className="bg-purple-600 text-white px-6 py-2 rounded-xl hover:bg-purple-700 transition-colors">
                📖 Vendor Guide
              </button>
              <button className="bg-white text-purple-600 border border-purple-600 px-6 py-2 rounded-xl hover:bg-purple-50 transition-colors">
                💬 Live Chat
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default VendorDashboard;