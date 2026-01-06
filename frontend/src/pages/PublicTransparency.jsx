import React, { useState, useEffect } from 'react';
import { useCurrency } from '../contexts/CurrencyContext';
import apiService from '../services/api';

const PublicTransparency = () => {
  const { formatCurrency } = useCurrency();
  const [liveStats, setLiveStats] = useState({
    totalFundsReceived: 0,
    fundsDistributed: 0,
    activeBeneficiaries: 0,
    loading: true,
    error: null
  });

  const [liveTransactions, setLiveTransactions] = useState([]);
  const [fundFlow, setFundFlow] = useState({
    categoryFlow: [],
    monthlyFlow: [],
    loading: true,
    error: null
  });

  const [transactionsLoading, setTransactionsLoading] = useState(true);
  const [transactionsError, setTransactionsError] = useState(null);

  // Fetch live statistics
  useEffect(() => {
    const fetchStats = async () => {
      try {
        setLiveStats(prev => ({ ...prev, loading: true, error: null }));
        const response = await apiService.getPublicStats();
        
        if (response.success) {
          setLiveStats({
            totalFundsReceived: parseFloat(response.data.totalRaised) / Math.pow(10, 18),
            fundsDistributed: parseFloat(response.data.fundsDistributed) / Math.pow(10, 18),
            activeBeneficiaries: response.data.peopleHelped,
            loading: false,
            error: null
          });
        } else {
          throw new Error('Failed to fetch stats');
        }
      } catch (error) {
        console.error('Error fetching stats:', error);
        setLiveStats(prev => ({
          ...prev,
          loading: false,
          error: 'Failed to load statistics'
        }));
      }
    };

    fetchStats();
    const interval = setInterval(fetchStats, 30000); // Refresh every 30 seconds
    return () => clearInterval(interval);
  }, []);

  // Fetch live transactions
  useEffect(() => {
    const fetchTransactions = async () => {
      try {
        setTransactionsLoading(true);
        setTransactionsError(null);
        
        const response = await apiService.getPublicTransactions({ 
          limit: 10,
          page: 1 
        });
        
        if (response.success) {
          const formattedTransactions = response.data.transactions.map(tx => ({
            id: tx._id,
            type: tx.type,
            amount: parseFloat(tx.amount) / Math.pow(10, 18),
            from: tx.from ? `${tx.from.slice(0, 6)}...${tx.from.slice(-4)}` : null,
            to: tx.to ? `${tx.to.slice(0, 6)}...${tx.to.slice(-4)}` : null,
            description: getTransactionDescription(tx),
            time: getTimeAgo(new Date(tx.createdAt)),
            icon: getTransactionIcon(tx.type),
            category: tx.category
          }));
          
          setLiveTransactions(formattedTransactions);
        } else {
          throw new Error('Failed to fetch transactions');
        }
      } catch (error) {
        console.error('Error fetching transactions:', error);
        setTransactionsError('Failed to load transactions');
      } finally {
        setTransactionsLoading(false);
      }
    };

    fetchTransactions();
    const interval = setInterval(fetchTransactions, 15000); // Refresh every 15 seconds
    return () => clearInterval(interval);
  }, []);

  // Fetch fund flow data
  useEffect(() => {
    const fetchFundFlow = async () => {
      try {
        setFundFlow(prev => ({ ...prev, loading: true, error: null }));
        const response = await apiService.getFundFlow();
        
        if (response.success) {
          setFundFlow({
            categoryFlow: response.data.categoryFlow,
            monthlyFlow: response.data.monthlyFlow,
            loading: false,
            error: null
          });
        } else {
          throw new Error('Failed to fetch fund flow');
        }
      } catch (error) {
        console.error('Error fetching fund flow:', error);
        setFundFlow(prev => ({
          ...prev,
          loading: false,
          error: 'Failed to load fund flow data'
        }));
      }
    };

    fetchFundFlow();
  }, []);

  const getTransactionDescription = (tx) => {
    switch (tx.type) {
      case 'donation':
        return 'Donation Received';
      case 'spending':
        return `Aid Distributed: ${tx.category || 'General'}`;
      case 'vendor_payment':
        return `Vendor Payment: ${tx.category || 'General'}`;
      default:
        return 'Transaction';
    }
  };

  const getTransactionIcon = (type) => {
    switch (type) {
      case 'donation':
        return '💰';
      case 'spending':
        return '🎁';
      case 'vendor_payment':
        return '🏪';
      default:
        return '📄';
    }
  };

  const getTimeAgo = (date) => {
    const now = new Date();
    const diffInMinutes = Math.floor((now - date) / (1000 * 60));
    
    if (diffInMinutes < 1) return 'Just now';
    if (diffInMinutes < 60) return `${diffInMinutes} mins ago`;
    if (diffInMinutes < 1440) return `${Math.floor(diffInMinutes / 60)} hours ago`;
    return `${Math.floor(diffInMinutes / 1440)} days ago`;
  };

  // Calculate spending breakdown from fund flow data
  const spendingBreakdown = fundFlow.categoryFlow.map((item, index) => {
    const colors = ['#10b981', '#3b82f6', '#8b5cf6', '#f59e0b', '#ef4444'];
    const totalAmount = fundFlow.categoryFlow.reduce((sum, cat) => sum + parseFloat(cat.amount), 0);
    const percentage = totalAmount > 0 ? (parseFloat(item.amount) / totalAmount) * 100 : 0;
    
    return {
      category: item.category || 'Other',
      percentage: Math.round(percentage),
      color: colors[index % colors.length]
    };
  }).filter(item => item.percentage > 0);

  return (
    <div className="min-h-screen bg-blue-50">
      {/* Header */}
      <div className="bg-white shadow-sm border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="text-center">
            <h1 className="text-4xl font-bold text-gray-900 mb-4">
              Public Transparency Ledger
            </h1>
            <p className="text-xl text-gray-600 max-w-4xl mx-auto">
              Real-time, anonymized data on every donation and aid distribution. Trust through visibility.
            </p>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        {/* Live Stats Cards */}
        <div className="grid md:grid-cols-3 gap-6 mb-12">
          <div className="bg-white rounded-3xl shadow-lg p-6">
            <div className="flex items-center mb-4">
              <div className="w-12 h-12 bg-green-100 rounded-2xl flex items-center justify-center mr-4">
                <span className="text-2xl">💰</span>
              </div>
              <div>
                <div className="text-sm text-gray-600">Total Funds Received:</div>
                <div className="text-2xl font-bold text-gray-900">
                  {liveStats.loading ? (
                    <div className="animate-pulse bg-gray-200 h-6 w-24 rounded"></div>
                  ) : liveStats.error ? (
                    <span className="text-red-500 text-sm">Error</span>
                  ) : (
                    formatCurrency(liveStats.totalFundsReceived, { isWei: false })
                  )}
                </div>
                <div className="text-sm text-green-600 flex items-center">
                  <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse mr-2"></div>
                  (Live)
                </div>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-3xl shadow-lg p-6">
            <div className="flex items-center mb-4">
              <div className="w-12 h-12 bg-blue-100 rounded-2xl flex items-center justify-center mr-4">
                <span className="text-2xl">📤</span>
              </div>
              <div>
                <div className="text-sm text-gray-600">Funds Distributed:</div>
                <div className="text-2xl font-bold text-gray-900">
                  {liveStats.loading ? (
                    <div className="animate-pulse bg-gray-200 h-6 w-24 rounded"></div>
                  ) : liveStats.error ? (
                    <span className="text-red-500 text-sm">Error</span>
                  ) : (
                    formatCurrency(liveStats.fundsDistributed, { isWei: false })
                  )}
                </div>
                <div className="text-sm text-blue-600 flex items-center">
                  <div className="w-2 h-2 bg-blue-500 rounded-full animate-pulse mr-2"></div>
                  (Live)
                </div>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-3xl shadow-lg p-6">
            <div className="flex items-center mb-4">
              <div className="w-12 h-12 bg-purple-100 rounded-2xl flex items-center justify-center mr-4">
                <span className="text-2xl">👥</span>
              </div>
              <div>
                <div className="text-sm text-gray-600">Active Beneficiaries:</div>
                <div className="text-2xl font-bold text-gray-900">
                  {liveStats.loading ? (
                    <div className="animate-pulse bg-gray-200 h-6 w-16 rounded"></div>
                  ) : liveStats.error ? (
                    <span className="text-red-500 text-sm">Error</span>
                  ) : (
                    liveStats.activeBeneficiaries.toLocaleString()
                  )}
                </div>
                <div className="text-sm text-purple-600 flex items-center">
                  <div className="w-2 h-2 bg-purple-500 rounded-full animate-pulse mr-2"></div>
                  (Live)
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Live Transaction Feed */}
        <div className="bg-white rounded-3xl shadow-lg p-6">
          <div className="flex items-center justify-between mb-6">
            <h3 className="text-xl font-semibold text-gray-900">Live Anonymized Transaction Feed</h3>
            <div className="flex items-center text-green-600">
              <div className="w-3 h-3 bg-green-500 rounded-full animate-pulse mr-2"></div>
              <span className="text-sm font-medium">Live Updates</span>
            </div>
          </div>
          
          {transactionsLoading ? (
            <div className="space-y-4">
              {[...Array(5)].map((_, i) => (
                <div key={i} className="animate-pulse flex items-center p-4 bg-gray-50 rounded-2xl">
                  <div className="w-10 h-10 bg-gray-200 rounded-xl mr-4"></div>
                  <div className="flex-1">
                    <div className="h-4 bg-gray-200 rounded w-3/4 mb-2"></div>
                    <div className="h-3 bg-gray-200 rounded w-1/2"></div>
                  </div>
                </div>
              ))}
            </div>
          ) : transactionsError ? (
            <div className="text-center py-8">
              <p className="text-red-500">{transactionsError}</p>
            </div>
          ) : liveTransactions.length > 0 ? (
            <div className="space-y-4">
              {liveTransactions.map((transaction, index) => (
                <div 
                  key={transaction.id} 
                  className={`flex items-center justify-between p-4 rounded-2xl transition-all duration-500 ${
                    index === 0 ? 'bg-green-50 border border-green-200' : 'bg-gray-50'
                  }`}
                >
                  <div className="flex items-center">
                    <div className="w-10 h-10 bg-blue-100 rounded-xl flex items-center justify-center mr-4">
                      <span className="text-xl">{transaction.icon}</span>
                    </div>
                    <div>
                      <div className="font-medium text-gray-900">
                        {transaction.type === 'donation' && (
                          <>
                            <span className="text-green-600">Donation Received:</span> {formatCurrency(transaction.amount, { isWei: false })}
                            {transaction.from && <> from {transaction.from}</>}
                          </>
                        )}
                        {transaction.type === 'spending' && (
                          <>
                            <span className="text-blue-600">Aid Distributed:</span> {transaction.description}
                            {transaction.to && <> to {transaction.to}</>}
                          </>
                        )}
                        {transaction.type === 'vendor_payment' && (
                          <>
                            <span className="text-purple-600">Vendor Paid:</span> {formatCurrency(transaction.amount, { isWei: false })}
                            {transaction.to && <> to {transaction.to}</>}
                          </>
                        )}
                      </div>
                      <div className="text-sm text-gray-500">{transaction.time}</div>
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="text-sm text-gray-500">{transaction.time}</div>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-8">
              <p className="text-gray-500">No transactions available</p>
            </div>
          )}
          
          <div className="mt-6 text-center">
            <button 
              onClick={() => window.location.href = '/transparency'}
              className="bg-blue-600 text-white px-6 py-3 rounded-xl hover:bg-blue-700 transition-colors"
            >
              View All Transactions
            </button>
          </div>
        </div>

        {/* Blockchain Verification */}
        <div className="mt-12 bg-blue-50 border border-blue-200 rounded-3xl p-8">
          <div className="text-center">
            <div className="w-20 h-20 bg-blue-500 rounded-full flex items-center justify-center mx-auto mb-6">
              <span className="text-3xl">⛓️</span>
            </div>
            <h3 className="text-2xl font-bold text-gray-900 mb-4">100% Blockchain Verified</h3>
            <p className="text-lg text-gray-600 mb-6 max-w-3xl mx-auto">
              Every transaction is recorded on the blockchain for complete transparency and immutability. 
              All data is publicly verifiable and cannot be altered or deleted.
            </p>
            
            <div className="grid md:grid-cols-4 gap-6 max-w-4xl mx-auto">
              <div className="text-center">
                <div className="w-12 h-12 bg-green-500 rounded-full flex items-center justify-center mx-auto mb-3">
                  <svg className="w-6 h-6 text-white" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                  </svg>
                </div>
                <div className="font-semibold text-gray-900">Verified</div>
                <div className="text-sm text-gray-600">All transactions</div>
              </div>
              
              <div className="text-center">
                <div className="w-12 h-12 bg-blue-500 rounded-full flex items-center justify-center mx-auto mb-3">
                  <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                  </svg>
                </div>
                <div className="font-semibold text-gray-900">Immutable</div>
                <div className="text-sm text-gray-600">Cannot be changed</div>
              </div>
              
              <div className="text-center">
                <div className="w-12 h-12 bg-purple-500 rounded-full flex items-center justify-center mx-auto mb-3">
                  <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                  </svg>
                </div>
                <div className="font-semibold text-gray-900">Transparent</div>
                <div className="text-sm text-gray-600">Publicly visible</div>
              </div>
              
              <div className="text-center">
                <div className="w-12 h-12 bg-orange-500 rounded-full flex items-center justify-center mx-auto mb-3">
                  <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                  </svg>
                </div>
                <div className="font-semibold text-gray-900">Real-time</div>
                <div className="text-sm text-gray-600">Live updates</div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default PublicTransparency;