import React from 'react';

const DonorDashboard = () => {
  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900">Donor Dashboard</h1>
          <p className="text-gray-600 mt-2">Make transparent donations and track your impact</p>
        </div>

        {/* Donation Interface */}
        <div className="grid lg:grid-cols-2 gap-8 mb-8">
          <div className="card">
            <h2 className="text-xl font-semibold mb-4">Make a Donation</h2>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Donation Amount (USDC)
                </label>
                <input
                  type="number"
                  placeholder="Enter amount"
                  className="input-field"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Disaster Type (Optional)
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
              <button className="btn-primary w-full">
                Donate Now
              </button>
            </div>
          </div>

          <div className="card">
            <h2 className="text-xl font-semibold mb-4">Your Impact</h2>
            <div className="space-y-4">
              <div className="flex justify-between">
                <span className="text-gray-600">Total Donated:</span>
                <span className="font-semibold">$0.00 USDC</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">Beneficiaries Helped:</span>
                <span className="font-semibold">0</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">Funds Distributed:</span>
                <span className="font-semibold">$0.00</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">Transparency Score:</span>
                <span className="font-semibold text-green-600">100%</span>
              </div>
            </div>
          </div>
        </div>

        {/* Donation History */}
        <div className="card">
          <h2 className="text-xl font-semibold mb-4">Donation History</h2>
          <div className="text-center py-8 text-gray-500">
            <div className="text-4xl mb-4">📋</div>
            <p>No donations yet. Make your first donation to get started!</p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default DonorDashboard;