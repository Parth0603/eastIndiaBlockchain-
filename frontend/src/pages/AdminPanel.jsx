import React from 'react';

const AdminPanel = () => {
  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900">Admin Panel</h1>
          <p className="text-gray-600 mt-2">Manage the disaster relief system</p>
        </div>

        {/* System Stats */}
        <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          <div className="card text-center">
            <div className="text-3xl text-blue-600 mb-2">💰</div>
            <div className="text-2xl font-bold text-gray-900">$0</div>
            <div className="text-gray-600">Total Donations</div>
          </div>
          <div className="card text-center">
            <div className="text-3xl text-green-600 mb-2">👥</div>
            <div className="text-2xl font-bold text-gray-900">0</div>
            <div className="text-gray-600">Active Beneficiaries</div>
          </div>
          <div className="card text-center">
            <div className="text-3xl text-purple-600 mb-2">🏪</div>
            <div className="text-2xl font-bold text-gray-900">0</div>
            <div className="text-gray-600">Approved Vendors</div>
          </div>
          <div className="card text-center">
            <div className="text-3xl text-orange-600 mb-2">📊</div>
            <div className="text-2xl font-bold text-gray-900">0</div>
            <div className="text-gray-600">Total Transactions</div>
          </div>
        </div>

        {/* Management Sections */}
        <div className="grid lg:grid-cols-2 gap-8 mb-8">
          <div className="card">
            <h2 className="text-xl font-semibold mb-4">Pending Applications</h2>
            <div className="text-center py-8 text-gray-500">
              <div className="text-4xl mb-4">📋</div>
              <p>No pending applications</p>
            </div>
          </div>

          <div className="card">
            <h2 className="text-xl font-semibold mb-4">System Controls</h2>
            <div className="space-y-4">
              <button className="btn-primary w-full">
                Add Verifier
              </button>
              <button className="btn-secondary w-full">
                Manage Categories
              </button>
              <button className="btn-secondary w-full">
                System Settings
              </button>
              <button className="bg-red-600 hover:bg-red-700 text-white font-medium py-2 px-4 rounded-lg w-full">
                Emergency Pause
              </button>
            </div>
          </div>
        </div>

        {/* Recent Activity */}
        <div className="card">
          <h2 className="text-xl font-semibold mb-4">Recent Activity</h2>
          <div className="text-center py-8 text-gray-500">
            <div className="text-4xl mb-4">📈</div>
            <p>No recent activity</p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AdminPanel;