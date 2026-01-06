import React, { useState, useEffect } from 'react';
import { useApi } from '../../hooks/useApi';
import LoadingSpinner from '../common/LoadingSpinner';
import toast from 'react-hot-toast';

const TransactionHistory = () => {
  const [transactions, setTransactions] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [filters, setFilters] = useState({
    category: '',
    status: '',
    page: 1,
    limit: 20
  });
  const [pagination, setPagination] = useState({});
  const [summary, setSummary] = useState({});
  const [selectedTransaction, setSelectedTransaction] = useState(null);
  const [showReceiptModal, setShowReceiptModal] = useState(false);

  const { vendor } = useApi();

  const categories = [
    { value: '', label: 'All Categories' },
    { value: 'food', label: 'Food & Beverages' },
    { value: 'medicine', label: 'Medicine & Healthcare' },
    { value: 'shelter', label: 'Shelter & Housing' },
    { value: 'clothing', label: 'Clothing & Textiles' },
    { value: 'water', label: 'Water & Sanitation' },
    { value: 'hygiene', label: 'Hygiene & Personal Care' },
    { value: 'emergency_supplies', label: 'Emergency Supplies' }
  ];

  const statuses = [
    { value: '', label: 'All Statuses' },
    { value: 'pending', label: 'Pending' },
    { value: 'confirmed', label: 'Confirmed' },
    { value: 'failed', label: 'Failed' }
  ];

  useEffect(() => {
    loadTransactions();
  }, [filters]);

  const loadTransactions = async () => {
    setIsLoading(true);
    try {
      const response = await vendor.getTransactions(filters);
      setTransactions(response.data.transactions);
      setPagination(response.data.pagination);
      setSummary(response.data.summary);
    } catch (error) {
      toast.error('Failed to load transaction history');
    } finally {
      setIsLoading(false);
    }
  };

  const handleFilterChange = (field, value) => {
    setFilters(prev => ({
      ...prev,
      [field]: value,
      page: 1 // Reset to first page when filtering
    }));
  };

  const handlePageChange = (newPage) => {
    setFilters(prev => ({
      ...prev,
      page: newPage
    }));
  };

  const generateReceipt = async (transaction) => {
    try {
      const response = await vendor.generateReceipt(transaction.id);
      
      // Create receipt data
      const receiptData = {
        receiptNumber: `RCP-${transaction.id.slice(-8).toUpperCase()}`,
        transactionId: transaction.id,
        date: new Date(transaction.timestamp).toLocaleDateString(),
        time: new Date(transaction.timestamp).toLocaleTimeString(),
        beneficiary: transaction.beneficiaryName || 'Anonymous Beneficiary',
        vendor: response.data.vendorName,
        amount: transaction.amount,
        category: transaction.category,
        items: response.data.items || [],
        transactionHash: transaction.transactionHash,
        status: transaction.status
      };

      setSelectedTransaction(receiptData);
      setShowReceiptModal(true);
    } catch (error) {
      toast.error('Failed to generate receipt');
    }
  };

  const downloadReceipt = () => {
    if (!selectedTransaction) return;

    const receiptContent = `
DISASTER RELIEF PAYMENT RECEIPT
================================

Receipt Number: ${selectedTransaction.receiptNumber}
Date: ${selectedTransaction.date} ${selectedTransaction.time}

VENDOR INFORMATION
------------------
Business: ${selectedTransaction.vendor}

BENEFICIARY INFORMATION
-----------------------
Name: ${selectedTransaction.beneficiary}

TRANSACTION DETAILS
-------------------
Amount: $${selectedTransaction.amount}
Category: ${selectedTransaction.category}
Status: ${selectedTransaction.status.toUpperCase()}

${selectedTransaction.items.length > 0 ? `
ITEMS PURCHASED
---------------
${selectedTransaction.items.map(item => 
  `${item.name} - Qty: ${item.quantity} - $${item.price}`
).join('\n')}
` : ''}

BLOCKCHAIN VERIFICATION
-----------------------
Transaction Hash: ${selectedTransaction.transactionHash}
Transaction ID: ${selectedTransaction.transactionId}

This receipt serves as proof of payment for disaster relief goods/services.
Verify transaction on blockchain using the transaction hash above.

Generated on: ${new Date().toLocaleString()}
    `.trim();

    const blob = new Blob([receiptContent], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `receipt-${selectedTransaction.receiptNumber}.txt`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    
    toast.success('Receipt downloaded successfully');
  };

  const getStatusBadge = (status) => {
    const statusConfig = {
      pending: { bg: 'bg-yellow-100', text: 'text-yellow-800', label: 'Pending' },
      confirmed: { bg: 'bg-green-100', text: 'text-green-800', label: 'Confirmed' },
      failed: { bg: 'bg-red-100', text: 'text-red-800', label: 'Failed' }
    };

    const config = statusConfig[status] || statusConfig.pending;
    return (
      <span className={`px-2 py-1 text-xs font-medium rounded-full ${config.bg} ${config.text}`}>
        {config.label}
      </span>
    );
  };

  if (isLoading && transactions.length === 0) {
    return (
      <div className="p-8">
        <LoadingSpinner />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Summary Statistics */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-white p-6 rounded-lg shadow-md">
          <div className="flex items-center">
            <div className="p-2 bg-green-100 rounded-lg">
              <span className="text-2xl">💰</span>
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-600">Total Revenue</p>
              <p className="text-2xl font-bold text-gray-900">
                ${(summary.totalAmount / Math.pow(10, 18) || 0).toFixed(2)}
              </p>
            </div>
          </div>
        </div>

        <div className="bg-white p-6 rounded-lg shadow-md">
          <div className="flex items-center">
            <div className="p-2 bg-blue-100 rounded-lg">
              <span className="text-2xl">📊</span>
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-600">Total Transactions</p>
              <p className="text-2xl font-bold text-gray-900">
                {summary.totalTransactions || 0}
              </p>
            </div>
          </div>
        </div>

        <div className="bg-white p-6 rounded-lg shadow-md">
          <div className="flex items-center">
            <div className="p-2 bg-purple-100 rounded-lg">
              <span className="text-2xl">📈</span>
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-600">Average Transaction</p>
              <p className="text-2xl font-bold text-gray-900">
                ${(summary.avgTransaction / Math.pow(10, 18) || 0).toFixed(2)}
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Filters */}
      <div className="bg-white rounded-lg shadow-md p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Transaction History</h3>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Category
            </label>
            <select
              value={filters.category}
              onChange={(e) => handleFilterChange('category', e.target.value)}
              className="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              {categories.map(category => (
                <option key={category.value} value={category.value}>
                  {category.label}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Status
            </label>
            <select
              value={filters.status}
              onChange={(e) => handleFilterChange('status', e.target.value)}
              className="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              {statuses.map(status => (
                <option key={status.value} value={status.value}>
                  {status.label}
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Transaction List */}
        {transactions.length === 0 ? (
          <div className="text-center py-8">
            <span className="text-4xl mb-4 block">💳</span>
            <p className="text-gray-500">No transactions found</p>
          </div>
        ) : (
          <div className="space-y-4">
            {transactions.map((transaction) => (
              <div key={transaction.id} className="border border-gray-200 rounded-lg p-4 hover:bg-gray-50">
                <div className="flex items-center justify-between">
                  <div className="flex-1">
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center space-x-4">
                        <span className="text-lg font-semibold text-gray-900">
                          ${transaction.amount}
                        </span>
                        {getStatusBadge(transaction.status)}
                      </div>
                      <div className="text-sm text-gray-500">
                        {new Date(transaction.timestamp).toLocaleDateString()} {new Date(transaction.timestamp).toLocaleTimeString()}
                      </div>
                    </div>
                    
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
                      <div>
                        <span className="font-medium text-gray-700">Category:</span>
                        <span className="ml-2 text-gray-600 capitalize">
                          {transaction.category.replace('_', ' ')}
                        </span>
                      </div>
                      
                      <div>
                        <span className="font-medium text-gray-700">Beneficiary:</span>
                        <span className="ml-2 text-gray-600">
                          {transaction.beneficiaryName || 'Anonymous'}
                        </span>
                      </div>
                      
                      <div>
                        <span className="font-medium text-gray-700">Transaction ID:</span>
                        <span className="ml-2 text-gray-600 font-mono text-xs">
                          {transaction.id.slice(0, 8)}...{transaction.id.slice(-8)}
                        </span>
                      </div>
                    </div>

                    {transaction.description && (
                      <div className="mt-2 text-sm">
                        <span className="font-medium text-gray-700">Description:</span>
                        <span className="ml-2 text-gray-600">{transaction.description}</span>
                      </div>
                    )}
                  </div>

                  <div className="ml-4 flex flex-col space-y-2">
                    <button
                      onClick={() => generateReceipt(transaction)}
                      className="btn-secondary text-sm"
                      disabled={transaction.status !== 'confirmed'}
                    >
                      📄 Receipt
                    </button>
                    
                    {transaction.transactionHash && (
                      <a
                        href={`https://etherscan.io/tx/${transaction.transactionHash}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="btn-secondary text-sm text-center"
                      >
                        🔗 View on Chain
                      </a>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Pagination */}
        {pagination.pages > 1 && (
          <div className="flex items-center justify-between mt-6">
            <div className="text-sm text-gray-700">
              Showing {((pagination.page - 1) * pagination.limit) + 1} to {Math.min(pagination.page * pagination.limit, pagination.total)} of {pagination.total} transactions
            </div>
            
            <div className="flex space-x-2">
              <button
                onClick={() => handlePageChange(pagination.page - 1)}
                disabled={pagination.page <= 1}
                className="btn-secondary text-sm disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Previous
              </button>
              
              <span className="px-3 py-2 text-sm text-gray-700">
                Page {pagination.page} of {pagination.pages}
              </span>
              
              <button
                onClick={() => handlePageChange(pagination.page + 1)}
                disabled={pagination.page >= pagination.pages}
                className="btn-secondary text-sm disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Next
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Receipt Modal */}
      {showReceiptModal && selectedTransaction && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg shadow-xl max-w-2xl w-full mx-4 max-h-[90vh] overflow-y-auto">
            <div className="p-6">
              <div className="flex items-center justify-between mb-6">
                <h3 className="text-xl font-semibold text-gray-900">Payment Receipt</h3>
                <button
                  onClick={() => setShowReceiptModal(false)}
                  className="text-gray-400 hover:text-gray-600"
                >
                  ✕
                </button>
              </div>

              <div className="bg-gray-50 p-6 rounded-lg font-mono text-sm">
                <div className="text-center mb-6">
                  <h4 className="text-lg font-bold">DISASTER RELIEF PAYMENT RECEIPT</h4>
                  <div className="border-b border-gray-300 my-2"></div>
                </div>

                <div className="space-y-4">
                  <div>
                    <strong>Receipt Number:</strong> {selectedTransaction.receiptNumber}
                  </div>
                  <div>
                    <strong>Date:</strong> {selectedTransaction.date} {selectedTransaction.time}
                  </div>

                  <div className="border-b border-gray-300 my-4"></div>
                  
                  <div>
                    <strong>VENDOR INFORMATION</strong><br />
                    Business: {selectedTransaction.vendor}
                  </div>

                  <div>
                    <strong>BENEFICIARY INFORMATION</strong><br />
                    Name: {selectedTransaction.beneficiary}
                  </div>

                  <div className="border-b border-gray-300 my-4"></div>

                  <div>
                    <strong>TRANSACTION DETAILS</strong><br />
                    Amount: ${selectedTransaction.amount}<br />
                    Category: {selectedTransaction.category}<br />
                    Status: {selectedTransaction.status.toUpperCase()}
                  </div>

                  {selectedTransaction.items && selectedTransaction.items.length > 0 && (
                    <div>
                      <strong>ITEMS PURCHASED</strong><br />
                      {selectedTransaction.items.map((item, index) => (
                        <div key={index}>
                          {item.name} - Qty: {item.quantity} - ${item.price}
                        </div>
                      ))}
                    </div>
                  )}

                  <div className="border-b border-gray-300 my-4"></div>

                  <div>
                    <strong>BLOCKCHAIN VERIFICATION</strong><br />
                    Transaction Hash: {selectedTransaction.transactionHash}<br />
                    Transaction ID: {selectedTransaction.transactionId}
                  </div>

                  <div className="text-xs text-gray-600 mt-4">
                    This receipt serves as proof of payment for disaster relief goods/services.<br />
                    Verify transaction on blockchain using the transaction hash above.
                  </div>
                </div>
              </div>

              <div className="flex justify-end space-x-4 mt-6">
                <button
                  onClick={() => setShowReceiptModal(false)}
                  className="btn-secondary"
                >
                  Close
                </button>
                <button
                  onClick={downloadReceipt}
                  className="btn-primary"
                >
                  📥 Download Receipt
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default TransactionHistory;