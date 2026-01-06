import React, { useState, useEffect } from 'react';
import { useWallet } from '../../hooks/useWallet';
import { useAuth } from '../../hooks/useAuth';
import apiService from '../../services/api';
import LoadingSpinner from '../common/LoadingSpinner';

const DonationHistory = ({ refreshTrigger }) => {
  const { account, isConnected } = useWallet();
  const { isAuthenticated } = useAuth();
  
  const [donations, setDonations] = useState([]);
  const [pagination, setPagination] = useState(null);
  const [statistics, setStatistics] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [loadingMore, setLoadingMore] = useState(false);

  const loadDonations = async (page = 1, append = false) => {
    if (!isConnected || !account) {
      setLoading(false);
      return;
    }

    // If not authenticated, show empty state instead of making API call
    if (!isAuthenticated) {
      setLoading(false);
      setDonations([]);
      setPagination(null);
      setStatistics(null);
      setError(null);
      return;
    }

    try {
      if (!append) setLoading(true);
      else setLoadingMore(true);
      
      setError(null);

      const response = await apiService.getDonationHistory({ page, limit: 10 });
      
      if (response.success) {
        const newDonations = response.data.donations || [];
        
        if (append) {
          setDonations(prev => [...prev, ...newDonations]);
        } else {
          setDonations(newDonations);
        }
        
        setPagination(response.data.pagination);
        setStatistics(response.data.statistics);
        setCurrentPage(page);
      } else {
        throw new Error(response.message || 'Failed to load donations');
      }

    } catch (err) {
      console.error('Error loading donations:', err);
      setError(err.message || 'Failed to load donation history');
      if (!append) {
        setDonations([]);
        setPagination(null);
        setStatistics(null);
      }
    } finally {
      setLoading(false);
      setLoadingMore(false);
    }
  };

  useEffect(() => {
    loadDonations(1, false);
  }, [isConnected, account, isAuthenticated, refreshTrigger]);

  const handleLoadMore = () => {
    if (pagination?.hasNextPage && !loadingMore) {
      loadDonations(currentPage + 1, true);
    }
  };

  const formatCurrency = (amount) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 2,
      maximumFractionDigits: 6
    }).format(parseFloat(amount));
  };

  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'completed':
        return 'text-green-600 bg-green-100';
      case 'pending':
        return 'text-yellow-600 bg-yellow-100';
      case 'failed':
        return 'text-red-600 bg-red-100';
      default:
        return 'text-gray-600 bg-gray-100';
    }
  };

  const truncateHash = (hash) => {
    if (!hash) return 'N/A';
    return `${hash.slice(0, 6)}...${hash.slice(-4)}`;
  };

  const openTransaction = (hash) => {
    if (hash) {
      // Open in blockchain explorer (using localhost for development)
      window.open(`https://etherscan.io/tx/${hash}`, '_blank');
    }
  };

  if (!isConnected) {
    return (
      <div className="card">
        <h2 className="text-xl font-semibold mb-4">Donation History</h2>
        <div className="text-center py-8 text-gray-500">
          <div className="text-4xl mb-4">🔗</div>
          <p>Connect your wallet to view your donation history</p>
        </div>
      </div>
    );
  }

  if (!isAuthenticated) {
    return (
      <div className="card">
        <h2 className="text-xl font-semibold mb-4">Donation History</h2>
        <div className="text-center py-8 text-yellow-600">
          <div className="text-4xl mb-4">🔐</div>
          <p className="mb-4">Authentication required to view donation history</p>
          <p className="text-sm text-gray-600 mb-4">
            Click the "Auth" button in the header to authenticate with your wallet
          </p>
          <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 text-sm text-left max-w-md mx-auto">
            <p className="font-medium mb-2">To access your donation history:</p>
            <ol className="list-decimal list-inside space-y-1 text-gray-700">
              <li>Click the yellow "Auth" button in the header</li>
              <li>Sign the authentication message in MetaMask</li>
              <li>Your donation history will then be available</li>
            </ol>
          </div>
        </div>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="card">
        <h2 className="text-xl font-semibold mb-4">Donation History</h2>
        <div className="flex justify-center py-8">
          <LoadingSpinner />
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="card">
        <h2 className="text-xl font-semibold mb-4">Donation History</h2>
        <div className="text-center py-8 text-red-500">
          <div className="text-4xl mb-4">⚠️</div>
          <p>{error}</p>
          <button 
            onClick={() => loadDonations(1, false)}
            className="btn-secondary mt-4"
          >
            Try Again
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="card">
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-xl font-semibold">Donation History</h2>
        {statistics && (
          <div className="text-sm text-gray-600">
            {statistics.donationCount} donations • {formatCurrency(statistics.totalDonated)} total
          </div>
        )}
      </div>

      {donations.length === 0 ? (
        <div className="text-center py-8 text-gray-500">
          <div className="text-4xl mb-4">📋</div>
          <p>No donations yet. Make your first donation to get started!</p>
        </div>
      ) : (
        <div className="space-y-4">
          {/* Summary Stats */}
          {statistics && (
            <div className="bg-gray-50 p-4 rounded-lg grid grid-cols-3 gap-4 text-center">
              <div>
                <div className="text-lg font-semibold">{statistics.donationCount}</div>
                <div className="text-sm text-gray-600">Total Donations</div>
              </div>
              <div>
                <div className="text-lg font-semibold">{formatCurrency(statistics.totalDonated)}</div>
                <div className="text-sm text-gray-600">Total Amount</div>
              </div>
              <div>
                <div className="text-lg font-semibold">{formatCurrency(statistics.averageDonation)}</div>
                <div className="text-sm text-gray-600">Average Donation</div>
              </div>
            </div>
          )}

          {/* Donations List */}
          <div className="space-y-3">
            {donations.map((donation, index) => (
              <div key={donation.id || index} className="border rounded-lg p-4 hover:bg-gray-50 transition-colors">
                <div className="flex justify-between items-start">
                  <div className="flex-1">
                    <div className="flex items-center space-x-3 mb-2">
                      <span className="text-lg font-semibold">
                        {formatCurrency(donation.amount)}
                      </span>
                      <span className={`px-2 py-1 rounded-full text-xs font-medium ${getStatusColor(donation.status)}`}>
                        {donation.status}
                      </span>
                    </div>
                    
                    <div className="text-sm text-gray-600 space-y-1">
                      <div className="flex items-center space-x-4">
                        <span>📅 {formatDate(donation.timestamp)}</span>
                        {donation.transactionHash && (
                          <button
                            onClick={() => openTransaction(donation.transactionHash)}
                            className="text-blue-600 hover:text-blue-800 flex items-center space-x-1"
                          >
                            <span>🔗 {truncateHash(donation.transactionHash)}</span>
                          </button>
                        )}
                      </div>
                      
                      {donation.metadata?.message && (
                        <div className="text-gray-700 italic">
                          "{donation.metadata.message}"
                        </div>
                      )}
                    </div>
                  </div>
                  
                  <div className="text-right">
                    <div className="text-xs text-gray-500">
                      ID: {donation.id?.slice(-8) || 'N/A'}
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>

          {/* Load More Button */}
          {pagination?.hasNextPage && (
            <div className="text-center pt-4">
              <button
                onClick={handleLoadMore}
                disabled={loadingMore}
                className="btn-secondary flex items-center justify-center mx-auto"
              >
                {loadingMore ? (
                  <>
                    <LoadingSpinner size="sm" />
                    Loading...
                  </>
                ) : (
                  `Load More (${pagination.totalCount - donations.length} remaining)`
                )}
              </button>
            </div>
          )}

          {/* Pagination Info */}
          {pagination && (
            <div className="text-center text-sm text-gray-500 pt-4 border-t">
              Showing {donations.length} of {pagination.totalCount} donations
              {pagination.totalPages > 1 && (
                <span> • Page {pagination.currentPage} of {pagination.totalPages}</span>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default DonationHistory;