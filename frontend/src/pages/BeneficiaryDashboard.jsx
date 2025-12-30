import React from 'react';

const BeneficiaryDashboard = () => {
  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900">Beneficiary Dashboard</h1>
          <p className="text-gray-600 mt-2">Apply for relief funds and manage your allocation</p>
        </div>

        {/* Application Status */}
        <div className="card mb-8">
          <h2 className="text-xl font-semibold mb-4">Application Status</h2>
          <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
            <div className="flex items-center">
              <div className="text-yellow-600 text-2xl mr-3">⏳</div>
              <div>
                <h3 className="font-semibold text-yellow-800">No Application Submitted</h3>
                <p className="text-yellow-700">Submit your relief application to get started</p>
              </div>
            </div>
          </div>
        </div>

        {/* Application Form */}
        <div className="grid lg:grid-cols-2 gap-8 mb-8">
          <div className="card">
            <h2 className="text-xl font-semibold mb-4">Apply for Relief</h2>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Disaster Type
                </label>
                <select className="input-field">
                  <option value="">Select disaster type</option>
                  <option value="earthquake">Earthquake</option>
                  <option value="flood">Flood</option>
                  <option value="hurricane">Hurricane</option>
                  <option value="wildfire">Wildfire</option>
                  <option value="other">Other</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Location
                </label>
                <input
                  type="text"
                  placeholder="Enter your location"
                  className="input-field"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Requested Amount (USDC)
                </label>
                <input
                  type="number"
                  placeholder="Enter requested amount"
                  className="input-field"
                />
              </div>
              <button className="btn-primary w-full">
                Submit Application
              </button>
            </div>
          </div>

          <div className="card">
            <h2 className="text-xl font-semibold mb-4">Fund Balance</h2>
            <div className="space-y-4">
              <div className="text-center py-8">
                <div className="text-4xl font-bold text-gray-400 mb-2">$0.00</div>
                <p className="text-gray-500">Available Balance</p>
              </div>
              <div className="space-y-2">
                <div className="flex justify-between">
                  <span className="text-gray-600">Allocated:</span>
                  <span className="font-semibold">$0.00</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">Spent:</span>
                  <span className="font-semibold">$0.00</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">Remaining:</span>
                  <span className="font-semibold">$0.00</span>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Spending History */}
        <div className="card">
          <h2 className="text-xl font-semibold mb-4">Spending History</h2>
          <div className="text-center py-8 text-gray-500">
            <div className="text-4xl mb-4">🛒</div>
            <p>No purchases yet. Complete your application to start spending relief funds.</p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default BeneficiaryDashboard;