import React, { useState, useEffect } from 'react';
import { useWallet } from '../hooks/useWallet';
import { useAuth } from '../hooks/useAuth';
import { useContract } from '../hooks/useContract';
import { useApi } from '../hooks/useApi';
import { useTransactionStatus } from '../hooks/useTransactionStatus';
import TransactionHistory from '../components/common/TransactionHistory';
import LoadingSpinner, { InlineSpinner } from '../components/common/LoadingSpinner';
import RoleGuard from '../components/common/RoleGuard';
import DonationInterface from '../components/donor/DonationInterface';
import ImpactVisualization from '../components/donor/ImpactVisualization';
import DonationHistory from '../components/donor/DonationHistory';
import toast from 'react-hot-toast';

const DonorDashboard = () => {
  const { account, isConnected } = useWallet();
  const { isAuthenticated } = useAuth();
  const [refreshTrigger, setRefreshTrigger] = useState(0);

  const handleDonationSuccess = () => {
    setRefreshTrigger(prev => prev + 1);
    toast.success('Donation processed successfully!');
  };

  if (!isConnected || !isAuthenticated) {
    return (
      <div className="min-h-screen bg-gray-50 py-8">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center py-16">
            <div className="w-20 h-20 bg-gradient-to-br from-blue-500 to-green-500 rounded-2xl flex items-center justify-center mx-auto mb-6">
              <span className="text-3xl">💝</span>
            </div>
            <h1 className="text-3xl font-bold text-gray-900 mb-4">Donor Dashboard</h1>
            <p className="text-gray-600 mb-8">
              {!isConnected 
                ? "Connect your wallet using the header to start making donations"
                : "Please complete authentication to access your donor dashboard."
              }
            </p>
            <div className="text-sm text-gray-500 mb-4">
              {!isConnected 
                ? 'Use the "Connect Wallet" button in the top navigation'
                : 'You need to sign up or authenticate as a donor to access this dashboard.'
              }
            </div>
            {isConnected && !isAuthenticated && (
              <button
                onClick={() => window.location.href = '/signup/donor'}
                className="bg-blue-600 text-white px-6 py-3 rounded-xl hover:bg-blue-700 transition-colors"
              >
                Register as Donor
              </button>
            )}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900">Donor Dashboard</h1>
          <p className="text-gray-600 mt-2">Make transparent donations and track your impact</p>
        </div>

        {/* Main Dashboard Content */}
        <div className="grid lg:grid-cols-2 gap-8 mb-8">
          {/* Donation Interface */}
          <DonationInterface onDonationSuccess={handleDonationSuccess} />
          
          {/* Impact Visualization */}
          <ImpactVisualization refreshTrigger={refreshTrigger} />
        </div>

        {/* Donation History */}
        <DonationHistory refreshTrigger={refreshTrigger} />
      </div>
    </div>
  );
};

export default DonorDashboard;