import React, { useState, useEffect } from 'react';
import { CheckCircle, Clock, XCircle, AlertCircle, ExternalLink } from 'lucide-react';
import useWebSocket from '../../hooks/useWebSocket';

const RealTimeTransactionStatus = ({ transactionHash, onStatusChange }) => {
  const [status, setStatus] = useState('pending');
  const [details, setDetails] = useState(null);
  const { subscribe } = useWebSocket();

  useEffect(() => {
    if (!transactionHash) return;

    // Subscribe to transaction updates
    const unsubscribe = subscribe('transaction-update', (data) => {
      if (data.transactionHash === transactionHash) {
        setStatus(data.status);
        setDetails(data);
        
        if (onStatusChange) {
          onStatusChange(data.status, data);
        }
      }
    });

    return unsubscribe;
  }, [transactionHash, subscribe, onStatusChange]);

  const getStatusIcon = () => {
    switch (status) {
      case 'confirmed':
        return <CheckCircle className="w-5 h-5 text-green-500" />;
      case 'failed':
        return <XCircle className="w-5 h-5 text-red-500" />;
      case 'pending':
        return <Clock className="w-5 h-5 text-yellow-500 animate-spin" />;
      default:
        return <AlertCircle className="w-5 h-5 text-gray-500" />;
    }
  };

  const getStatusText = () => {
    switch (status) {
      case 'confirmed':
        return 'Confirmed';
      case 'failed':
        return 'Failed';
      case 'pending':
        return 'Pending';
      default:
        return 'Unknown';
    }
  };

  const getStatusColor = () => {
    switch (status) {
      case 'confirmed':
        return 'text-green-700 bg-green-100 border-green-200';
      case 'failed':
        return 'text-red-700 bg-red-100 border-red-200';
      case 'pending':
        return 'text-yellow-700 bg-yellow-100 border-yellow-200';
      default:
        return 'text-gray-700 bg-gray-100 border-gray-200';
    }
  };

  const getExplorerUrl = () => {
    const network = import.meta.env.VITE_NETWORK || 'localhost';
    if (network === 'sepolia') {
      return `https://sepolia.etherscan.io/tx/${transactionHash}`;
    } else if (network === 'mainnet') {
      return `https://etherscan.io/tx/${transactionHash}`;
    }
    return null;
  };

  if (!transactionHash) {
    return null;
  }

  return (
    <div className={`inline-flex items-center space-x-2 px-3 py-2 rounded-lg border ${getStatusColor()}`}>
      {getStatusIcon()}
      <span className="text-sm font-medium">{getStatusText()}</span>
      
      {details && details.blockNumber && (
        <span className="text-xs opacity-75">
          Block #{details.blockNumber}
        </span>
      )}
      
      {getExplorerUrl() && (
        <a
          href={getExplorerUrl()}
          target="_blank"
          rel="noopener noreferrer"
          className="text-blue-600 hover:text-blue-800"
          title="View on block explorer"
        >
          <ExternalLink className="w-4 h-4" />
        </a>
      )}
    </div>
  );
};

export default RealTimeTransactionStatus;