import React, { useState, useEffect } from 'react';
import { useApi } from '../../hooks/useApi';
import LoadingSpinner from '../common/LoadingSpinner';
import toast from 'react-hot-toast';

const VerifierManagement = () => {
  const [verifiers, setVerifiers] = useState([]);
  const [showAddForm, setShowAddForm] = useState(false);
  const [newVerifier, setNewVerifier] = useState({
    walletAddress: '',
    name: '',
    email: '',
    organization: ''
  });
  const { admin, isLoading } = useApi();

  useEffect(() => {
    fetchVerifiers();
  }, []);

  const fetchVerifiers = async () => {
    try {
      const data = await admin.getUsers({ role: 'verifier' });
      setVerifiers(data.users || []);
    } catch (error) {
      console.error('Failed to fetch verifiers:', error);
    }
  };

  const handleAddVerifier = async (e) => {
    e.preventDefault();
    
    if (!newVerifier.walletAddress || !newVerifier.name) {
      toast.error('Wallet address and name are required');
      return;
    }

    // Basic wallet address validation
    if (!/^0x[a-fA-F0-9]{40}$/.test(newVerifier.walletAddress)) {
      toast.error('Invalid wallet address format');
      return;
    }

    try {
      await admin.addVerifier(newVerifier);
      setNewVerifier({ walletAddress: '', name: '', email: '', organization: '' });
      setShowAddForm(false);
      await fetchVerifiers();
    } catch (error) {
      console.error('Failed to add verifier:', error);
    }
  };

  const handleRemoveVerifier = async (verifierId) => {
    if (!window.confirm('Are you sure you want to remove this verifier? This action cannot be undone.')) {
      return;
    }

    try {
      await admin.removeVerifier(verifierId);
      await fetchVerifiers();
    } catch (error) {
      console.error('Failed to remove verifier:', error);
    }
  };

  const formatAddress = (address) => {
    if (!address) return '';
    return `${address.slice(0, 6)}...${address.slice(-4)}`;
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'active': return 'bg-green-100 text-green-800';
      case 'inactive': return 'bg-gray-100 text-gray-800';
      case 'suspended': return 'bg-red-100 text-red-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  return (
    <div className="card">
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-xl font-semibold">Verifier Management</h2>
        <button
          onClick={() => setShowAddForm(!showAddForm)}
          className="btn-primary"
        >
          {showAddForm ? 'Cancel' : 'Add Verifier'}
        </button>
      </div>

      {/* Add Verifier Form */}
      {showAddForm && (
        <div className="mb-6 p-4 bg-gray-50 rounded-lg">
          <h3 className="text-lg font-medium mb-4">Add New Verifier</h3>
          <form onSubmit={handleAddVerifier} className="space-y-4">
            <div className="grid md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Wallet Address *
                </label>
                <input
                  type="text"
                  value={newVerifier.walletAddress}
                  onChange={(e) => setNewVerifier({ ...newVerifier, walletAddress: e.target.value })}
                  placeholder="0x..."
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Full Name *
                </label>
                <input
                  type="text"
                  value={newVerifier.name}
                  onChange={(e) => setNewVerifier({ ...newVerifier, name: e.target.value })}
                  placeholder="John Doe"
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Email
                </label>
                <input
                  type="email"
                  value={newVerifier.email}
                  onChange={(e) => setNewVerifier({ ...newVerifier, email: e.target.value })}
                  placeholder="john@example.com"
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Organization
                </label>
                <input
                  type="text"
                  value={newVerifier.organization}
                  onChange={(e) => setNewVerifier({ ...newVerifier, organization: e.target.value })}
                  placeholder="Relief Organization"
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>
            </div>
            <div className="flex gap-3">
              <button
                type="submit"
                disabled={isLoading}
                className="btn-primary"
              >
                {isLoading ? 'Adding...' : 'Add Verifier'}
              </button>
              <button
                type="button"
                onClick={() => setShowAddForm(false)}
                className="btn-secondary"
              >
                Cancel
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Verifiers List */}
      {isLoading && verifiers.length === 0 ? (
        <LoadingSpinner />
      ) : verifiers.length === 0 ? (
        <div className="text-center py-8 text-gray-500">
          <div className="text-4xl mb-4">👥</div>
          <p>No verifiers found</p>
          <p className="text-sm">Add your first verifier to get started</p>
        </div>
      ) : (
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Verifier
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Wallet Address
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Status
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Activity
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {verifiers.map((verifier) => (
                <tr key={verifier._id} className="hover:bg-gray-50">
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div>
                      <div className="text-sm font-medium text-gray-900">
                        {verifier.profile?.name || 'Unknown'}
                      </div>
                      {verifier.profile?.organization && (
                        <div className="text-sm text-gray-500">
                          {verifier.profile.organization}
                        </div>
                      )}
                      {verifier.profile?.email && (
                        <div className="text-sm text-gray-500">
                          {verifier.profile.email}
                        </div>
                      )}
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm font-mono text-gray-900">
                      {formatAddress(verifier.walletAddress)}
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${getStatusColor(verifier.status)}`}>
                      {verifier.status || 'active'}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    <div>
                      <div>Reviews: {verifier.stats?.totalReviews || 0}</div>
                      <div>Last active: {verifier.lastActive ? 
                        new Date(verifier.lastActive).toLocaleDateString() : 'Never'}</div>
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                    <button
                      onClick={() => handleRemoveVerifier(verifier._id)}
                      className="text-red-600 hover:text-red-900"
                      disabled={isLoading}
                    >
                      Remove
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
};

export default VerifierManagement;