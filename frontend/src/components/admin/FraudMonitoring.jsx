import React, { useState, useEffect } from 'react';
import { useApi } from '../../hooks/useApi';

const FraudMonitoring = () => {
  const [activeTab, setActiveTab] = useState('reports');
  const [fraudReports, setFraudReports] = useState([]);
  const [flaggedTransactions, setFlaggedTransactions] = useState([]);
  const [statistics, setStatistics] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [filters, setFilters] = useState({
    status: '',
    severity: '',
    timeframe: '30d'
  });

  const apiClient = useApi();

  useEffect(() => {
    loadData();
  }, [filters]);

  const loadData = async () => {
    try {
      setLoading(true);
      setError('');

      const [reportsResponse, transactionsResponse, statsResponse] = await Promise.all([
        apiClient.fraud.getReports(filters),
        apiClient.fraud.getFlaggedTransactions(),
        apiClient.fraud.getStatistics(filters.timeframe)
      ]);

      setFraudReports(reportsResponse.data.reports || []);
      setFlaggedTransactions(transactionsResponse.data.flaggedTransactions || []);
      setStatistics(statsResponse.data);

    } catch (error) {
      console.error('Load fraud data error:', error);
      setError('Failed to load fraud monitoring data');
    } finally {
      setLoading(false);
    }
  };

  const handleReportAction = async (reportId, action, data = {}) => {
    try {
      switch (action) {
        case 'assign':
          await apiClient.fraud.assignReport(reportId, data.investigatorAddress);
          break;
        case 'investigate':
          await apiClient.fraud.updateInvestigation(reportId, data);
          break;
        case 'resolve':
          await apiClient.fraud.resolveReport(reportId, data);
          break;
      }
      
      await loadData(); // Reload data after action
    } catch (error) {
      console.error(`${action} report error:`, error);
      setError(`Failed to ${action} report`);
    }
  };

  const handleTransactionReview = async (transactionId, decision, notes) => {
    try {
      await apiClient.fraud.reviewTransaction(transactionId, { decision, notes });
      await loadData(); // Reload data after review
    } catch (error) {
      console.error('Review transaction error:', error);
      setError('Failed to review transaction');
    }
  };

  const getSeverityColor = (severity) => {
    switch (severity) {
      case 'critical': return 'text-red-800 bg-red-100';
      case 'high': return 'text-orange-800 bg-orange-100';
      case 'medium': return 'text-yellow-800 bg-yellow-100';
      case 'low': return 'text-green-800 bg-green-100';
      default: return 'text-gray-800 bg-gray-100';
    }
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'pending': return 'text-yellow-800 bg-yellow-100';
      case 'under_investigation': return 'text-blue-800 bg-blue-100';
      case 'resolved': return 'text-green-800 bg-green-100';
      case 'dismissed': return 'text-gray-800 bg-gray-100';
      case 'escalated': return 'text-red-800 bg-red-100';
      default: return 'text-gray-800 bg-gray-100';
    }
  };

  const getRiskLevelColor = (riskLevel) => {
    switch (riskLevel) {
      case 'critical': return 'text-red-800 bg-red-100';
      case 'high': return 'text-orange-800 bg-orange-100';
      case 'medium': return 'text-yellow-800 bg-yellow-100';
      case 'low': return 'text-green-800 bg-green-100';
      default: return 'text-gray-800 bg-gray-100';
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <h2 className="text-2xl font-bold text-gray-900">Fraud Monitoring</h2>
        <div className="flex space-x-4">
          <select
            value={filters.timeframe}
            onChange={(e) => setFilters(prev => ({ ...prev, timeframe: e.target.value }))}
            className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
          >
            <option value="7d">Last 7 days</option>
            <option value="30d">Last 30 days</option>
            <option value="90d">Last 90 days</option>
          </select>
        </div>
      </div>

      {/* Statistics Cards */}
      {statistics && (
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
          <div className="bg-white p-6 rounded-lg shadow">
            <h3 className="text-sm font-medium text-gray-500">Total Reports</h3>
            <p className="text-2xl font-bold text-gray-900">{statistics.summary?.totalReports || 0}</p>
          </div>
          <div className="bg-white p-6 rounded-lg shadow">
            <h3 className="text-sm font-medium text-gray-500">Flagged Transactions</h3>
            <p className="text-2xl font-bold text-gray-900">{statistics.summary?.totalFlaggedTransactions || 0}</p>
          </div>
          <div className="bg-white p-6 rounded-lg shadow">
            <h3 className="text-sm font-medium text-gray-500">Avg Resolution Time</h3>
            <p className="text-2xl font-bold text-gray-900">{Math.round(statistics.summary?.avgResolutionTime || 0)}d</p>
          </div>
          <div className="bg-white p-6 rounded-lg shadow">
            <h3 className="text-sm font-medium text-gray-500">Flagged Vendors</h3>
            <p className="text-2xl font-bold text-gray-900">{statistics.fraudDetection?.flaggedVendors?.total || 0}</p>
          </div>
        </div>
      )}

      {/* Error Display */}
      {error && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-4">
          <div className="flex">
            <svg className="w-5 h-5 text-red-400 mr-2" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
            </svg>
            <p className="text-sm text-red-700">{error}</p>
          </div>
        </div>
      )}

      {/* Tabs */}
      <div className="border-b border-gray-200">
        <nav className="-mb-px flex space-x-8">
          <button
            onClick={() => setActiveTab('reports')}
            className={`py-2 px-1 border-b-2 font-medium text-sm ${
              activeTab === 'reports'
                ? 'border-blue-500 text-blue-600'
                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
            }`}
          >
            Fraud Reports ({fraudReports.length})
          </button>
          <button
            onClick={() => setActiveTab('transactions')}
            className={`py-2 px-1 border-b-2 font-medium text-sm ${
              activeTab === 'transactions'
                ? 'border-blue-500 text-blue-600'
                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
            }`}
          >
            Flagged Transactions ({flaggedTransactions.length})
          </button>
        </nav>
      </div>

      {/* Content */}
      {activeTab === 'reports' && (
        <div className="bg-white rounded-lg shadow overflow-hidden">
          <div className="px-6 py-4 border-b border-gray-200">
            <h3 className="text-lg font-medium text-gray-900">Fraud Reports</h3>
          </div>
          
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Report ID
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Entity
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Type
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Severity
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Status
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Created
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {fraudReports.map((report) => (
                  <tr key={report._id} className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                      {report.reportId}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      <div>
                        <div className="font-medium">{report.entityType}</div>
                        <div className="text-xs text-gray-400">
                          {report.reportedEntity?.slice(0, 10)}...{report.reportedEntity?.slice(-8)}
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {report.reportType?.replace('_', ' ')}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${getSeverityColor(report.severity)}`}>
                        {report.severity}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${getStatusColor(report.status)}`}>
                        {report.status?.replace('_', ' ')}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {new Date(report.createdAt).toLocaleDateString()}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                      <button
                        onClick={() => {/* Open report details modal */}}
                        className="text-blue-600 hover:text-blue-900 mr-3"
                      >
                        View
                      </button>
                      {report.status === 'pending' && (
                        <button
                          onClick={() => handleReportAction(report.reportId, 'investigate', { status: 'under_investigation' })}
                          className="text-green-600 hover:text-green-900"
                        >
                          Investigate
                        </button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {activeTab === 'transactions' && (
        <div className="bg-white rounded-lg shadow overflow-hidden">
          <div className="px-6 py-4 border-b border-gray-200">
            <h3 className="text-lg font-medium text-gray-900">Flagged Transactions</h3>
          </div>
          
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Transaction Hash
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    From/To
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Amount
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
                {flaggedTransactions.map((tx) => (
                  <tr key={tx.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-mono text-gray-900">
                      {tx.txHash?.slice(0, 10)}...{tx.txHash?.slice(-8)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      <div className="text-xs">
                        <div>From: {tx.from?.slice(0, 8)}...{tx.from?.slice(-6)}</div>
                        <div>To: {tx.to?.slice(0, 8)}...{tx.to?.slice(-6)}</div>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {tx.amount} ETH
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${getRiskLevelColor(tx.riskLevel)}`}>
                        {tx.riskLevel}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-500">
                      <div className="max-w-xs">
                        {tx.fraudFlags?.map((flag, index) => (
                          <div key={index} className="text-xs text-red-600 mb-1">
                            {flag.description}
                          </div>
                        ))}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                      {tx.requiresReview ? (
                        <div className="flex space-x-2">
                          <button
                            onClick={() => handleTransactionReview(tx.id, 'approve', 'Approved after review')}
                            className="text-green-600 hover:text-green-900"
                          >
                            Approve
                          </button>
                          <button
                            onClick={() => handleTransactionReview(tx.id, 'reject', 'Rejected due to fraud risk')}
                            className="text-red-600 hover:text-red-900"
                          >
                            Reject
                          </button>
                        </div>
                      ) : (
                        <span className="text-gray-400">No action needed</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
};

export default FraudMonitoring;