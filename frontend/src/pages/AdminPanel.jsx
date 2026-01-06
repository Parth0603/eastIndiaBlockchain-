import { useState, useEffect } from 'react';
import { useAuth } from '../hooks/useAuth';
import { useWallet } from '../hooks/useWallet';
import apiService from '../services/api';

const AdminPanel = () => {
  const { isAuthenticated, user } = useAuth();
  const { isConnected, account } = useWallet();
  const [activeSection, setActiveSection] = useState('dashboard');
  const [systemActive, setSystemActive] = useState(true);
  const [stats, setStats] = useState(null);
  const [recentCampaigns, setRecentCampaigns] = useState([]);
  const [pendingBeneficiaries, setPendingBeneficiaries] = useState([]);
  const [pendingVendors, setPendingVendors] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Navigation items
  const navigationItems = [
    { id: 'dashboard', label: 'Dashboard', icon: '🏠' },
    { id: 'campaigns', label: 'Campaigns', icon: '📋' },
    { id: 'beneficiaries', label: 'Beneficiaries', icon: '👥' },
    { id: 'vendors', label: 'Vendors', icon: '🏪' },
    { id: 'settings', label: 'Settings', icon: '⚙️' }
  ];

  // Fetch admin data from backend
  useEffect(() => {
    const fetchAdminData = async () => {
      if (!isConnected || !account) {
        setLoading(false);
        return;
      }

      try {
        setLoading(true);
        setError(null);

        // Get admin statistics and data
        const [statsResponse, applicationsResponse, vendorsResponse] = await Promise.all([
          apiService.getAdminStats(),
          apiService.getPendingApplications({ limit: 10 }),
          apiService.getPendingVendors({ limit: 10 })
        ]);

        if (statsResponse.success) {
          setStats({
            totalFunds: parseFloat(statsResponse.data.financial.totalDonated) || 0,
            activeCampaigns: statsResponse.data.overview.totalDonations || 0,
            pendingVerifications: statsResponse.data.overview.pendingApplications || 0,
            totalUsers: statsResponse.data.overview.totalUsers || 0,
            totalTransactions: statsResponse.data.overview.totalTransactions || 0,
            approvedBeneficiaries: statsResponse.data.overview.approvedBeneficiaries || 0,
            verifiedVendors: statsResponse.data.overview.verifiedVendors || 0
          });
        }

        if (applicationsResponse.success) {
          const applications = applicationsResponse.data.applications.map(app => ({
            id: app.id,
            name: `${app.disasterType} Relief - ${app.location}`,
            status: app.status,
            funds: parseFloat(app.requestedAmount) / Math.pow(10, 18) || 0,
            applicantName: app.applicantName || 'Unknown',
            location: app.location,
            type: app.disasterType
          }));
          setRecentCampaigns(applications.slice(0, 4));
          setPendingBeneficiaries(applications.map(app => ({
            id: app.id,
            name: app.applicantName || 'Unknown',
            location: app.location,
            type: `${app.disasterType} Victim`
          })));
        }

        if (vendorsResponse.success) {
          const vendors = vendorsResponse.data.vendors.map(vendor => ({
            id: vendor.id,
            name: vendor.businessName || 'Unknown Business',
            category: vendor.businessType || 'General',
            location: vendor.contactInfo?.address || 'Unknown Location'
          }));
          setPendingVendors(vendors);
        }

      } catch (error) {
        console.error('Error fetching admin data:', error);
        setError('Failed to load admin data');
      } finally {
        setLoading(false);
      }
    };

    fetchAdminData();
  }, [isConnected, account]);

  const toggleSystemStatus = async () => {
    try {
      const response = await apiService.emergencyControl({
        pause: !systemActive,
        reason: systemActive ? 'Emergency pause activated by admin' : 'System resumed by admin'
      });
      
      if (response.success) {
        setSystemActive(!systemActive);
      }
    } catch (error) {
      console.error('Error toggling system status:', error);
      alert('Failed to update system status');
    }
  };

  const handleVerifyBeneficiary = async (id) => {
    try {
      const allocatedAmount = prompt('Enter allocation amount:', '500');
      if (!allocatedAmount || isNaN(allocatedAmount)) {
        alert('Please enter a valid allocation amount');
        return;
      }

      const response = await apiService.reviewApplication(id, {
        decision: 'approve',
        comments: 'Approved by admin',
        allocatedAmount: parseFloat(allocatedAmount)
      });
      
      if (response.success) {
        alert(`Beneficiary ${id} verified successfully!`);
        // Refresh data
        window.location.reload();
      }
    } catch (error) {
      console.error('Error verifying beneficiary:', error);
      alert('Failed to verify beneficiary');
    }
  };

  const handleApproveVendor = async (id) => {
    try {
      const response = await apiService.reviewVendor(id, {
        decision: 'approve',
        comments: 'Approved by admin'
      });
      
      if (response.success) {
        alert(`Vendor ${id} approved successfully!`);
        // Refresh data
        window.location.reload();
      }
    } catch (error) {
      console.error('Error approving vendor:', error);
      alert('Failed to approve vendor');
    }
  };

  if (!isConnected) {
    return (
      <div className="min-h-screen bg-blue-50 flex items-center justify-center">
        <div className="max-w-md w-full bg-white rounded-3xl shadow-2xl p-8 text-center">
          <div className="w-20 h-20 bg-red-500 rounded-2xl flex items-center justify-center mx-auto mb-6">
            <span className="text-3xl">👨‍💼</span>
          </div>
          <h2 className="text-2xl font-bold text-gray-900 mb-4">Admin Access Required</h2>
          <p className="text-gray-600 mb-6">
            Connect your wallet to access the admin dashboard and manage the disaster relief system.
          </p>
          <div className="text-sm text-gray-500">
            Use the "Connect Wallet" button in the header to get started.
          </div>
        </div>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-blue-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading admin dashboard...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-blue-50 flex items-center justify-center">
        <div className="max-w-md w-full bg-white rounded-3xl shadow-2xl p-8 text-center">
          <div className="w-20 h-20 bg-red-100 rounded-2xl flex items-center justify-center mx-auto mb-6">
            <span className="text-3xl text-red-500">⚠️</span>
          </div>
          <h2 className="text-2xl font-bold text-gray-900 mb-4">Error Loading Data</h2>
          <p className="text-gray-600 mb-6">{error}</p>
          <button 
            onClick={() => window.location.reload()}
            className="bg-blue-600 text-white px-6 py-3 rounded-xl hover:bg-blue-700 transition-colors"
          >
            Try Again
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-blue-50">
      <div className="flex">
        {/* Sidebar Navigation */}
        <div className="w-64 bg-white shadow-lg min-h-screen">
          <div className="p-6">
            <h2 className="text-xl font-bold text-gray-900 mb-6">Admin Dashboard</h2>
            <nav className="space-y-2">
              {navigationItems.map((item) => (
                <button
                  key={item.id}
                  onClick={() => setActiveSection(item.id)}
                  className={`w-full flex items-center px-4 py-3 text-left rounded-xl transition-colors ${
                    activeSection === item.id
                      ? 'bg-blue-100 text-blue-800 font-medium'
                      : 'text-gray-600 hover:bg-gray-100'
                  }`}
                >
                  <span className="text-xl mr-3">{item.icon}</span>
                  {item.label}
                </button>
              ))}
            </nav>
          </div>
        </div>

        {/* Main Content */}
        <div className="flex-1 p-8">
          {activeSection === 'dashboard' && (
            <div className="space-y-8">
              {/* Emergency Pause Control */}
              <div className="bg-red-500 rounded-3xl shadow-lg p-6 text-white">
                <h2 className="text-xl font-semibold text-center mb-6">Emergency Pause Control</h2>
                
                <div className="flex items-center justify-center mb-4">
                  <button
                    onClick={toggleSystemStatus}
                    className={`relative inline-flex h-12 w-24 items-center rounded-full transition-colors ${
                      systemActive ? 'bg-white' : 'bg-red-300'
                    }`}
                  >
                    <span
                      className={`inline-block h-10 w-10 transform rounded-full bg-red-500 transition-transform ${
                        systemActive ? 'translate-x-1' : 'translate-x-12'
                      }`}
                    />
                  </button>
                </div>
                
                <div className="text-center">
                  <div className="flex items-center justify-center mb-2">
                    <span className="text-2xl mr-2">⚠️</span>
                    <span className="font-semibold">
                      System {systemActive ? 'Active' : 'Paused'} (Toggle to {systemActive ? 'Pause' : 'Activate'})
                    </span>
                    <span className="text-2xl ml-2">⚠️</span>
                  </div>
                </div>
              </div>

              {/* Stats Cards */}
              <div className="grid md:grid-cols-3 gap-6">
                <div className="bg-white rounded-3xl shadow-lg p-6">
                  <div className="flex items-center mb-4">
                    <div className="w-12 h-12 bg-green-100 rounded-2xl flex items-center justify-center mr-4">
                      <span className="text-2xl">💰</span>
                    </div>
                    <div>
                      <div className="text-sm text-gray-600">Total Funds Managed:</div>
                      <div className="text-2xl font-bold text-gray-900">
                        ${stats?.totalFunds?.toLocaleString() || '0'}
                      </div>
                      <div className="text-sm text-green-600">(Live)</div>
                    </div>
                  </div>
                </div>

                <div className="bg-white rounded-3xl shadow-lg p-6">
                  <div className="flex items-center mb-4">
                    <div className="w-12 h-12 bg-blue-100 rounded-2xl flex items-center justify-center mr-4">
                      <span className="text-2xl">📊</span>
                    </div>
                    <div>
                      <div className="text-sm text-gray-600">Active Campaigns:</div>
                      <div className="text-2xl font-bold text-gray-900">{stats?.activeCampaigns || 0}</div>
                    </div>
                  </div>
                </div>

                <div className="bg-white rounded-3xl shadow-lg p-6">
                  <div className="flex items-center mb-4">
                    <div className="w-12 h-12 bg-orange-100 rounded-2xl flex items-center justify-center mr-4">
                      <span className="text-2xl">⏳</span>
                    </div>
                    <div>
                      <div className="text-sm text-gray-600">Pending Verifications:</div>
                      <div className="text-2xl font-bold text-gray-900">{stats?.pendingVerifications || 0}</div>
                    </div>
                  </div>
                </div>
              </div>
              
              {/* Management Sections */}
              <div className="grid md:grid-cols-3 gap-6">
                {/* Recent Campaigns */}
                <div className="bg-white rounded-3xl shadow-lg p-6">
                  <div className="flex items-center justify-between mb-4">
                    <h3 className="text-lg font-semibold text-gray-900">Recent Campaigns</h3>
                    <button className="bg-blue-600 text-white px-4 py-2 rounded-xl hover:bg-blue-700 transition-colors text-sm">
                      Manage
                    </button>
                  </div>
                  <div className="space-y-3">
                    {recentCampaigns.length > 0 ? recentCampaigns.map((campaign) => (
                      <div key={campaign.id} className="text-sm">
                        <div className="font-medium text-gray-900">{campaign.name}</div>
                        <div className="text-gray-600">${campaign.funds.toLocaleString()}</div>
                      </div>
                    )) : (
                      <div className="text-sm text-gray-500">No recent campaigns</div>
                    )}
                  </div>
                  <button className="w-full mt-4 bg-gray-100 text-gray-700 py-2 rounded-xl hover:bg-gray-200 transition-colors">
                    Manage
                  </button>
                </div>

                {/* Pending Beneficiaries */}
                <div className="bg-white rounded-3xl shadow-lg p-6">
                  <div className="flex items-center justify-between mb-4">
                    <h3 className="text-lg font-semibold text-gray-900">Pending Beneficiaries</h3>
                    <button className="bg-green-600 text-white px-4 py-2 rounded-xl hover:bg-green-700 transition-colors text-sm">
                      Verify
                    </button>
                  </div>
                  <div className="space-y-3">
                    {pendingBeneficiaries.length > 0 ? pendingBeneficiaries.slice(0, 4).map((beneficiary) => (
                      <div key={beneficiary.id} className="text-sm">
                        <div className="font-medium text-gray-900">{beneficiary.name}</div>
                        <div className="text-gray-600">{beneficiary.location} - {beneficiary.type}</div>
                      </div>
                    )) : (
                      <div className="text-sm text-gray-500">No pending beneficiaries</div>
                    )}
                  </div>
                  <button 
                    className="w-full mt-4 bg-gray-100 text-gray-700 py-2 rounded-xl hover:bg-gray-200 transition-colors"
                    onClick={() => handleVerifyBeneficiary('all')}
                  >
                    Verify
                  </button>
                </div>

                {/* Pending Vendors */}
                <div className="bg-white rounded-3xl shadow-lg p-6">
                  <div className="flex items-center justify-between mb-4">
                    <h3 className="text-lg font-semibold text-gray-900">Pending Vendors</h3>
                    <button className="bg-purple-600 text-white px-4 py-2 rounded-xl hover:bg-purple-700 transition-colors text-sm">
                      Approve
                    </button>
                  </div>
                  <div className="space-y-3">
                    {pendingVendors.length > 0 ? pendingVendors.slice(0, 4).map((vendor) => (
                      <div key={vendor.id} className="text-sm">
                        <div className="font-medium text-gray-900">{vendor.name}</div>
                        <div className="text-gray-600">{vendor.category} - {vendor.location}</div>
                      </div>
                    )) : (
                      <div className="text-sm text-gray-500">No pending vendors</div>
                    )}
                  </div>
                  <button 
                    className="w-full mt-4 bg-gray-100 text-gray-700 py-2 rounded-xl hover:bg-gray-200 transition-colors"
                    onClick={() => handleApproveVendor('all')}
                  >
                    Approve
                  </button>
                </div>
              </div>
            </div>
          )}

          {activeSection === 'campaigns' && (
            <div className="space-y-6">
              <h2 className="text-2xl font-bold text-gray-900">Campaign Management</h2>
              
              <div className="bg-white rounded-3xl shadow-lg p-6">
                <div className="flex items-center justify-between mb-6">
                  <h3 className="text-lg font-semibold text-gray-900">Active Campaigns</h3>
                  <button className="bg-blue-600 text-white px-6 py-2 rounded-xl hover:bg-blue-700 transition-colors">
                    Create New Campaign
                  </button>
                </div>
                
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead>
                      <tr className="border-b border-gray-200">
                        <th className="text-left py-3 px-4 font-semibold text-gray-900">Campaign Name</th>
                        <th className="text-left py-3 px-4 font-semibold text-gray-900">Status</th>
                        <th className="text-left py-3 px-4 font-semibold text-gray-900">Funds Raised</th>
                        <th className="text-left py-3 px-4 font-semibold text-gray-900">Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {recentCampaigns.map((campaign) => (
                        <tr key={campaign.id} className="border-b border-gray-100">
                          <td className="py-3 px-4">{campaign.name}</td>
                          <td className="py-3 px-4">
                            <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                              campaign.status === 'approved' ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-800'
                            }`}>
                              {campaign.status}
                            </span>
                          </td>
                          <td className="py-3 px-4">${campaign.funds.toLocaleString()}</td>
                          <td className="py-3 px-4">
                            <div className="flex space-x-2">
                              <button className="text-blue-600 hover:text-blue-800 text-sm">Edit</button>
                              <button className="text-red-600 hover:text-red-800 text-sm">Pause</button>
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}

          {activeSection === 'beneficiaries' && (
            <div className="space-y-6">
              <h2 className="text-2xl font-bold text-gray-900">Beneficiary Management</h2>
              
              <div className="bg-white rounded-3xl shadow-lg p-6">
                <h3 className="text-lg font-semibold text-gray-900 mb-6">Pending Verifications</h3>
                
                <div className="space-y-4">
                  {pendingBeneficiaries.map((beneficiary) => (
                    <div key={beneficiary.id} className="flex items-center justify-between p-4 bg-gray-50 rounded-2xl">
                      <div>
                        <div className="font-semibold text-gray-900">{beneficiary.name}</div>
                        <div className="text-sm text-gray-600">{beneficiary.location} - {beneficiary.type}</div>
                      </div>
                      <div className="flex space-x-2">
                        <button 
                          onClick={() => handleVerifyBeneficiary(beneficiary.id)}
                          className="bg-green-600 text-white px-4 py-2 rounded-xl hover:bg-green-700 transition-colors text-sm"
                        >
                          Verify
                        </button>
                        <button className="bg-red-600 text-white px-4 py-2 rounded-xl hover:bg-red-700 transition-colors text-sm">
                          Reject
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {activeSection === 'vendors' && (
            <div className="space-y-6">
              <h2 className="text-2xl font-bold text-gray-900">Vendor Management</h2>
              
              <div className="bg-white rounded-3xl shadow-lg p-6">
                <h3 className="text-lg font-semibold text-gray-900 mb-6">Pending Approvals</h3>
                
                <div className="space-y-4">
                  {pendingVendors.map((vendor) => (
                    <div key={vendor.id} className="flex items-center justify-between p-4 bg-gray-50 rounded-2xl">
                      <div>
                        <div className="font-semibold text-gray-900">{vendor.name}</div>
                        <div className="text-sm text-gray-600">{vendor.category} - {vendor.location}</div>
                      </div>
                      <div className="flex space-x-2">
                        <button 
                          onClick={() => handleApproveVendor(vendor.id)}
                          className="bg-purple-600 text-white px-4 py-2 rounded-xl hover:bg-purple-700 transition-colors text-sm"
                        >
                          Approve
                        </button>
                        <button className="bg-red-600 text-white px-4 py-2 rounded-xl hover:bg-red-700 transition-colors text-sm">
                          Reject
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {activeSection === 'settings' && (
            <div className="space-y-6">
              <h2 className="text-2xl font-bold text-gray-900">System Settings</h2>
              
              <div className="grid md:grid-cols-2 gap-6">
                <div className="bg-white rounded-3xl shadow-lg p-6">
                  <h3 className="text-lg font-semibold text-gray-900 mb-4">System Configuration</h3>
                  <div className="space-y-4">
                    <div className="flex items-center justify-between">
                      <span className="text-gray-700">Auto-verification</span>
                      <button className="bg-green-500 w-12 h-6 rounded-full relative">
                        <span className="absolute right-1 top-1 w-4 h-4 bg-white rounded-full"></span>
                      </button>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-gray-700">Emergency mode</span>
                      <button className="bg-gray-300 w-12 h-6 rounded-full relative">
                        <span className="absolute left-1 top-1 w-4 h-4 bg-white rounded-full"></span>
                      </button>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-gray-700">Real-time notifications</span>
                      <button className="bg-green-500 w-12 h-6 rounded-full relative">
                        <span className="absolute right-1 top-1 w-4 h-4 bg-white rounded-full"></span>
                      </button>
                    </div>
                  </div>
                </div>

                <div className="bg-white rounded-3xl shadow-lg p-6">
                  <h3 className="text-lg font-semibold text-gray-900 mb-4">Quick Actions</h3>
                  <div className="space-y-3">
                    <button className="w-full bg-blue-600 text-white py-3 px-4 rounded-xl hover:bg-blue-700 transition-colors text-left">
                      📊 Generate System Report
                    </button>
                    <button className="w-full bg-green-600 text-white py-3 px-4 rounded-xl hover:bg-green-700 transition-colors text-left">
                      💰 Process Settlements
                    </button>
                    <button className="w-full bg-purple-600 text-white py-3 px-4 rounded-xl hover:bg-purple-700 transition-colors text-left">
                      🔄 Sync Blockchain Data
                    </button>
                    <button className="w-full bg-orange-600 text-white py-3 px-4 rounded-xl hover:bg-orange-700 transition-colors text-left">
                      📧 Send Notifications
                    </button>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default AdminPanel;