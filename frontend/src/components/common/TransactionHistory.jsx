import React, { useState, useEffect } from 'react';
import { useTransactionStatus } from '../../hooks/useTransactionStatus';
import { useContractEvents } from '../../hooks/useContractEvents';
import LoadingSpinner from './LoadingSpinner';

const TransactionHistory = ({ 
  limit = 10, 
  showFilters = true,
  className = '',
  userAddress = null 
}) => {
  const { transactions, getTransactionsByStatus } = useTransactionStatus();
  const { events, getEventsByType } = useContractEvents();
  const [filter, setFilter] = useState('all');
  const [displayData, setDisplayData] = useState([]);

  // Combine transaction status data with blockchain events
  useEffect(() => {
    let combined = [];

    // Add tracked transactions
    transactions.forEach(tx => {
      combined.push({
        id: tx.hash,
        type: 'transaction',
        hash: tx.hash,
        description: tx.description,
        status: tx.status,
        timestamp: tx.timestamp,
        confirmations: tx.confirmations || 0,
        gasUsed: tx.gasUsed,
        blockNumber: tx.blockNumber,
      });
    });

    // Add blockchain events
    events.forEach(event => {
      // Filter by user address if provided
      if (userAddress) {
        const isUserRelated = 
          event.donor === userAddress ||
          event.beneficiary === userAddress ||
          event.to === userAddress ||
          event.minter === userAddress;
        
        if (!isUserRelated) return;
      }

      combined.push({
        id: event.id,
        type: 'event',
        eventType: event.type,
        hash: event.transactionHash,
        timestamp: event.timestamp,
        blockNumber: event.blockNumber,
        data: event,
      });
    });

    // Sort by timestamp (newest first)
    combined.sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));

    // Apply filters
    if (filter !== 'all') {
      combined = combined.filter(item => {
        if (filter === 'pending') return item.status === 'pending';
        if (filter === 'confirmed') return item.status === 'confirmed' || item.status === 'finalized';
        if (filter === 'failed') return item.status === 'failed' || item.status === 'error';
        if (filter === 'donations') return item.eventType === 'donation';
        if (filter === 'registrations') return item.eventType === 'beneficiary_registered';
        if (filter === 'minting') return item.eventType === 'tokens_minted';
        return true;
      });
    }

    // Apply limit
    setDisplayData(combined.slice(0, limit));
  }, [transactions, events, filter, limit, userAddress]);

  const getStatusBadge = (status) => {
    const badges = {
      pending: 'bg-yellow-100 text-yellow-800',
      confirmed: 'bg-green-100 text-green-800',
      finalized: 'bg-blue-100 text-blue-800',
      failed: 'bg-red-100 text-red-800',
      error: 'bg-red-100 text-red-800',
    };

    return (
      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${badges[status] || 'bg-gray-100 text-gray-800'}`}>
        {status || 'unknown'}
      </span>
    );
  };

  const getEventDescription = (item) => {
    if (item.type === 'transaction') {
      return item.description;
    }

    const { eventType, data } = item;
    switch (eventType) {
      case 'donation':
        return `Donation of ${data.amount} ETH received`;
      case 'beneficiary_registered':
        return `Beneficiary "${data.name}" registered`;
      case 'tokens_minted':
        return `${data.amount} tokens minted for ${data.purpose}`;
      default:
        return `${eventType} event`;
    }
  };

  const formatTimestamp = (timestamp) => {
    return new Date(timestamp).toLocaleString();
  };

  const truncateHash = (hash) => {
    if (!hash) return 'N/A';
    return `${hash.slice(0, 6)}...${hash.slice(-4)}`;
  };

  if (displayData.length === 0) {
    return (
      <div className={`bg-white rounded-lg shadow p-6 ${className}`}>
        <h3 className="text-lg font-medium text-gray-900 mb-4">Transaction History</h3>
        <div className="text-center py-8">
          <p className="text-gray-500">No transactions found</p>
        </div>
      </div>
    );
  }

  return (
    <div className={`bg-white rounded-lg shadow ${className}`}>
      <div className="px-6 py-4 border-b border-gray-200">
        <div className="flex items-center justify-between">
          <h3 className="text-lg font-medium text-gray-900">Transaction History</h3>
          {showFilters && (
            <select
              value={filter}
              onChange={(e) => setFilter(e.target.value)}
              className="text-sm border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
            >
              <option value="all">All</option>
              <option value="pending">Pending</option>
              <option value="confirmed">Confirmed</option>
              <option value="failed">Failed</option>
              <option value="donations">Donations</option>
              <option value="registrations">Registrations</option>
              <option value="minting">Token Minting</option>
            </select>
          )}
        </div>
      </div>

      <div className="divide-y divide-gray-200">
        {displayData.map((item) => (
          <div key={item.id} className="px-6 py-4 hover:bg-gray-50">
            <div className="flex items-center justify-between">
              <div className="flex-1 min-w-0">
                <div className="flex items-center space-x-3">
                  <div className="flex-1">
                    <p className="text-sm font-medium text-gray-900 truncate">
                      {getEventDescription(item)}
                    </p>
                    <div className="flex items-center space-x-4 mt-1">
                      <p className="text-xs text-gray-500">
                        Hash: {truncateHash(item.hash)}
                      </p>
                      {item.blockNumber && (
                        <p className="text-xs text-gray-500">
                          Block: {item.blockNumber}
                        </p>
                      )}
                      {item.confirmations > 0 && (
                        <p className="text-xs text-gray-500">
                          {item.confirmations} confirmations
                        </p>
                      )}
                    </div>
                  </div>
                </div>
              </div>
              <div className="flex items-center space-x-3">
                <div className="text-right">
                  <p className="text-xs text-gray-500">
                    {formatTimestamp(item.timestamp)}
                  </p>
                  {item.gasUsed && (
                    <p className="text-xs text-gray-400">
                      Gas: {item.gasUsed.toLocaleString()}
                    </p>
                  )}
                </div>
                {item.status && getStatusBadge(item.status)}
              </div>
            </div>
          </div>
        ))}
      </div>

      {displayData.length === limit && (
        <div className="px-6 py-3 bg-gray-50 text-center">
          <p className="text-sm text-gray-500">
            Showing {limit} most recent transactions
          </p>
        </div>
      )}
    </div>
  );
};

export default TransactionHistory;