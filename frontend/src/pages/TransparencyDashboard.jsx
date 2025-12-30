import React from 'react';

const TransparencyDashboard = () => {
  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900">Transparency Dashboard</h1>
          <p className="text-gray-600 mt-2">Public view of all disaster relief transactions and fund flows</p>
        </div>

        {/* Summary Stats */}
        <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          <div className="card text-center">
            <div className="text-3xl text-blue-600 mb-2">💰</div>
            <div className="text-2xl font-bold text-gray-900">$0</div>
            <div className="text-gray-600">Total Raised</div>
          </div>
          <div className="card text-center">
            <div className="text-3xl text-green-600 mb-2">📤</div>
            <div className="text-2xl font-bold text-gray-900">$0</div>
            <div className="text-gray-600">Funds Distributed</div>
          </div>
          <div className="card text-center">
            <div className="text-3xl text-purple-600 mb-2">👥</div>
            <div className="text-2xl font-bold text-gray-900">0</div>
            <div className="text-gray-600">People Helped</div>
          </div>
          <div className="card text-center">
            <div className="text-3xl text-orange-600 mb-2">🔄</div>
            <div className="text-2xl font-bold text-gray-900">0</div>
            <div className="text-gray-600">Transactions</div>
          </div>
        </div>

        {/* Fund Flow Visualization */}
        <div className="card mb-8">
          <h2 className="text-xl font-semibold mb-4">Fund Flow</h2>
          <div className="text-center py-12 text-gray-500">
            <div className="text-4xl mb-4">📊</div>
            <p>Fund flow visualization will appear here</p>
            <p className="text-sm mt-2">Real-time tracking from donations to final spending</p>
          </div>
        </div>

        {/* Transaction Search */}
        <div className="card mb-8">
          <h2 className="text-xl font-semibold mb-4">Search Transactions</h2>
          <div className="grid md:grid-cols-4 gap-4 mb-4">
            <input
              type="text"
              placeholder="Transaction hash"
              className="input-field"
            />
            <select className="input-field">
              <option value="">All types</option>
              <option value="donation">Donation</option>
              <option value="allocation">Allocation</option>
              <option value="spending">Spending</option>
            </select>
            <select className="input-field">
              <option value="">All categories</option>
              <option value="food">Food</option>
              <option value="medicine">Medicine</option>
              <option value="shelter">Shelter</option>
              <option value="clothing">Clothing</option>
            </select>
            <button className="btn-primary">
              Search
            </button>
          </div>
        </div>

        {/* Transaction List */}
        <div className="card">
          <h2 className="text-xl font-semibold mb-4">Recent Transactions</h2>
          <div className="text-center py-8 text-gray-500">
            <div className="text-4xl mb-4">📋</div>
            <p>No transactions yet</p>
            <p className="text-sm mt-2">All transactions will be publicly visible here</p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default TransparencyDashboard;