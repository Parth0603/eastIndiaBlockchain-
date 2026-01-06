import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import apiService from '../services/api';
import LoadingSpinner from '../components/common/LoadingSpinner';

const Donate = () => {
  const navigate = useNavigate();
  const [campaigns, setCampaigns] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [selectedDisasterType, setSelectedDisasterType] = useState('');
  const [selectedRegion, setSelectedRegion] = useState('');

  const disasterTypes = ['All', 'earthquake', 'flood', 'hurricane', 'wildfire', 'tornado', 'drought', 'tsunami'];
  const regions = ['All', 'Asia', 'Europe', 'Americas', 'Africa', 'Middle East', 'Oceania'];

  // Fetch campaigns from backend
  useEffect(() => {
    const fetchCampaigns = async () => {
      try {
        setLoading(true);
        setError(null);
        
        // Get approved campaigns from backend
        const response = await apiService.getCampaigns({ 
          status: 'approved',
          limit: 50 
        });
        
        if (response.success) {
          setCampaigns(response.data.campaigns);
        } else {
          throw new Error(response.message || 'Failed to load campaigns');
        }
      } catch (err) {
        console.error('Error fetching campaigns:', err);
        setError('Failed to load campaigns. Please try again.');
      } finally {
        setLoading(false);
      }
    };

    fetchCampaigns();
  }, []);

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
                    <div className="bg-green-500 text-white px-3 py-1 rounded-full text-sm font-medium flex items-center">
                      <svg className="w-4 h-4 mr-1" fill="currentColor" viewBox="0 0 20 20">
                        <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                      </svg>
                      Verified
                    </div>
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
    </div>
  );
};

export default Donate;