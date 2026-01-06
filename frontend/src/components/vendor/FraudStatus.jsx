import React, { useState, useEffect } from 'react';
import { useApi } from '../../hooks/useApi';

const FraudStatus = () => {
  const [fraudStatus, setFraudStatus] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [showDisputeModal, setShowDisputeModal] = useState(false);
  const [selectedTransaction, setSelectedTransaction] = useState(null);

  const apiClient = useApi();

  useEffect(() => {
    loadFraudStatus();
  }, []);

  const loadFraudStatus = async () => {
    try {
      setLoading(true);
      setError('');
      
      const response = await apiClient.vendorFraud.getFraudStatus();
      setFraudStatus(response.data);
    } catch (error) {
      console.error('Load fraud status error:', error);
      setError('Failed to load fraud status');
    } finally {
      setLoading(false);
    }
  };

  const handleDispute = async (transactionId, disputeReason, evidence) => {
    try {
      await apiClient.vendorFraud.disputeFlag({
        transactionId,
        disputeReason,
        evidence
      });
      
      setShowDisputeModal(false);
      setSelectedTransaction(null);
      await loadFraudStatus(); // Reload status
    } catch (error) {
      console.error('Dispute flag error:', error);
      setError('Failed to submit dispute');
    }
  };

  const getRiskLevelColor = (riskLevel) => {
    switch (riskLevel) {
      case 'high': return 'text-red-800 bg-red-100 border-red-200';
      case 'medium': return 'text-yellow-800 bg-yellow-100 border-yellow-200';
      case 'low': return 'text-green-800 bg-green-100 border-green-200';
      default: return 'text-gray-800 bg-gray-100 border-gray-200';
    }
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'suspended': return 'text-red-800 bg-red-100';
      case 'under_review': return 'text-yellow-800 bg-yellow-100';
      case 'approved': return 'text-green-800 bg-green-100';
      default: return 'text-gray-800 bg-gray-100';
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-32">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-red-50 border border-red-200 rounded-lg p-4">
        <div className="flex">
          <svg className="w-5 h-5 text-red-400 mr-2" fill="currentColor" viewBox="0 0 20 20">
            <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
          </svg>
          <p className="text-sm text-red-700">{error}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Status Overview */}
      <div className="bg-white rounded-lg shadow p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Fraud Prevention Status</h3>
        
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {/* Account Status */}
          <div className="text-center">
            <div className="mb-2">
              <span className={`inline-flex px-3 py-1 text-sm font-semibold rounded-full ${getStatusColor(fraudStatus?.status)}`}>
                {fraudStatus?.status?.replace('_', ' ').toUpperCase()}
              </span>
            </div>
            <p className="text-sm text-gray-600">Account Status</p>
          </div>

          {/* Risk Level */}
          <div className="text-center">
            <div className="mb-2">
              <span className={`inline-flex px-3 py-1 text-sm font-semibold rounded-full border ${getRiskLevelColor(fraudStatus?.riskLevel)}`}>
                {fraudStatus?.riskLevel?.toUpperCase()} RISK
              </span>
            </div>
            <p className="text-sm text-gray-600">Risk Level</p>
          </div>

          {/* Suspicious Activity Count */}
          <div className="text-center">
            <div className="mb-2">
              <span className="text-2xl font-bold text-gray-900">
                {fraudStatus?.suspiciousActivityCount || 0}
              </span>
            </div>
            <p className="text-sm text-gray-600">Suspicious Activities</p>
          </div>
        </div>

        {/* Risk Level Explanation */}
        {fraudStatus?.riskLevel && (
          <div className="mt-6 p-4 bg-gray-50 rounded-lg">
            <h4 className="text-sm font-medium text-gray-900 mb-2">Risk Level Information</h4>
            <div className="text-sm text-gray-600">
              {fraudStatus.riskLevel === 'low' && (
                <p>✅ Your account is in good standing with no recent suspicious activity.</p>
              )}
              {fraudStatus.riskLevel === 'medium' && (
                <p>⚠️ Some suspicious activity has been detected. Please ensure all transactions are legitimate.</p>
              )}
              {fraudStatus.riskLevel === 'high' && (
                <p>🚨 Multiple suspicious activities detected. Your account may be subject to additional review.</p>
              )}
            </div>
          </div>
        )}

        {/* Last Suspicious Activity */}
        {fraudStatus?.lastSuspiciousActivity && (
          <div className="mt-4 text-sm text-gray-600">
            <strong>Last suspicious activity:</strong> {new Date(fraudStatus.lastSuspiciousActivity).toLocaleDateString()}
          </div>
        )}
      </div>

      {/* Flagged Transactions */}
      {fraudStatus?.flaggedTransactions && fraudStatus.flaggedTransactions.length > 0 && (
        <div className="bg-white rounded-lg shadow">
          <div className="px-6 py-4 border-b border-gray-200">
            <h3 className="text-lg font-semibold text-gray-900">Flagged Transactions</h3>
            <p className="text-sm text-gray-600 mt-1">
              Transactions that have been flagged by our fraud detection system
            </p>
          </div>
          
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Date
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Amount
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Category
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Risk Level
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Flags
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {fraudStatus.flaggedTransactions.map((transaction) => (
                  <tr key={transaction.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {new Date(transaction.createdAt).toLocaleDateString()}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {transaction.amount} ETH
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {transaction.category}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${getRiskLevelColor(transaction.riskLevel)}`}>
                        {transaction.riskLevel}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-500">
                      <div className="max-w-xs">
                        {transaction.flags?.map((flag, index) => (
                          <div key={index} className="text-xs text-red-600 mb-1">
                            • {flag}
                          </div>
                        ))}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                      <button
                        onClick={() => {
                          setSelectedTransaction(transaction);
                          setShowDisputeModal(true);
                        }}
                        className="text-blue-600 hover:text-blue-900"
                      >
                        Dispute
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Fraud Prevention Tips */}
      <div className="bg-blue-50 border border-blue-200 rounded-lg p-6">
        <h3 className="text-lg font-semibold text-blue-900 mb-4">Fraud Prevention Tips</h3>
        <div className="space-y-3 text-sm text-blue-800">
          <div className="flex items-start">
            <svg className="w-5 h-5 text-blue-600 mr-2 mt-0.5" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
            </svg>
            <p>Always verify beneficiary identity before processing transactions</p>
          </div>
          <div className="flex items-start">
            <svg className="w-5 h-5 text-blue-600 mr-2 mt-0.5" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
            </svg>
            <p>Report suspicious behavior or unusual transaction patterns</p>
          </div>
          <div className="flex items-start">
            <svg className="w-5 h-5 text-blue-600 mr-2 mt-0.5" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
            </svg>
            <p>Keep accurate records of all transactions and receipts</p>
          </div>
          <div className="flex items-start">
            <svg className="w-5 h-5 text-blue-600 mr-2 mt-0.5" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
            </svg>
            <p>Contact support immediately if you notice any irregularities</p>
          </div>
        </div>
      </div>

      {/* Dispute Modal */}
      {showDisputeModal && selectedTransaction && (
        <DisputeModal
          transaction={selectedTransaction}
          onSubmit={handleDispute}
          onClose={() => {
            setShowDisputeModal(false);
            setSelectedTransaction(null);
          }}
        />
      )}
    </div>
  );
};

// Dispute Modal Component
const DisputeModal = ({ transaction, onSubmit, onClose }) => {
  const [disputeReason, setDisputeReason] = useState('');
  const [evidence, setEvidence] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setIsSubmitting(true);
    
    try {
      await onSubmit(transaction.id, disputeReason, evidence);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg p-6 w-full max-w-md">
        <div className="flex justify-between items-center mb-4">
          <h3 className="text-lg font-semibold text-gray-900">Dispute Flag</h3>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600"
          >
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Transaction: {transaction.amount} ETH
            </label>
            <p className="text-sm text-gray-600">
              Flagged for: {transaction.flags?.join(', ')}
            </p>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Dispute Reason *
            </label>
            <textarea
              value={disputeReason}
              onChange={(e) => setDisputeReason(e.target.value)}
              required
              rows={3}
              placeholder="Explain why you believe this flag is incorrect..."
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Supporting Evidence (Optional)
            </label>
            <textarea
              value={evidence}
              onChange={(e) => setEvidence(e.target.value)}
              rows={2}
              placeholder="Any additional evidence or documentation..."
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>

          <div className="flex justify-end space-x-3 pt-4">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSubmitting || !disputeReason}
              className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isSubmitting ? 'Submitting...' : 'Submit Dispute'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default FraudStatus;