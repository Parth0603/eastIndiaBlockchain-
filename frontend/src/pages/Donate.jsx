import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';
import { useWallet } from '../hooks/useWallet';
import { usePageTitle } from '../hooks/usePageTitle';
import apiService from '../services/api';
import LoadingSpinner from '../components/common/LoadingSpinner';

const Donate = () => {
  const navigate = useNavigate();
  const { isAuthenticated, user, authenticateWithWallet } = useAuth();
  const { isConnected, connectWallet, web3, account } = useWallet();
  
  // Set page title
  usePageTitle('Campaigns');
  const [campaigns, setCampaigns] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [selectedDisasterType, setSelectedDisasterType] = useState('');
  const [selectedRegion, setSelectedRegion] = useState('');
  const [showAdminModal, setShowAdminModal] = useState(false);
  const [adminCredentials, setAdminCredentials] = useState({ id: '', password: '' });
  const [adminError, setAdminError] = useState('');
  const [isAuthenticating, setIsAuthenticating] = useState(false);

  const disasterTypes = ['All', 'earthquake', 'flood', 'hurricane', 'wildfire', 'tornado', 'drought', 'tsunami'];
  const regions = ['All', 'Asia', 'Europe', 'Americas', 'Africa', 'Middle East', 'Oceania'];

  // Dummy campaigns for demo
  const dummyCampaigns = [
    {
      id: 'camp-001',
      title: 'Turkey Earthquake Emergency Relief',
      description: 'Urgent aid needed for earthquake victims in Turkey. Providing emergency shelter, food, and medical supplies.',
      location: 'Turkey, Middle East',
      disasterType: 'earthquake',
      urgency: 'Critical',
      raised: 125000,
      goal: 200000,
      beneficiaries: 1500,
      categories: ['Emergency Shelter', 'Medical Aid', 'Food Relief'],
      submittedAt: '2024-01-05T10:00:00Z'
    },
    {
      id: 'camp-002',
      title: 'Philippines Typhoon Recovery',
      description: 'Supporting communities affected by Typhoon Mawar. Focus on rebuilding homes and restoring clean water access.',
      location: 'Philippines, Asia',
      disasterType: 'hurricane',
      urgency: 'High',
      raised: 89000,
      goal: 150000,
      beneficiaries: 800,
      categories: ['Clean Water', 'Housing Reconstruction', 'Community Support'],
      submittedAt: '2024-01-04T14:30:00Z'
    },
    {
      id: 'camp-003',
      title: 'California Wildfire Relief Fund',
      description: 'Emergency assistance for families displaced by wildfires. Providing temporary housing and essential supplies.',
      location: 'California, Americas',
      disasterType: 'wildfire',
      urgency: 'High',
      raised: 67000,
      goal: 100000,
      beneficiaries: 450,
      categories: ['Temporary Housing', 'Emergency Supplies', 'Family Support'],
      submittedAt: '2024-01-03T09:15:00Z'
    },
    {
      id: 'camp-004',
      title: 'Bangladesh Flood Emergency',
      description: 'Monsoon floods have displaced thousands. Urgent need for food, clean water, and medical assistance.',
      location: 'Bangladesh, Asia',
      disasterType: 'flood',
      urgency: 'Critical',
      raised: 45000,
      goal: 120000,
      beneficiaries: 2000,
      categories: ['Food Relief', 'Clean Water', 'Medical Aid', 'Emergency Shelter'],
      submittedAt: '2024-01-02T16:45:00Z'
    },
    {
      id: 'camp-005',
      title: 'Morocco Earthquake Recovery',
      description: 'Long-term recovery support for earthquake-affected communities. Focus on rebuilding infrastructure and schools.',
      location: 'Morocco, Africa',
      disasterType: 'earthquake',
      urgency: 'Medium',
      raised: 78000,
      goal: 180000,
      beneficiaries: 1200,
      categories: ['Infrastructure', 'Education Support', 'Community Rebuilding'],
      submittedAt: '2024-01-01T11:20:00Z'
    }
  ];

  // Fetch campaigns from backend
  useEffect(() => {
    const fetchCampaigns = async () => {
      try {
        setLoading(true);
        setError(null);
        
        // Get user-created campaigns from localStorage
        const userCreatedCampaigns = JSON.parse(localStorage.getItem('userCreatedCampaigns') || '[]');
        
        // Try to get approved campaigns from backend
        try {
          const response = await apiService.getCampaigns({ 
            status: 'approved',
            limit: 50 
          });
          
          if (response.success && response.data.campaigns.length > 0) {
            // Merge backend campaigns with user-created campaigns
            const allCampaigns = [...userCreatedCampaigns, ...response.data.campaigns];
            setCampaigns(allCampaigns);
          } else {
            // If no backend campaigns, use dummy campaigns + user-created campaigns
            const allCampaigns = [...userCreatedCampaigns, ...dummyCampaigns];
            setCampaigns(allCampaigns);
          }
        } catch (backendError) {
          console.log('Backend not available, using dummy campaigns + user-created campaigns for demo');
          const allCampaigns = [...userCreatedCampaigns, ...dummyCampaigns];
          setCampaigns(allCampaigns);
        }
      } catch (err) {
        console.error('Error fetching campaigns:', err);
        // Fallback to dummy campaigns only
        setCampaigns(dummyCampaigns);
      } finally {
        setLoading(false);
      }
    };

    fetchCampaigns();

    // Listen for storage changes to refresh campaigns when new ones are added
    const handleStorageChange = (e) => {
      if (e.key === 'userCreatedCampaigns') {
        fetchCampaigns();
      }
    };

    window.addEventListener('storage', handleStorageChange);
    
    // Also listen for focus events to refresh when returning to the page
    const handleFocus = () => {
      fetchCampaigns();
    };

    window.addEventListener('focus', handleFocus);

    return () => {
      window.removeEventListener('storage', handleStorageChange);
      window.removeEventListener('focus', handleFocus);
    };
  }, []);

  const handleAuthenticate = async () => {
    if (!isConnected) {
      setAdminError('Please connect your wallet first.');
      return;
    }

    if (!web3 || !account) {
      setAdminError('Wallet connection not established. Please try again.');
      return;
    }

    setIsAuthenticating(true);
    setAdminError('');

    try {
      // Authenticate with wallet - use 'admin' role for admin access
      await authenticateWithWallet(web3, account, 'admin', {});
      setAdminError('');
      // The component will re-render with updated authentication state
    } catch (error) {
      console.error('Authentication error:', error);
      if (error.code === 4001) {
        setAdminError('Authentication cancelled. Please approve the wallet signature to continue.');
      } else if (error.message.includes('User rejected')) {
        setAdminError('Authentication cancelled. Please approve the wallet signature to continue.');
      } else {
        setAdminError(`Authentication failed: ${error.message}`);
      }
    } finally {
      setIsAuthenticating(false);
    }
  };

  const handleAdminLogin = async () => {
    // Check if wallet is connected
    if (!isConnected) {
      setAdminError('Please connect your wallet first.');
      return;
    }

    // Check if user is authenticated
    if (!isAuthenticated) {
      setAdminError('Please authenticate with your wallet first.');
      return;
    }

    // Check admin credentials
    if (adminCredentials.id === 'admin' && adminCredentials.password === 'admin123') {
      setShowAdminModal(false);
      setAdminCredentials({ id: '', password: '' });
      setAdminError('');
      // Navigate to campaign creation form
      navigate('/admin/create-campaign');
    } else {
      setAdminError('Invalid credentials. Please try again.');
    }
  };

  const handleEnterCampaign = async () => {
    // Check if wallet is connected first
    if (!isConnected) {
      try {
        await connectWallet();
        // After wallet connection, show the modal
        setShowAdminModal(true);
        setAdminError('');
      } catch (error) {
        setAdminError('Wallet connection required for admin access.');
      }
    } else {
      setShowAdminModal(true);
      setAdminError('');
    }
  };

  const filteredCampaigns = campaigns.filter(campaign => {
    const typeMatch = !selectedDisasterType || selectedDisasterType === 'All' || campaign.disasterType === selectedDisasterType;
    const regionMatch = !selectedRegion || selectedRegion === 'All' || campaign.location.includes(selectedRegion);
    return typeMatch && regionMatch;
  });

  const handleDonateClick = (campaign) => {
    navigate(`/donate/${campaign.id}`);
  };

  const clearFilters = () => {
    setSelectedDisasterType('');
    setSelectedRegion('');
  };

  const getDisasterIcon = (disasterType) => {
    const icons = {
      'earthquake': '🏚️',
      'flood': '🌊',
      'hurricane': '🌀',
      'wildfire': '🔥',
      'tornado': '🌪️',
      'drought': '🌵',
      'tsunami': '🌊',
      'volcanic_eruption': '🌋'
    };
    return icons[disasterType] || '🆘';
  };

  const getProgressPercentage = (raised, goal) => {
    return Math.min((raised / goal) * 100, 100);
  };

  const formatTimeAgo = (dateString) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffInHours = Math.floor((now - date) / (1000 * 60 * 60));
    
    if (diffInHours < 1) return 'Just now';
    if (diffInHours < 24) return `${diffInHours} hours ago`;
    const diffInDays = Math.floor(diffInHours / 24);
    return `${diffInDays} days ago`;
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-blue-50 flex items-center justify-center">
        <LoadingSpinner />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-blue-50">
      {/* Hero Section */}
      <div className="bg-blue-600 text-white py-16">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <h1 className="text-4xl md:text-5xl font-bold mb-4">
            Active Disaster Relief Campaigns
          </h1>
          <p className="text-xl text-blue-100 max-w-3xl mx-auto">
            Support verified relief efforts worldwide. Every donation is tracked on blockchain for complete transparency.
          </p>
        </div>
      </div>

      {/* Filters Section */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="bg-white rounded-2xl shadow-lg p-6 mb-8">
          <div className="flex flex-col md:flex-row gap-4 items-center justify-between">
            <div className="flex flex-col sm:flex-row gap-4 flex-1">
              {/* Disaster Type Filter */}
              <div className="relative">
                <select
                  value={selectedDisasterType}
                  onChange={(e) => setSelectedDisasterType(e.target.value)}
                  className="appearance-none bg-gray-50 border border-gray-300 rounded-xl px-4 py-3 pr-8 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent min-w-[200px]"
                >
                  <option value="">Filter by Disaster Type</option>
                  {disasterTypes.map(type => (
                    <option key={type} value={type}>{type.charAt(0).toUpperCase() + type.slice(1)}</option>
                  ))}
                </select>
                <div className="absolute inset-y-0 right-0 flex items-center px-2 pointer-events-none">
                  <svg className="w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                  </svg>
                </div>
              </div>

              {/* Region Filter */}
              <div className="relative">
                <select
                  value={selectedRegion}
                  onChange={(e) => setSelectedRegion(e.target.value)}
                  className="appearance-none bg-gray-50 border border-gray-300 rounded-xl px-4 py-3 pr-8 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent min-w-[200px]"
                >
                  <option value="">Filter by Region</option>
                  {regions.map(region => (
                    <option key={region} value={region}>{region}</option>
                  ))}
                </select>
                <div className="absolute inset-y-0 right-0 flex items-center px-2 pointer-events-none">
                  <svg className="w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                  </svg>
                </div>
              </div>
            </div>

            {/* Clear Filters Button */}
            {(selectedDisasterType || selectedRegion) && (
              <button
                onClick={clearFilters}
                className="px-6 py-3 text-gray-600 bg-gray-100 hover:bg-gray-200 rounded-xl transition-colors duration-200 font-medium"
              >
                Clear Filters
              </button>
            )}

            {/* Enter Campaign Button */}
            <button
              onClick={handleEnterCampaign}
              className="px-6 py-3 bg-purple-600 text-white hover:bg-purple-700 rounded-xl transition-colors duration-200 font-medium flex items-center"
            >
              <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
              </svg>
              Enter a Campaign
            </button>
          </div>
        </div>

        {/* Error State */}
        {error && (
          <div className="bg-red-50 border border-red-200 rounded-2xl p-6 mb-8">
            <div className="flex items-center">
              <svg className="w-6 h-6 text-red-500 mr-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              <p className="text-red-700">{error}</p>
            </div>
          </div>
        )}

        {/* Results Count */}
        <div className="mb-6">
          <p className="text-gray-600">
            Showing <span className="font-semibold text-gray-900">{filteredCampaigns.length}</span> active campaigns
          </p>
        </div>

        {/* Campaigns Grid */}
        {filteredCampaigns.length > 0 ? (
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
            {filteredCampaigns.map((campaign) => (
              <div key={campaign.id} className="bg-white rounded-3xl shadow-lg overflow-hidden hover:shadow-2xl transition-all duration-300 hover:-translate-y-2 group">
                {/* Campaign Image */}
                <div className="relative h-48 bg-blue-100 overflow-hidden">
                  <div className="absolute inset-0 flex items-center justify-center">
                    <div className="text-6xl opacity-20">
                      {getDisasterIcon(campaign.disasterType)}
                    </div>
                  </div>
                  
                  {/* Verified Badge */}
                  <div className="absolute top-4 left-4">
                    {campaign.id.startsWith('camp-') && campaign.id.length > 10 ? (
                      // User-created campaign (has timestamp in ID)
                      <div className="bg-purple-500 text-white px-3 py-1 rounded-full text-sm font-medium flex items-center">
                        <svg className="w-4 h-4 mr-1" fill="currentColor" viewBox="0 0 20 20">
                          <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                        </svg>
                        New Campaign
                      </div>
                    ) : (
                      // Demo/backend campaign
                      <div className="bg-green-500 text-white px-3 py-1 rounded-full text-sm font-medium flex items-center">
                        <svg className="w-4 h-4 mr-1" fill="currentColor" viewBox="0 0 20 20">
                          <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                        </svg>
                        Verified
                      </div>
                    )}
                  </div>

                  {/* Urgency Badge */}
                  <div className="absolute top-4 right-4">
                    <div className={`px-3 py-1 rounded-full text-sm font-medium ${
                      campaign.urgency === 'Critical' ? 'bg-red-500 text-white' :
                      campaign.urgency === 'High' ? 'bg-orange-500 text-white' :
                      'bg-yellow-500 text-white'
                    }`}>
                      {campaign.urgency}
                    </div>
                  </div>
                </div>

                {/* Campaign Content */}
                <div className="p-6">
                  <div className="mb-4">
                    <h3 className="text-xl font-bold text-gray-900 mb-2 group-hover:text-blue-600 transition-colors">
                      {campaign.title}
                    </h3>
                    <p className="text-gray-600 text-sm leading-relaxed mb-3">
                      {campaign.description}
                    </p>
                    <div className="flex items-center text-sm text-gray-500 mb-3">
                      <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                      </svg>
                      {campaign.location}
                    </div>
                  </div>

                  {/* Categories */}
                  <div className="flex flex-wrap gap-2 mb-4">
                    {campaign.categories.slice(0, 3).map((category) => (
                      <span key={category} className="px-2 py-1 text-xs bg-blue-100 text-blue-800 rounded-full font-medium">
                        {category}
                      </span>
                    ))}
                    {campaign.categories.length > 3 && (
                      <span className="px-2 py-1 text-xs bg-gray-100 text-gray-600 rounded-full font-medium">
                        +{campaign.categories.length - 3} more
                      </span>
                    )}
                  </div>

                  {/* Progress Section */}
                  <div className="mb-6">
                    <div className="flex justify-between items-center mb-2">
                      <span className="text-sm font-medium text-gray-700">Progress</span>
                      <span className="text-sm font-bold text-gray-900">{Math.round(getProgressPercentage(campaign.raised, campaign.goal))}%</span>
                    </div>
                    
                    {/* Progress Bar */}
                    <div className="w-full bg-gray-200 rounded-full h-3 mb-3 overflow-hidden">
                      <div
                        className="h-full bg-blue-500 rounded-full transition-all duration-500 ease-out"
                        style={{ width: `${getProgressPercentage(campaign.raised, campaign.goal)}%` }}
                      ></div>
                    </div>
                    
                    {/* Funding Details */}
                    <div className="flex justify-between text-sm">
                      <span className="text-gray-600">
                        <span className="font-semibold text-gray-900">${campaign.raised.toLocaleString()}</span> raised
                      </span>
                      <span className="text-gray-600">
                        of <span className="font-semibold text-gray-900">${campaign.goal.toLocaleString()}</span> goal
                      </span>
                    </div>
                  </div>

                  {/* Stats Row */}
                  <div className="flex justify-between items-center mb-6 text-sm text-gray-600">
                    <div className="flex items-center">
                      <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
                      </svg>
                      {campaign.beneficiaries} {campaign.beneficiaries === 1 ? 'person' : 'people'}
                    </div>
                    <div className="flex items-center">
                      <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                      </svg>
                      {formatTimeAgo(campaign.submittedAt)}
                    </div>
                  </div>

                  {/* Donate Button */}
                  <button
                    onClick={() => handleDonateClick(campaign)}
                    className="w-full bg-blue-600 hover:bg-blue-700 text-white font-semibold py-4 px-6 rounded-2xl transition-all duration-200 transform hover:-translate-y-1 hover:shadow-lg"
                  >
                    💝 Donate Now
                  </button>
                </div>
              </div>
            ))}
          </div>
        ) : (
          /* No Results */
          <div className="text-center py-16">
            <div className="text-6xl mb-4">🔍</div>
            <h3 className="text-xl font-semibold text-gray-900 mb-2">No campaigns found</h3>
            <p className="text-gray-600 mb-6">
              {error ? 'There was an error loading campaigns.' : 'Try adjusting your filters to see more results.'}
            </p>
            <button
              onClick={clearFilters}
              className="bg-blue-600 text-white px-6 py-3 rounded-xl hover:bg-blue-700 transition-colors"
            >
              Clear All Filters
            </button>
          </div>
        )}
      </div>

      {/* Call to Action Section */}
      <div className="bg-blue-600 py-16 mt-16">
        <div className="max-w-4xl mx-auto text-center px-4 sm:px-6 lg:px-8">
          <h2 className="text-3xl font-bold text-white mb-4">
            Every Donation Makes a Difference
          </h2>
          <p className="text-xl text-blue-100 mb-8">
            Join thousands of donors making transparent, trackable impact through blockchain technology.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <button 
              onClick={() => navigate('/how-it-works')}
              className="bg-white text-blue-600 px-8 py-4 rounded-2xl font-semibold hover:bg-gray-50 transition-colors"
            >
              🔍 Learn How It Works
            </button>
            <button 
              onClick={() => navigate('/public-transparency')}
              className="bg-transparent border-2 border-white text-white px-8 py-4 rounded-2xl font-semibold hover:bg-white/10 transition-colors"
            >
              📊 View Transparency Dashboard
            </button>
          </div>
        </div>
      </div>

      {/* Admin Login Modal */}
      {showAdminModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-2xl p-8 max-w-md w-full mx-4">
            <div className="text-center mb-6">
              <div className="w-16 h-16 bg-purple-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <svg className="w-8 h-8 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                </svg>
              </div>
              <h3 className="text-2xl font-bold text-gray-900 mb-2">Admin Access Required</h3>
              <p className="text-gray-600">Wallet authentication + admin credentials required</p>
            </div>

            {/* Wallet Status */}
            <div className="mb-4">
              <div className={`flex items-center p-3 rounded-xl ${
                isConnected && isAuthenticated 
                  ? 'bg-green-50 border border-green-200' 
                  : 'bg-yellow-50 border border-yellow-200'
              }`}>
                <div className={`w-3 h-3 rounded-full mr-3 ${
                  isConnected && isAuthenticated ? 'bg-green-500' : 'bg-yellow-500'
                }`}></div>
                <div className="flex-1">
                  <div className="text-sm font-medium">
                    {isConnected && isAuthenticated 
                      ? `✅ Wallet Connected & Authenticated` 
                      : isConnected 
                        ? '⚠️ Wallet Connected - Please Authenticate'
                        : '❌ Wallet Not Connected'
                    }
                  </div>
                  {isAuthenticated && user?.roles && (
                    <div className="text-xs text-gray-600">
                      Role: {user.roles.includes('admin') ? '👑 Admin' : `${user.roles[0]} (Admin Required)`}
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* Authentication Button */}
            {isConnected && !isAuthenticated && (
              <div className="mb-4">
                <button
                  onClick={handleAuthenticate}
                  disabled={isAuthenticating}
                  className="w-full bg-blue-600 text-white px-4 py-3 rounded-xl hover:bg-blue-700 disabled:opacity-50 font-medium transition-colors flex items-center justify-center"
                >
                  {isAuthenticating ? (
                    <>
                      <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                      </svg>
                      Authenticating...
                    </>
                  ) : (
                    <>
                      <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                      </svg>
                      Authenticate with Wallet
                    </>
                  )}
                </button>
              </div>
            )}

            {/* Connect Wallet Button */}
            {!isConnected && (
              <div className="mb-4">
                <button
                  onClick={connectWallet}
                  className="w-full bg-blue-600 text-white px-4 py-3 rounded-xl hover:bg-blue-700 font-medium transition-colors flex items-center justify-center"
                >
                  <svg className="w-5 h-5 mr-2" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M3 4a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1zm0 4a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1zm0 4a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1z" clipRule="evenodd" />
                  </svg>
                  Connect Wallet
                </button>
              </div>
            )}

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Admin ID</label>
                <input
                  type="text"
                  value={adminCredentials.id}
                  onChange={(e) => setAdminCredentials(prev => ({ ...prev, id: e.target.value }))}
                  disabled={!isAuthenticated}
                  className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent disabled:bg-gray-100 disabled:cursor-not-allowed"
                  placeholder="Enter admin ID"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Password</label>
                <input
                  type="password"
                  value={adminCredentials.password}
                  onChange={(e) => setAdminCredentials(prev => ({ ...prev, password: e.target.value }))}
                  disabled={!isAuthenticated}
                  className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent disabled:bg-gray-100 disabled:cursor-not-allowed"
                  placeholder="Enter password"
                  onKeyPress={(e) => e.key === 'Enter' && isAuthenticated && handleAdminLogin()}
                />
              </div>

              {adminError && (
                <div className="bg-red-50 border border-red-200 rounded-xl p-3">
                  <p className="text-red-700 text-sm">{adminError}</p>
                </div>
              )}

              {!isAuthenticated && (
                <div className="bg-blue-50 border border-blue-200 rounded-xl p-3">
                  <p className="text-blue-700 text-sm">
                    <strong>Step 1:</strong> Connect and authenticate your wallet first<br />
                    <strong>Step 2:</strong> Enter admin credentials below
                  </p>
                </div>
              )}

              {isAuthenticated && (
                <div className="bg-blue-50 border border-blue-200 rounded-xl p-3">
                  <p className="text-blue-700 text-sm">
                    <strong>Demo Credentials:</strong><br />
                    ID: admin<br />
                    Password: admin123
                  </p>
                </div>
              )}
            </div>

            <div className="flex gap-3 mt-6">
              <button
                onClick={() => {
                  setShowAdminModal(false);
                  setAdminCredentials({ id: '', password: '' });
                  setAdminError('');
                }}
                className="flex-1 px-6 py-3 text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-xl transition-colors font-medium"
              >
                Cancel
              </button>
              <button
                onClick={handleAdminLogin}
                disabled={!isAuthenticated}
                className="flex-1 px-6 py-3 bg-purple-600 text-white hover:bg-purple-700 disabled:bg-gray-400 disabled:cursor-not-allowed rounded-xl transition-colors font-medium"
              >
                {isAuthenticated ? 'Login' : 'Authenticate First'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Donate;