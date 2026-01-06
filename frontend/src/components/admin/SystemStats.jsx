import React, { useState, useEffect } from 'react';
import { useApi } from '../../hooks/useApi';
import LoadingSpinner from '../common/LoadingSpinner';

const SystemStats = () => {
  const [stats, setStats] = useState(null);
  const [systemHealth, setSystemHealth] = useState(null);
  const { admin, isLoading } = useApi();

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [statsData, healthData] = await Promise.all([
          admin.getStats(),
          admin.getSystemHealth()
        ]);
        setStats(statsData);
        setSystemHealth(healthData);
      } catch (error) {
        console.error('Failed to fetch system data:', error);
      }
    };

    fetchData();
    
    // Refresh data every 30 seconds
    const interval = setInterval(fetchData, 30000);
    return () => clearInterval(interval);
  }, [admin]);

  if (isLoading && !stats) {
    return <LoadingSpinner />;
  }

  const formatCurrency = (amount) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
    }).format(amount || 0);
  };

  const getHealthColor = (status) => {
    switch (status) {
      case 'healthy': return 'text-green-600';
      case 'warning': return 'text-yellow-600';
      case 'error': return 'text-red-600';
      default: return 'text-gray-600';
    }
  };

  return (
    <div className="space-y-6">
      {/* Key Metrics */}
      <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6">
        <div className="card text-center">
          <div className="text-3xl text-blue-600 mb-2">💰</div>
          <div className="text-2xl font-bold text-gray-900">
            {formatCurrency(stats?.totalDonations)}
          </div>
          <div className="text-gray-600">Total Donations</div>
          <div className="text-sm text-gray-500 mt-1">
            {stats?.donationCount || 0} transactions
          </div>
        </div>

        <div className="card text-center">
          <div className="text-3xl text-green-600 mb-2">👥</div>
          <div className="text-2xl font-bold text-gray-900">
            {stats?.activeBeneficiaries || 0}
          </div>
          <div className="text-gray-600">Active Beneficiaries</div>
          <div className="text-sm text-gray-500 mt-1">
            {stats?.pendingApplications || 0} pending
          </div>
        </div>

        <div className="card text-center">
          <div className="text-3xl text-purple-600 mb-2">🏪</div>
          <div className="text-2xl font-bold text-gray-900">
            {stats?.approvedVendors || 0}
          </div>
          <div className="text-gray-600">Approved Vendors</div>
          <div className="text-sm text-gray-500 mt-1">
            {stats?.pendingVendors || 0} pending
          </div>
        </div>

        <div className="card text-center">
          <div className="text-3xl text-orange-600 mb-2">📊</div>
          <div className="text-2xl font-bold text-gray-900">
            {stats?.totalTransactions || 0}
          </div>
          <div className="text-gray-600">Total Transactions</div>
          <div className="text-sm text-gray-500 mt-1">
            {formatCurrency(stats?.totalVolume)}
          </div>
        </div>
      </div>

      {/* System Health */}
      {systemHealth && (
        <div className="card">
          <h3 className="text-lg font-semibold mb-4">System Health</h3>
          <div className="grid md:grid-cols-3 gap-4">
            <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
              <span className="text-gray-700">Blockchain Connection</span>
              <span className={`font-medium ${getHealthColor(systemHealth.blockchain?.status)}`}>
                {systemHealth.blockchain?.status || 'Unknown'}
              </span>
            </div>
            <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
              <span className="text-gray-700">Contract Status</span>
              <span className={`font-medium ${getHealthColor(systemHealth.contracts?.status)}`}>
                {systemHealth.contracts?.status || 'Unknown'}
              </span>
            </div>
            <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
              <span className="text-gray-700">Database</span>
              <span className={`font-medium ${getHealthColor(systemHealth.database?.status)}`}>
                {systemHealth.database?.status || 'Unknown'}
              </span>
            </div>
          </div>
          
          {systemHealth.isPaused && (
            <div className="mt-4 p-3 bg-red-50 border border-red-200 rounded-lg">
              <div className="flex items-center">
                <div className="text-red-600 mr-2">⚠️</div>
                <span className="text-red-800 font-medium">System is currently paused</span>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Recent Activity Summary */}
      <div className="grid md:grid-cols-2 gap-6">
        <div className="card">
          <h3 className="text-lg font-semibold mb-4">Today's Activity</h3>
          <div className="space-y-3">
            <div className="flex justify-between">
              <span className="text-gray-600">New Donations</span>
              <span className="font-medium">{stats?.todayStats?.donations || 0}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-600">Applications Submitted</span>
              <span className="font-medium">{stats?.todayStats?.applications || 0}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-600">Funds Distributed</span>
              <span className="font-medium">{formatCurrency(stats?.todayStats?.distributed)}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-600">Vendor Transactions</span>
              <span className="font-medium">{stats?.todayStats?.vendorTransactions || 0}</span>
            </div>
          </div>
        </div>

        <div className="card">
          <h3 className="text-lg font-semibold mb-4">System Utilization</h3>
          <div className="space-y-3">
            <div>
              <div className="flex justify-between mb-1">
                <span className="text-gray-600">Funds Allocated</span>
                <span className="font-medium">
                  {stats?.utilization?.allocated ? 
                    `${Math.round(stats.utilization.allocated)}%` : '0%'}
                </span>
              </div>
              <div className="w-full bg-gray-200 rounded-full h-2">
                <div 
                  className="bg-blue-600 h-2 rounded-full" 
                  style={{ width: `${stats?.utilization?.allocated || 0}%` }}
                ></div>
              </div>
            </div>
            <div>
              <div className="flex justify-between mb-1">
                <span className="text-gray-600">Funds Spent</span>
                <span className="font-medium">
                  {stats?.utilization?.spent ? 
                    `${Math.round(stats.utilization.spent)}%` : '0%'}
                </span>
              </div>
              <div className="w-full bg-gray-200 rounded-full h-2">
                <div 
                  className="bg-green-600 h-2 rounded-full" 
                  style={{ width: `${stats?.utilization?.spent || 0}%` }}
                ></div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default SystemStats;