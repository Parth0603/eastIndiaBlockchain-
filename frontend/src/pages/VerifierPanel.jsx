import React, { useState } from 'react';
import { VerifierGuard } from '../components/common/RoleGuard';
import ApplicationReview from '../components/verifier/ApplicationReview';
import VendorValidation from '../components/verifier/VendorValidation';
import TransactionMonitoring from '../components/verifier/TransactionMonitoring';

const VerifierPanel = () => {
  const [activeTab, setActiveTab] = useState('applications');

  const tabs = [
    { id: 'applications', label: 'Application Review', icon: '📋' },
    { id: 'vendors', label: 'Vendor Validation', icon: '🏪' },
    { id: 'transactions', label: 'Transaction Monitoring', icon: '📊' },
  ];

  const renderTabContent = () => {
    switch (activeTab) {
      case 'applications':
        return <ApplicationReview />;
      case 'vendors':
        return <VendorValidation />;
      case 'transactions':
        return <TransactionMonitoring />;
      default:
        return <ApplicationReview />;
    }
  };

  return (
    <VerifierGuard>
      <div className="min-h-screen bg-gray-50 py-8">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="mb-8">
            <h1 className="text-3xl font-bold text-gray-900">Verifier Panel</h1>
            <p className="text-gray-600 mt-2">
              Review applications, validate vendors, and monitor transactions
            </p>
          </div>

          {/* Tab Navigation */}
          <div className="mb-8">
            <div className="border-b border-gray-200">
              <nav className="-mb-px flex space-x-8">
                {tabs.map((tab) => (
                  <button
                    key={tab.id}
                    onClick={() => setActiveTab(tab.id)}
                    className={`py-2 px-1 border-b-2 font-medium text-sm whitespace-nowrap ${
                      activeTab === tab.id
                        ? 'border-blue-500 text-blue-600'
                        : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                    }`}
                  >
                    <span className="mr-2">{tab.icon}</span>
                    {tab.label}
                  </button>
                ))}
              </nav>
            </div>
          </div>

          {/* Tab Content */}
          <div className="bg-white rounded-lg shadow">
            {renderTabContent()}
          </div>
        </div>
      </div>
    </VerifierGuard>
  );
};

export default VerifierPanel;