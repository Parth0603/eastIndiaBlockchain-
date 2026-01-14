import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';
import { useWallet } from '../hooks/useWallet';
import apiService from '../services/api';
import LoadingSpinner from '../components/common/LoadingSpinner';
import toast from 'react-hot-toast';

const DonationDetails = () => {
  const { eventId } = useParams();
  const navigate = useNavigate();
  const { user, isAuthenticated } = useAuth();
  const { account, connectWallet, isConnected } = useWallet();
  const [event, setEvent] = useState(null);
  const [donationAmount, setDonationAmount] = useState('');
  const [donationCategory, setDonationCategory] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [isProcessing, setIsProcessing] = useState(false);
  const [donorMessage, setDonorMessage] = useState('');
  const [error, setError] = useState(null);

  // Load campaign details
  useEffect(() => {
    const loadCampaign = async () => {
      try {
        setIsLoading(true);
        setError(null);
        
        const response = await apiService.getCampaign(eventId);
        
        if (response.success) {
          setEvent(response.data);
        } else {
          setError('Campaign not found');
        }
      } catch (err) {
        console.error('Error loading campaign:', err);
        setError('Failed to load campaign details');
      } finally {
        setIsLoading(false);
      }
    };

    if (eventId) {
      loadCampaign();
    }
  }, [eventId]);

  const getUrgencyColor = (urgency) => {
    switch (urgency) {
      case 'Critical': return 'text-red-600 bg-red-100 border-red-200';
      case 'High': return 'text-orange-600 bg-orange-100 border-orange-200';
      case 'Medium': return 'text-yellow-600 bg-yellow-100 border-yellow-200';
      default: return 'text-gray-600 bg-gray-100 border-gray-200';
    }
  };

  const getProgressPercentage = (raised, goal) => {
    return Math.min((raised / goal) * 100, 100);
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

  const handleDonate = async () => {
    if (!isAuthenticated || !isConnected) {
      toast.error('Please connect your wallet and authenticate to donate.');
      return;
    }

    if (!donationAmount || parseFloat(donationAmount) <= 0) {
      toast.error('Please enter a valid donation amount');
      return;
    }

    if (!donationCategory) {
      toast.error('Please select a donation category');
      return;
    }

    setIsProcessing(true);
    try {
      // Process donation through API
      const donationData = {
        amount: donationAmount,
        category: donationCategory,
        donor: account,
        campaignId: eventId,
        message: donorMessage
      };

      const response = await apiService.processDonation(donationData);
      
      if (response.success) {
        toast.success(`Thank you for donating $${parseFloat(donationAmount).toFixed(2)} for ${donationCategory} aid to ${event.title}!`);
        setDonationAmount('');
        setDonationCategory('');
        setDonorMessage('');
        
        // Refresh campaign data to show updated raised amount
        const updatedResponse = await apiService.getCampaign(eventId);
        if (updatedResponse.success) {
          setEvent(updatedResponse.data);
        }
      } else {
        throw new Error(response.message || 'Donation failed');
      }
      
    } catch (error) {
      console.error('Donation error:', error);
      toast.error(error.message || 'Donation failed. Please try again.');
    } finally {
      setIsProcessing(false);
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <LoadingSpinner />
      </div>
    );
  }

  if (error || !event) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center bg-white rounded-2xl shadow-xl p-8 max-w-md">
          <div className="text-6xl mb-4">🔍</div>
          <h2 className="text-2xl font-bold text-gray-900 mb-3">Campaign Not Found</h2>
          <p className="text-gray-600 mb-6">{error || 'The donation campaign you\'re looking for doesn\'t exist.'}</p>
          <button
            onClick={() => navigate('/donate')}
            className="px-6 py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-xl font-semibold shadow-lg transition-all duration-200"
          >
            ← Back to Donations
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Back Button */}
        <button
          onClick={() => navigate('/donate')}
          className="mb-6 flex items-center text-blue-600 hover:text-blue-700 font-semibold transition-colors duration-200"
        >
          <span className="mr-2">←</span> Back to Donations
        </button>

        <div className="bg-white rounded-2xl shadow-xl overflow-hidden">
          {/* Enhanced Header */}
          <div className="bg-blue-600 p-8 text-white">
            <div className="flex items-start justify-between">
              <div className="flex items-start">
                <div className="text-8xl mr-8 drop-shadow-lg">{getDisasterIcon(event.disasterType)}</div>
                <div>
                  <h1 className="text-4xl font-bold mb-3">{event.title}</h1>
                  <p className="text-blue-100 mb-3 text-lg">📍 {event.location}</p>
                  <div className="flex items-center space-x-4">
                    <span className={`px-4 py-2 text-sm font-bold rounded-full border-2 ${getUrgencyColor(event.urgency)}`}>
                      {event.urgency} Priority
                    </span>
                    <span className="text-blue-100 font-medium">
                      {event.beneficiaries} {event.beneficiaries === 1 ? 'person' : 'people'} helped
                    </span>
                  </div>
                </div>
              </div>
            </div>
          </div>

          <div className="grid lg:grid-cols-3 gap-8 p-8">
            {/* Main Content */}
            <div className="lg:col-span-2 space-y-8">
              {/* Progress Section */}
              <div className="bg-green-50 rounded-2xl p-6 border border-green-200">
                <h3 className="text-xl font-bold text-gray-900 mb-4">📊 Funding Progress</h3>
                <div className="flex justify-between text-lg font-semibold text-gray-700 mb-3">
                  <span>Raised: ${event.raised.toLocaleString()}</span>
                  <span>Goal: ${event.goal.toLocaleString()}</span>
                </div>
                <div className="w-full bg-gray-200 rounded-full h-4 mb-3">
                  <div
                    className="bg-green-500 h-4 rounded-full transition-all duration-500 shadow-sm"
                    style={{ width: `${getProgressPercentage(event.raised, event.goal)}%` }}
                  ></div>
                </div>
                <p className="text-green-700 font-semibold">
                  {Math.round(getProgressPercentage(event.raised, event.goal))}% of goal reached
                </p>
              </div>

              {/* Description */}
              <div>
                <h2 className="text-2xl font-bold text-gray-900 mb-4">📖 About This Relief Effort</h2>
                <p className="text-gray-700 leading-relaxed text-lg">{event.description}</p>
              </div>

              {/* Categories */}
              <div>
                <h3 className="text-xl font-bold text-gray-900 mb-4">🏷️ Relief Categories</h3>
                <div className="flex flex-wrap gap-3">
                  {event.categories.map((category) => (
                    <span key={category} className="px-4 py-2 text-sm font-semibold bg-blue-100 text-blue-800 rounded-full border border-blue-300">
                      {category}
                    </span>
                  ))}
                </div>
              </div>

              {/* Impact Details */}
              <div>
                <h3 className="text-xl font-bold text-gray-900 mb-4">💪 Your Impact</h3>
                <div className="space-y-3">
                  {event.impactDetails.map((impact, index) => (
                    <div key={index} className="flex items-start bg-green-50 rounded-lg p-4 border border-green-200">
                      <span className="text-green-600 mr-3 text-xl">✓</span>
                      <span className="text-gray-700 font-medium">{impact}</span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Recent Updates */}
              <div>
                <h3 className="text-xl font-bold text-gray-900 mb-4">📢 Recent Updates</h3>
                <div className="space-y-4">
                  {event.recentUpdates.map((update, index) => (
                    <div key={index} className="flex items-start bg-blue-50 rounded-lg p-4 border border-blue-200">
                      <div className="w-3 h-3 bg-blue-600 rounded-full mt-2 mr-4 flex-shrink-0"></div>
                      <p className="text-gray-700 font-medium">{update}</p>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* Enhanced Donation Panel */}
            <div className="lg:col-span-1">
              <div className="bg-gray-50 rounded-2xl p-6 sticky top-6 border border-gray-200 shadow-lg">
                
                {/* Wallet Status */}
                <div className="mb-6">
                  <h3 className="text-lg font-bold text-gray-900 mb-4">💳 Wallet Connection</h3>
                  {!isConnected ? (
                    <div className="bg-white border-2 border-dashed border-gray-300 rounded-xl p-6 text-center">
                      <div className="text-4xl mb-3">🔗</div>
                      <p className="text-gray-600 mb-4 font-medium">Connect your wallet to donate</p>
                      <button
                        onClick={connectWallet}
                        className="w-full px-6 py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-all duration-200 font-semibold shadow-lg"
                      >
                        🔗 Connect Wallet
                      </button>
                    </div>
                  ) : (
                    <div className="bg-green-50 border border-green-200 rounded-xl p-4">
                      <div className="flex items-center justify-center mb-3">
                        <div className="w-3 h-3 bg-green-500 rounded-full mr-2 animate-pulse"></div>
                        <span className="text-green-700 font-semibold">Wallet Connected</span>
                      </div>
                      
                      {/* Wallet Address */}
                      <div className="bg-white rounded-lg p-3 border border-green-100">
                        <p className="text-xs text-gray-500 mb-1">Wallet Address:</p>
                        <p className="text-sm font-mono text-gray-700 break-all">{account}</p>
                        {user && (
                          <p className="text-xs text-green-600 mt-2 font-medium">
                            ✓ Authenticated as {user.role}
                          </p>
                        )}
                      </div>
                    </div>
                  )}
                </div>

                {/* Enhanced Donation Form */}
                <div className="space-y-6">
                  <div>
                    <label className="block text-sm font-bold text-gray-900 mb-3">
                      💰 Donation Amount (USD)
                    </label>
                    
                    <div className="relative">
                      <span className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-500 font-bold text-lg">$</span>
                      <input
                        type="number"
                        value={donationAmount}
                        onChange={(e) => setDonationAmount(e.target.value)}
                        placeholder="0.00"
                        className="w-full pl-8 pr-4 py-4 border-2 border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent text-xl font-bold"
                        min="1"
                        step="0.01"
                        disabled={!isConnected || !isAuthenticated}
                      />
                    </div>
                    
                    {/* Quick amount buttons */}
                    <div className="grid grid-cols-4 gap-2 mt-4">
                      {[25, 50, 100, 250].map(amount => (
                        <button
                          key={amount}
                          onClick={() => setDonationAmount(amount.toString())}
                          disabled={!isConnected || !isAuthenticated}
                          className="px-3 py-2 text-sm font-bold bg-gray-100 text-gray-700 rounded-lg hover:bg-blue-100 hover:text-blue-700 disabled:opacity-50 disabled:cursor-not-allowed border border-gray-200 transition-all duration-200"
                        >
                          ${amount}
                        </button>
                      ))}
                    </div>
                  </div>

                  <div>
                    <label className="block text-sm font-bold text-gray-900 mb-3">
                      🏷️ Aid Category
                    </label>
                    <select
                      value={donationCategory}
                      onChange={(e) => setDonationCategory(e.target.value)}
                      className="w-full px-4 py-4 border-2 border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent text-lg font-medium bg-white"
                      disabled={!isConnected || !isAuthenticated}
                    >
                      <option value="">Select aid category...</option>
                      <option value="Food">🍽️ Food & Nutrition</option>
                      <option value="Medical">💊 Medical & Healthcare</option>
                      <option value="Shelter">🏠 Shelter & Housing</option>
                      <option value="Water">💧 Water & Sanitation</option>
                      <option value="Clothing">👕 Clothing & Essentials</option>
                      <option value="Emergency Supplies">🆘 Emergency Supplies</option>
                    </select>
                    <p className="text-xs text-gray-500 mt-2">
                      Your donation will be restricted to this category to ensure proper aid distribution
                    </p>
                  </div>

                  <div>
                    <label className="block text-sm font-bold text-gray-900 mb-3">
                      💬 Message (Optional)
                    </label>
                    <textarea
                      value={donorMessage}
                      onChange={(e) => setDonorMessage(e.target.value)}
                      placeholder="Leave a message of support and encouragement..."
                      rows={3}
                      className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none"
                      disabled={!isConnected || !isAuthenticated}
                    />
                  </div>

                  <button
                    onClick={handleDonate}
                    disabled={isProcessing || !donationAmount || !donationCategory || !isConnected || !isAuthenticated}
                    className="w-full px-6 py-4 bg-green-600 hover:bg-green-700 text-white rounded-xl disabled:opacity-50 disabled:cursor-not-allowed font-bold text-lg shadow-lg transition-all duration-200 transform hover:scale-105 disabled:hover:scale-100"
                  >
                    {isProcessing ? (
                      <div className="flex items-center justify-center">
                        <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white mr-3"></div>
                        Processing Donation...
                      </div>
                    ) : (
                      <div className="flex items-center justify-center">
                        <span className="mr-2">💝</span>
                        Donate {donationAmount ? `$${parseFloat(donationAmount).toFixed(2)}` : ''} {donationCategory ? `for ${donationCategory}` : ''}
                      </div>
                    )}
                  </button>

                  {(!isConnected || !isAuthenticated) && (
                    <div className="text-center p-4 bg-yellow-50 rounded-xl border border-yellow-200">
                      <p className="text-sm text-yellow-700 font-medium">
                        🔐 Please connect your wallet and authenticate to donate
                      </p>
                    </div>
                  )}
                </div>

                {/* Enhanced Security Info */}
                <div className="mt-6 p-4 bg-blue-50 rounded-xl border border-blue-200">
                  <h4 className="text-sm font-bold text-blue-900 mb-3 flex items-center">
                    <span className="mr-2">🔒</span> Secure Donation
                  </h4>
                  <ul className="text-xs text-blue-800 space-y-2 font-medium">
                    <li className="flex items-center">
                      <span className="mr-2">🛡️</span> Blockchain-secured transactions
                    </li>
                    <li className="flex items-center">
                      <span className="mr-2">👁️</span> 100% transparent fund tracking
                    </li>
                    <li className="flex items-center">
                      <span className="mr-2">✅</span> Smart contract verified
                    </li>
                    <li className="flex items-center">
                      <span className="mr-2">💯</span> No hidden fees
                    </li>
                  </ul>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default DonationDetails;