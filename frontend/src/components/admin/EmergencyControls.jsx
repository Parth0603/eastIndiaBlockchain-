import React, { useState, useEffect } from 'react';
import { useApi } from '../../hooks/useApi';
import LoadingSpinner from '../common/LoadingSpinner';
import toast from 'react-hot-toast';

const EmergencyControls = () => {
  const [systemStatus, setSystemStatus] = useState(null);
  const [showConfirmDialog, setShowConfirmDialog] = useState(false);
  const [actionType, setActionType] = useState(null);
  const { admin, isLoading } = useApi();

  useEffect(() => {
    fetchSystemStatus();
  }, []);

  const fetchSystemStatus = async () => {
    try {
      const data = await admin.getSystemHealth();
      setSystemStatus(data);
    } catch (error) {
      console.error('Failed to fetch system status:', error);
    }
  };

  const handleEmergencyAction = async (action) => {
    setActionType(action);
    setShowConfirmDialog(true);
  };

  const confirmAction = async () => {
    try {
      if (actionType === 'pause') {
        await admin.pauseSystem();
        toast.success('System paused successfully');
      } else if (actionType === 'resume') {
        await admin.resumeSystem();
        toast.success('System resumed successfully');
      }
      
      await fetchSystemStatus();
      setShowConfirmDialog(false);
      setActionType(null);
    } catch (error) {
      console.error(`Failed to ${actionType} system:`, error);
    }
  };

  const cancelAction = () => {
    setShowConfirmDialog(false);
    setActionType(null);
  };

  if (isLoading && !systemStatus) {
    return <LoadingSpinner />;
  }

  const isPaused = systemStatus?.isPaused || false;

  return (
    <div className="space-y-6">
      {/* System Status Overview */}
      <div className="card">
        <h2 className="text-xl font-semibold mb-6">Emergency Controls</h2>
        
        {/* Current Status */}
        <div className="mb-6">
          <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
            <div className="flex items-center">
              <div className={`w-3 h-3 rounded-full mr-3 ${isPaused ? 'bg-red-500' : 'bg-green-500'}`}></div>
              <div>
                <div className="font-medium text-gray-900">
                  System Status: {isPaused ? 'PAUSED' : 'ACTIVE'}
                </div>
                <div className="text-sm text-gray-600">
                  {isPaused 
                    ? 'All transactions and operations are currently suspended'
                    : 'System is operating normally'
                  }
                </div>
              </div>
            </div>
            <div className="text-2xl">
              {isPaused ? '⏸️' : '▶️'}
            </div>
          </div>
        </div>

        {/* Emergency Actions */}
        <div className="space-y-4">
          <h3 className="text-lg font-medium">Emergency Actions</h3>
          
          <div className="grid md:grid-cols-2 gap-4">
            {/* Pause System */}
            <div className="border border-red-200 rounded-lg p-4">
              <div className="flex items-start">
                <div className="text-2xl text-red-600 mr-3">⚠️</div>
                <div className="flex-1">
                  <h4 className="font-medium text-red-900 mb-2">Pause System</h4>
                  <p className="text-sm text-red-700 mb-4">
                    Immediately halt all transactions and operations. Use in case of security 
                    threats, smart contract issues, or other emergencies.
                  </p>
                  <button
                    onClick={() => handleEmergencyAction('pause')}
                    disabled={isPaused || isLoading}
                    className={`w-full py-2 px-4 rounded-lg font-medium ${
                      isPaused 
                        ? 'bg-gray-300 text-gray-500 cursor-not-allowed'
                        : 'bg-red-600 hover:bg-red-700 text-white'
                    }`}
                  >
                    {isPaused ? 'System Already Paused' : 'Emergency Pause'}
                  </button>
                </div>
              </div>
            </div>

            {/* Resume System */}
            <div className="border border-green-200 rounded-lg p-4">
              <div className="flex items-start">
                <div className="text-2xl text-green-600 mr-3">✅</div>
                <div className="flex-1">
                  <h4 className="font-medium text-green-900 mb-2">Resume System</h4>
                  <p className="text-sm text-green-700 mb-4">
                    Restore normal operations after resolving emergency issues. 
                    Ensure all systems are secure before resuming.
                  </p>
                  <button
                    onClick={() => handleEmergencyAction('resume')}
                    disabled={!isPaused || isLoading}
                    className={`w-full py-2 px-4 rounded-lg font-medium ${
                      !isPaused 
                        ? 'bg-gray-300 text-gray-500 cursor-not-allowed'
                        : 'bg-green-600 hover:bg-green-700 text-white'
                    }`}
                  >
                    {!isPaused ? 'System Already Active' : 'Resume Operations'}
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Impact Warning */}
        <div className="mt-6 p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
          <div className="flex items-start">
            <div className="text-yellow-600 mr-2">⚠️</div>
            <div>
              <h4 className="font-medium text-yellow-900 mb-1">Important Notice</h4>
              <p className="text-sm text-yellow-800">
                Emergency controls affect all system operations including donations, 
                beneficiary spending, and vendor transactions. Use these controls only 
                when absolutely necessary and communicate with stakeholders about any downtime.
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* System Health Indicators */}
      <div className="card">
        <h3 className="text-lg font-semibold mb-4">System Health Indicators</h3>
        
        <div className="grid md:grid-cols-3 gap-4">
          <div className="p-4 bg-gray-50 rounded-lg">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm font-medium text-gray-700">Blockchain Connection</span>
              <span className={`text-sm font-medium ${
                systemStatus?.blockchain?.status === 'healthy' ? 'text-green-600' : 'text-red-600'
              }`}>
                {systemStatus?.blockchain?.status || 'Unknown'}
              </span>
            </div>
            <div className="text-xs text-gray-500">
              Last checked: {systemStatus?.blockchain?.lastCheck ? 
                new Date(systemStatus.blockchain.lastCheck).toLocaleTimeString() : 'Never'}
            </div>
          </div>

          <div className="p-4 bg-gray-50 rounded-lg">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm font-medium text-gray-700">Smart Contracts</span>
              <span className={`text-sm font-medium ${
                systemStatus?.contracts?.status === 'healthy' ? 'text-green-600' : 'text-red-600'
              }`}>
                {systemStatus?.contracts?.status || 'Unknown'}
              </span>
            </div>
            <div className="text-xs text-gray-500">
              Gas price: {systemStatus?.contracts?.gasPrice || 'N/A'} gwei
            </div>
          </div>

          <div className="p-4 bg-gray-50 rounded-lg">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm font-medium text-gray-700">Database</span>
              <span className={`text-sm font-medium ${
                systemStatus?.database?.status === 'healthy' ? 'text-green-600' : 'text-red-600'
              }`}>
                {systemStatus?.database?.status || 'Unknown'}
              </span>
            </div>
            <div className="text-xs text-gray-500">
              Response time: {systemStatus?.database?.responseTime || 'N/A'}ms
            </div>
          </div>
        </div>
      </div>

      {/* Confirmation Dialog */}
      {showConfirmDialog && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 max-w-md w-full mx-4">
            <h3 className="text-lg font-semibold mb-4">
              Confirm {actionType === 'pause' ? 'System Pause' : 'System Resume'}
            </h3>
            <p className="text-gray-600 mb-6">
              {actionType === 'pause' 
                ? 'Are you sure you want to pause the entire system? This will halt all transactions and operations immediately.'
                : 'Are you sure you want to resume system operations? Make sure all issues have been resolved.'
              }
            </p>
            <div className="flex gap-3">
              <button
                onClick={confirmAction}
                disabled={isLoading}
                className={`flex-1 py-2 px-4 rounded-lg font-medium ${
                  actionType === 'pause'
                    ? 'bg-red-600 hover:bg-red-700 text-white'
                    : 'bg-green-600 hover:bg-green-700 text-white'
                }`}
              >
                {isLoading ? 'Processing...' : `Confirm ${actionType === 'pause' ? 'Pause' : 'Resume'}`}
              </button>
              <button
                onClick={cancelAction}
                className="flex-1 py-2 px-4 border border-gray-300 rounded-lg font-medium text-gray-700 hover:bg-gray-50"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default EmergencyControls;