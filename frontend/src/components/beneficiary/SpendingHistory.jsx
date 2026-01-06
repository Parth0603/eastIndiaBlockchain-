import React, { useState, useEffect } from 'react';
import { useApi } from '../../hooks/useApi';
import LoadingSpinner from '../common/LoadingSpinner';

const CATEGORY_ICONS = {
  food: '🍽️',
  medicine: '💊',
  shelter: '🏠',
  clothing: '👕',
};

const CATEGORY_NAMES = {
  food: 'Food & Water',
  medicine: 'Medicine & Healthcare',
  shelter: 'Shelter & Housing',
  clothing: 'Clothing & Personal Items',
};

const STATUS_COLORS = {
  pending: 'bg-yellow-100 text-yellow-800',
  confirmed: 'bg-green-100 text-green-800',
  failed: 'bg-red-100 text-red-800',
};

const SpendingHistory = () => {
  const [transactions, setTransactions] = useState([]);
  const [filteredTransactions, setFilteredTransactions] = useState([]);
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [selectedStatus, setSelectedStatus] = useState('all');
  const [sortBy, setSortBy] = useState('date');
  const [sortOrder, setSortOrder] = useState('desc');
  const [currentPage, setCurrentPage] = useState(1);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const { beneficiary, isLoading } = useApi();

  const itemsPerPage = 10;

  const fetchSpendingHistory = async () => {
    try {
      setIsRefreshing(true);
      const historyData = await beneficiary.getSpendingHistory();
      setTransactions(historyData.transactions || []);
    } catch (error) {
      console.error('Error fetching spending history:', error);
      setTransactions([]);
    } finally {
      setIsRefreshing(false);
    }
  };

  useEffect(() => {
    fetchSpendingHistory();
  }, []);

  // Filter and sort transactions
  useEffect(() => {
    let filtered = [...transactions];

    // Filter by category
    if (selectedCategory !== 'all') {
      filtered = filtered.filter(tx => tx.category === selectedCategory);
    }

    // Filter by status
    if (selectedStatus !== 'all') {
      filtered = filtered.filter(tx => tx.status === selectedStatus);
    }

    // Sort transactions
    filtered.sort((a, b) => {
      let aValue, bValue;
      
      switch (sortBy) {
        case 'date':
          aValue = new Date(a.timestamp);
          bValue = new Date(b.timestamp);
          break;
        case 'amount':
          aValue = a.amount;
          bValue = b.amount;
          break;
        case 'vendor':
          aValue = a.vendorName.toLowerCase();
          bValue = b.vendorName.toLowerCase();
          break;
        default:
          aValue = new Date(a.timestamp);
          bValue = new Date(b.timestamp);
      }

      if (sortOrder === 'asc') {
        return aValue > bValue ? 1 : -1;
      } else {
        return aValue < bValue ? 1 : -1;
      }
    });

    setFilteredTransactions(filtered);
    setCurrentPage(1); // Reset to first page when filters change
  }, [transactions, selectedCategory, selectedStatus, sortBy, sortOrder]);

  // Pagination
  const totalPages = Math.ceil(filteredTransactions.length / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const paginatedTransactions = filteredTransactions.slice(startIndex, startIndex + itemsPerPage);

  const formatDate = (timestamp) => {
    return new Date(timestamp).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const getTotalSpent = () => {
    return filteredTransactions
      .filter(tx => tx.status === 'confirmed')
      .reduce((sum, tx) => sum + tx.amount, 0);
  };

  if (isLoading && transactions.length === 0) {
    return (
      <div className="card">
        <h2 className="text-xl font-semibold mb-4">Spending History</h2>
        <div className="flex justify-center py-8">
          <LoadingSpinner />
        </div>
      </div>
    );
  }

  return (
    <div className="card">
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-xl font-semibold">Spending History</h2>
        <button
          onClick={fetchSpendingHistory}
          disabled={isRefreshing}
          className="text-blue-600 hover:text-blue-800 text-sm font-medium disabled:opacity-50"
        >
          {isRefreshing ? 'Refreshing...' : 'Refresh'}
        </button>
      </div>

      {/* Summary Stats */}
      {filteredTransactions.length > 0 && (
        <div className="grid grid-cols-3 gap-4 mb-6 p-4 bg-gray-50 rounded-lg">
          <div className="text-center">
            <div className="text-2xl font-bold text-gray-900">{filteredTransactions.length}</div>
            <div className="text-sm text-gray-600">Total Transactions</div>
          </div>
          <div className="text-center">
            <div className="text-2xl font-bold text-green-600">${getTotalSpent().toFixed(2)}</div>
            <div className="text-sm text-gray-600">Total Spent</div>
          </div>
          <div className="text-center">
            <div className="text-2xl font-bold text-blue-600">
              {filteredTransactions.filter(tx => tx.status === 'confirmed').length}
            </div>
            <div className="text-sm text-gray-600">Confirmed</div>
          </div>
        </div>
      )}

      {/* Filters and Sorting */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Category</label>
          <select
            value={selectedCategory}
            onChange={(e) => setSelectedCategory(e.target.value)}
            className="input-field text-sm"
          >
            <option value="all">All Categories</option>
            {Object.entries(CATEGORY_NAMES).map(([key, name]) => (
              <option key={key} value={key}>{name}</option>
            ))}
          </select>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Status</label>
          <select
            value={selectedStatus}
            onChange={(e) => setSelectedStatus(e.target.value)}
            className="input-field text-sm"
          >
            <option value="all">All Statuses</option>
            <option value="pending">Pending</option>
            <option value="confirmed">Confirmed</option>
            <option value="failed">Failed</option>
          </select>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Sort By</label>
          <select
            value={sortBy}
            onChange={(e) => setSortBy(e.target.value)}
            className="input-field text-sm"
          >
            <option value="date">Date</option>
            <option value="amount">Amount</option>
            <option value="vendor">Vendor</option>
          </select>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Order</label>
          <select
            value={sortOrder}
            onChange={(e) => setSortOrder(e.target.value)}
            className="input-field text-sm"
          >
            <option value="desc">Newest First</option>
            <option value="asc">Oldest First</option>
          </select>
        </div>
      </div>

      {/* Transaction List */}
      {paginatedTransactions.length === 0 ? (
        <div className="text-center py-8 text-gray-500">
          <div className="text-4xl mb-4">🛒</div>
          <p>
            {transactions.length === 0 
              ? "No purchases yet. Use the spending interface above to make your first purchase."
              : "No transactions match your current filters."
            }
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {paginatedTransactions.map((transaction) => (
            <div
              key={transaction.id}
              className="border border-gray-200 rounded-lg p-4 hover:shadow-sm transition-shadow"
            >
              <div className="flex items-start justify-between">
                <div className="flex items-start space-x-3">
                  <div className="text-2xl">
                    {CATEGORY_ICONS[transaction.category] || '🛍️'}
                  </div>
                  <div className="flex-1">
                    <div className="flex items-center space-x-2 mb-1">
                      <h3 className="font-medium text-gray-900">{transaction.vendorName}</h3>
                      <span className={`px-2 py-1 rounded-full text-xs font-medium ${STATUS_COLORS[transaction.status]}`}>
                        {transaction.status.charAt(0).toUpperCase() + transaction.status.slice(1)}
                      </span>
                    </div>
                    <p className="text-sm text-gray-600 mb-1">{transaction.description}</p>
                    <div className="flex items-center space-x-4 text-xs text-gray-500">
                      <span>{CATEGORY_NAMES[transaction.category]}</span>
                      <span>•</span>
                      <span>{formatDate(transaction.timestamp)}</span>
                      {transaction.txHash && (
                        <>
                          <span>•</span>
                          <a
                            href={`https://etherscan.io/tx/${transaction.txHash}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-blue-600 hover:text-blue-800"
                          >
                            View on Blockchain
                          </a>
                        </>
                      )}
                    </div>
                  </div>
                </div>
                <div className="text-right">
                  <div className="text-lg font-semibold text-gray-900">
                    ${transaction.amount.toFixed(2)}
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-between mt-6">
          <div className="text-sm text-gray-700">
            Showing {startIndex + 1} to {Math.min(startIndex + itemsPerPage, filteredTransactions.length)} of {filteredTransactions.length} transactions
          </div>
          <div className="flex space-x-2">
            <button
              onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))}
              disabled={currentPage === 1}
              className="px-3 py-1 border border-gray-300 rounded text-sm disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-50"
            >
              Previous
            </button>
            <span className="px-3 py-1 text-sm text-gray-700">
              Page {currentPage} of {totalPages}
            </span>
            <button
              onClick={() => setCurrentPage(prev => Math.min(prev + 1, totalPages))}
              disabled={currentPage === totalPages}
              className="px-3 py-1 border border-gray-300 rounded text-sm disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-50"
            >
              Next
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default SpendingHistory;