import { useState, useEffect } from 'react';
import { useAuth } from '../hooks/useAuth';
import { useWallet } from '../hooks/useWallet';
import { usePageTitle } from '../hooks/usePageTitle';
import apiService from '../services/api';

const DonorDashboard = () => {
  const { isAuthenticated, user } = useAuth();
  const { isConnected, account } = useWallet();
  
  // Set page title
  usePageTitle('Dashboard');
  const [donorProfile, setDonorProfile] = useState(null);
  const [donationStats, setDonationStats] = useState(null);
  const [recentDonations, setRecentDonations] = useState([]);
  const [availableCampaigns, setAvailableCampaigns] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Fetch donor data from backend
  useEffect(() => {
    const fetchDonorData = async () => {
      if (!isConnected || !account) {
        setLoading(false);
        return;
      }

      // If connected but not authenticated, don't try to fetch data
      if (!isAuthenticated) {
        setLoading(false);
        setDonorProfile(null);
        setDonationStats(null);
        setRecentDonations([]);
        setAvailableCampaigns([]);
        return;
      }

      try {
        setLoading(true);
        setError(null);

        console.log('Fetching donor data - authenticated:', isAuthenticated, 'user:', user?.roles);

        // Get donor profile and donation stats
        const [campaignsResponse, donationsResponse] = await Promise.all([
          apiService.getCampaigns().catch(err => {
            console.error('Failed to fetch campaigns:', err);
            return { success: false, error: err.message };
          }),
          apiService.getDonationHistory({ limit: 10 }).catch(err => {
            console.error('Failed to fetch donation history:', err);
            return { success: false, error: err.message };
          })
        ]);

        // Set donor profile from user data
        if (user && user.profile) {
          setDonorProfile({
            name: user.profile.fullName || 'Anonymous Donor',
            id: `DON-${account.slice(-6).toUpperCase()}`,
            type: user.profile.donorType || 'individual',
            verified: true,
            image: '/api/placeholder/80/80',
            totalDonated: 0,
            campaignsSupported: 0
          });
        } else {
          setDonorProfile({
            name: 'Anonymous Donor',
            id: `DON-${account.slice(-6).toUpperCase()}`,
            type: 'individual',
            verified: true,
            image: '/api/placeholder/80/80',
            totalDonated: 0,
            campaignsSupported: 0
          });
        }

        // Handle campaigns response
        if (campaignsResponse.success) {
          setAvailableCampaigns(campaignsResponse.data.campaigns || []);
        } else {
          setAvailableCampaigns([]);
        }

        // Handle donations response
        if (donationsResponse.success && donationsResponse.data) {
          const donations = donationsResponse.data.donations || [];
          setRecentDonations(donations.slice(0, 5));
          
          // Use statistics from backend response if available
          if (donationsResponse.data.statistics) {
            const stats = donationsResponse.data.statistics;
            setDonationStats({
              totalDonated: parseFloat(stats.totalDonated || 0),
              totalDonations: stats.donationCount || 0,
              campaignsSupported: 0, // Backend doesn't track this yet
              averageDonation: parseFloat(stats.averageDonation || 0)
            });

            // Update profile with stats
            setDonorProfile(prev => ({
              ...prev,
              totalDonated: parseFloat(stats.totalDonated || 0),
              campaignsSupported: 0
            }));
          } else {
            // Calculate stats from donations
            const totalDonated = donations.reduce((sum, donation) => sum + parseFloat(donation.amount || 0), 0);
            const uniqueCampaigns = new Set(donations.map(d => d.campaignId)).size;
            
            setDonationStats({
              totalDonated: totalDonated,
              totalDonations: donations.length,
              campaignsSupported: uniqueCampaigns,
              averageDonation: donations.length > 0 ? totalDonated / donations.length : 0
            });

            // Update profile with stats
            setDonorProfile(prev => ({
              ...prev,
              totalDonated: totalDonated,
              campaignsSupported: uniqueCampaigns
            }));
          }
        } else {
          // No donations available or error occurred
          console.log('No donation history available:', donationsResponse.error);
          setRecentDonations([]);
          setDonationStats({
            totalDonated: 0,
            totalDonations: 0,
            campaignsSupported: 0,
            averageDonation: 0
          });
        }

      } catch (error) {
        console.error('Error fetching donor data:', error);
        setError('Failed to load donor data');
      } finally {
        setLoading(false);
      }
    };

    fetchDonorData();
  }, [isConnected, account, isAuthenticated, user]);

  const getTimeAgo = (date) => {
    const now = new Date();
    const diffInHours = Math.floor((now - date) / (1000 * 60 * 60));
    
    if (diffInHours < 1) return 'Just now';
    if (diffInHours < 24) return `${diffInHours} hours ago`;
    const diffInDays = Math.floor(diffInHours / 24);
    if (diffInDays < 7) return `${diffInDays} days ago`;
    const diffInWeeks = Math.floor(diffInDays / 7);
    return `${diffInWeeks} weeks ago`;
  };

  if (!isConnected || !isAuthenticated) {
    return (
      <div className="min-h-screen bg-blue-50 flex items-center justify-center">
        <div className="max-w-md w-full bg-white rounded-3xl shadow-2xl p-8 text-center">
          <div className="w-20 h-20 bg-blue-500 rounded-2xl flex items-center justify-center mx-auto mb-6">
            <span className="text-3xl">💝</span>
          </div>
          <h2 className="text-2xl font-bold text-gray-900 mb-4">Access Donor Dashboard</h2>
          <p className="text-gray-600 mb-6">
            {!isConnected 
              ? "Connect your wallet to access your donor dashboard and make transparent donations."
              : "Please complete authentication to access your donor dashboard."
            }
          </p>
          <div className="text-sm text-gray-500">
            {!isConnected 
              ? 'Use the "Connect Wallet" button in the header to get started.'
              : 'You need to sign up or authenticate as a donor to access this dashboard.'
            }
          </div>
          {isConnected && !isAuthenticated && (
            <div className="mt-4">
              <button
                onClick={() => window.location.href = '/signup/donor'}
                className="bg-blue-600 text-white px-6 py-3 rounded-xl hover:bg-blue-700 transition-colors"
              >
                Register as Donor
              </button>
            </div>
          )}
        </div>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-blue-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading your donor dashboard...</p>
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
      {/* Header */}
      <div className="bg-white shadow-sm border-b">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <div className="flex items-center justify-between">
            <h1 className="text-3xl font-bold text-gray-900">Donor Dashboard</h1>
            <div className="flex items-center space-x-3">
              <div className="text-sm text-gray-600">Welcome back!</div>
              <div className="w-10 h-10 bg-blue-500 rounded-full flex items-center justify-center">
                <span className="text-white font-semibold">💝</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        {/* Donation Stats Card */}
        <div className="bg-blue-500 rounded-3xl shadow-lg p-8 mb-8 text-white text-center">
          <h2 className="text-xl font-semibold mb-4">My Donation Impact</h2>
          <div className="grid md:grid-cols-3 gap-6">
            <div>
              <div className="text-3xl font-bold mb-2">
                ₹{donationStats?.totalDonated?.toFixed(0) || '0'}
              </div>
              <div className="text-blue-100 text-sm">Total Donated</div>
            </div>
            <div>
              <div className="text-3xl font-bold mb-2">
                {donationStats?.totalDonations || 0}
              </div>
              <div className="text-blue-100 text-sm">Donations Made</div>
            </div>
            <div>
              <div className="text-3xl font-bold mb-2">
                {donationStats?.campaignsSupported || 0}
              </div>
              <div className="text-blue-100 text-sm">Campaigns Supported</div>
            </div>
          </div>
        </div>

        {/* Make Donation Button */}
        <div className="mb-8">
          <button
            onClick={() => window.location.href = '/donate'}
            className="w-full bg-green-500 hover:bg-green-600 text-white font-semibold py-4 px-6 rounded-3xl shadow-lg hover:shadow-xl transition-all duration-200 transform hover:-translate-y-1 flex items-center justify-center text-lg"
          >
            💝 Make a New Donation
          </button>
        </div>
        
        {/* Available Campaigns */}
        <div className="mb-8">
          <h3 className="text-xl font-semibold text-gray-900 mb-6">Active Campaigns</h3>
          {availableCampaigns.length > 0 ? (
            <div className="grid md:grid-cols-2 gap-6">
              {availableCampaigns.slice(0, 4).map((campaign) => (
                <div
                  key={campaign.id}
                  className="bg-white rounded-3xl shadow-lg p-6 cursor-pointer transition-all duration-200 hover:shadow-xl hover:-translate-y-1"
                  onClick={() => window.location.href = `/donate/${campaign.id}`}
                >
                  <div className="flex items-start mb-4">
                    <div className="w-16 h-16 bg-blue-100 rounded-2xl flex items-center justify-center mr-4 flex-shrink-0">
                      <span className="text-2xl">🏥</span>
                    </div>
                    <div className="flex-1">
                      <h4 className="text-lg font-semibold text-gray-900 mb-1">{campaign.title}</h4>
                      <div className="text-sm text-gray-600 mb-2">
                        {campaign.location}
                      </div>
                      <div className="text-sm text-gray-500 line-clamp-2">
                        {campaign.description}
                      </div>
                    </div>
                  </div>
                  
                  {/* Progress Bar */}
                  <div className="mb-3">
                    <div className="flex justify-between text-sm text-gray-600 mb-1">
                      <span>Progress</span>
                      <span>{Math.round((campaign.raised / campaign.target) * 100)}%</span>
                    </div>
                    <div className="w-full bg-gray-200 rounded-full h-2">
                      <div 
                        className="bg-blue-500 h-2 rounded-full"
                        style={{ width: `${Math.min((campaign.raised / campaign.target) * 100, 100)}%` }}
                      ></div>
                    </div>
                  </div>
                  
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-600">Raised: ₹{campaign.raised?.toFixed(0)}</span>
                    <span className="text-gray-600">Goal: ₹{campaign.target?.toFixed(0)}</span>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="bg-white rounded-3xl shadow-lg p-8 text-center">
              <div className="text-4xl mb-4">🏥</div>
              <h4 className="text-lg font-semibold text-gray-900 mb-2">No Active Campaigns</h4>
              <p className="text-gray-600">No campaigns are currently accepting donations.</p>
            </div>
          )}
        </div>

        {/* Recent Donations */}
        <div className="bg-white rounded-3xl shadow-lg p-6 mb-8">
          <h3 className="text-xl font-semibold text-gray-900 mb-6">Recent Donations</h3>
          {recentDonations.length > 0 ? (
            <div className="space-y-4">
              {recentDonations.map((donation) => (
                <div key={donation.id} className="flex items-center justify-between p-4 bg-gray-50 rounded-2xl">
                  <div className="flex items-center">
                    <div className="w-12 h-12 bg-green-100 rounded-xl flex items-center justify-center mr-4">
                      <span className="text-xl">💝</span>
                    </div>
                    <div>
                      <div className="font-semibold text-gray-900">Disaster Relief Donation</div>
                      <div className="text-sm text-gray-600">Transaction: {donation.transactionHash?.slice(0, 10)}...</div>
                      <div className="text-xs text-gray-500">{getTimeAgo(new Date(donation.timestamp))}</div>
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="font-semibold text-gray-900">₹{parseFloat(donation.amount || 0).toFixed(0)}</div>
                    <div className={`text-xs px-2 py-1 rounded-full ${
                      donation.status === 'completed' ? 'bg-green-100 text-green-800' :
                      donation.status === 'pending' ? 'bg-yellow-100 text-yellow-800' :
                      'bg-gray-100 text-gray-800'
                    }`}>
                      {donation.status || 'completed'}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-8">
              <div className="text-4xl mb-4">📋</div>
              <h4 className="text-lg font-semibold text-gray-900 mb-2">No Donations Yet</h4>
              <p className="text-gray-600">Your donation history will appear here once you start making donations.</p>
            </div>
          )}
        </div>

        {/* Help Section */}
        <div className="bg-blue-50 border border-blue-200 rounded-3xl p-6">
          <div className="text-center">
            <div className="w-16 h-16 bg-blue-500 rounded-full flex items-center justify-center mx-auto mb-4">
              <span className="text-2xl">💡</span>
            </div>
            <h3 className="text-lg font-semibold text-gray-900 mb-2">Need Help?</h3>
            <p className="text-gray-600 mb-4">
              Contact our support team if you need assistance with donations or tracking your impact.
            </p>
            <div className="flex flex-col sm:flex-row gap-3 justify-center">
              <button className="bg-blue-600 text-white px-6 py-2 rounded-xl hover:bg-blue-700 transition-colors">
                📞 Contact Support
              </button>
              <button className="bg-white text-blue-600 border border-blue-600 px-6 py-2 rounded-xl hover:bg-blue-50 transition-colors">
                📖 Donation Guide
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default DonorDashboard;