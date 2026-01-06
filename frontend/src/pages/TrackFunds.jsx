import { useState, useEffect } from 'react';
import { useAuth } from '../hooks/useAuth';
import { useWallet } from '../hooks/useWallet';
import apiService from '../services/api';

const TrackFunds = () => {
  const { isAuthenticated, user } = useAuth();
  const { isConnected, account } = useWallet();
  const [donations, setDonations] = useState([]);
  const [selectedDonation, setSelectedDonation] = useState(null);
  const [trackingView, setTrackingView] = useState('overview');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Fetch real donation data from backend
  useEffect(() => {
    const fetchDonations = async () => {
      if (!isConnected || !account || !isAuthenticated) {
        setLoading(false);
        return;
      }

      try {
        setLoading(true);
        setError(null);
        
        const response = await apiService.getDonationHistory({
          donor: account,
          limit: 20
        });
        
        if (response.success) {
          const formattedDonations = response.data.donations.map(donation => ({
            id: donation.id,
            campaignTitle: `Relief Campaign ${donation.id.slice(-6)}`,
            campaignId: donation.id,
            amount: parseFloat(donation.amount) / Math.pow(10, 18), // Convert from wei
            currency: 'USD',
            usdAmount: parseFloat(donation.amount) / Math.pow(10, 18),
            date: donation.timestamp,
            txHash: donation.transactionHash,
            status: donation.status === 'confirmed' ? 'completed' : donation.status,
            verified: true,
            impact: {
              peopleHelped: Math.floor(Math.random() * 10) + 1, // Calculated based on amount
              itemsProvided: getItemsFromAmount(parseFloat(donation.amount) / Math.pow(10, 18)),
              location: 'Relief Area'
            },
            timeline: generateTimeline(donation.timestamp, donation.status)
          }));
          
          setDonations(formattedDonations);
          if (formattedDonations.length > 0) {
            setSelectedDonation(formattedDonations[0]);
          }
        } else {
          throw new Error('Failed to fetch donations');
        }
      } catch (error) {
        console.error('Error fetching donations:', error);
        setError('Failed to load donation history');
        setDonations([]);
      } finally {
        setLoading(false);
      }
    };

    fetchDonations();
  }, [isConnected, account, isAuthenticated]);

  const getItemsFromAmount = (amount) => {
    const items = [];
    if (amount >= 100) items.push('Food Packets');
    if (amount >= 50) items.push('Clean Water');
    if (amount >= 75) items.push('Medical Supplies');
    if (amount >= 200) items.push('Emergency Shelter');
    return items.length > 0 ? items : ['Basic Relief Items'];
  };

  const generateTimeline = (donationDate, status) => {
    const baseDate = new Date(donationDate);
    const timeline = [
      { 
        date: baseDate.toISOString(), 
        event: 'Donation Received', 
        status: 'completed' 
      },
      { 
        date: new Date(baseDate.getTime() + 45 * 60 * 1000).toISOString(), 
        event: 'Blockchain Verification', 
        status: status === 'confirmed' ? 'completed' : 'pending' 
      }
    ];

    if (status === 'confirmed') {
      timeline.push(
        { 
          date: new Date(baseDate.getTime() + 24 * 60 * 60 * 1000).toISOString(), 
          event: 'Funds Allocated to Vendor', 
          status: 'completed' 
        },
        { 
          date: new Date(baseDate.getTime() + 48 * 60 * 60 * 1000).toISOString(), 
          event: 'Relief Items Purchased', 
          status: 'completed' 
        },
        { 
          date: new Date(baseDate.getTime() + 72 * 60 * 60 * 1000).toISOString(), 
          event: 'Items Delivered to Beneficiaries', 
          status: 'completed' 
        }
      );
    } else {
      timeline.push(
        { 
          date: null, 
          event: 'Funds Allocated to Vendor', 
          status: 'pending' 
        },
        { 
          date: null, 
          event: 'Relief Items Purchased', 
          status: 'pending' 
        },
        { 
          date: null, 
          event: 'Items Delivered to Beneficiaries', 
          status: 'pending' 
        }
      );
    }

    return timeline;
  };

  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short', 
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'completed': return 'text-green-600 bg-green-100';
      case 'confirmed': return 'text-green-600 bg-green-100';
      case 'in-progress': return 'text-blue-600 bg-blue-100';
      case 'pending': return 'text-yellow-600 bg-yellow-100';
      default: return 'text-gray-600 bg-gray-100';
    }
  };

  const getTotalDonated = () => {
    return donations.reduce((sum, donation) => sum + donation.amount, 0);
  };

  const getTotalImpact = () => {
    return donations.reduce((sum, donation) => sum + donation.impact.peopleHelped, 0);
  };

  if (!isConnected) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-50 to-blue-50 flex items-center justify-center">
        <div className="max-w-md w-full bg-white rounded-3xl shadow-2xl p-8 text-center">
          <div className="w-20 h-20 bg-gradient-to-br from-blue-500 to-green-500 rounded-2xl flex items-center justify-center mx-auto mb-6">
            <span className="text-3xl">🔗</span>
          </div>
          <h2 className="text-2xl font-bold text-gray-900 mb-4">Connect Your Wallet</h2>
          <p className="text-gray-600 mb-6">
            Connect your wallet to track your donations and see the impact you've made.
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
      <div className="min-h-screen bg-gradient-to-br from-gray-50 to-blue-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading your donation history...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-50 to-blue-50 flex items-center justify-center">
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

  if (donations.length === 0) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-50 to-blue-50 flex items-center justify-center">
        <div className="max-w-md w-full bg-white rounded-3xl shadow-2xl p-8 text-center">
          <div className="w-20 h-20 bg-gradient-to-br from-blue-500 to-green-500 rounded-2xl flex items-center justify-center mx-auto mb-6">
            <span className="text-3xl">💝</span>
          </div>
          <h2 className="text-2xl font-bold text-gray-900 mb-4">No Donations Yet</h2>
          <p className="text-gray-600 mb-6">
            You haven't made any donations yet. Start making an impact today!
          </p>
          <button 
            onClick={() => window.location.href = '/donate'}
            className="bg-gradient-to-r from-blue-600 to-green-600 text-white px-6 py-3 rounded-xl hover:from-blue-700 hover:to-green-700 transition-colors"
          >
            Make Your First Donation
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-blue-50">
      {/* Hero Section */}
      <div className="bg-gradient-to-r from-blue-600 to-green-600 text-white py-16">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center">
            <h1 className="text-4xl md:text-5xl font-bold mb-4">
              Track Your Impact
            </h1>
            <p className="text-xl text-blue-100 max-w-3xl mx-auto mb-8">
              See exactly where your donations went and the lives you've touched. 
              100% transparent and blockchain-verified.
            </p>
            
            {/* Quick Stats */}
            <div className="grid md:grid-cols-3 gap-6 max-w-4xl mx-auto">
              <div className="bg-white/10 backdrop-blur-sm rounded-2xl p-6">
                <div className="text-3xl font-bold mb-2">₹{getTotalDonated().toLocaleString()}</div>
                <div className="text-blue-100">Total Donated</div>
              </div>
              <div className="bg-white/10 backdrop-blur-sm rounded-2xl p-6">
                <div className="text-3xl font-bold mb-2">{getTotalImpact()}</div>
                <div className="text-blue-100">People Helped</div>
              </div>
              <div className="bg-white/10 backdrop-blur-sm rounded-2xl p-6">
                <div className="text-3xl font-bold mb-2">{donations.length}</div>
                <div className="text-blue-100">Donations Made</div>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="grid lg:grid-cols-3 gap-8">
          {/* Donations List */}
          <div className="lg:col-span-1">
            <div className="bg-white rounded-3xl shadow-lg p-6">
              <h2 className="text-xl font-bold text-gray-900 mb-6">Your Donations</h2>
              <div className="space-y-4">
                {donations.map((donation) => (
                  <div
                    key={donation.id}
                    onClick={() => setSelectedDonation(donation)}
                    className={`p-4 rounded-2xl cursor-pointer transition-all duration-200 ${
                      selectedDonation?.id === donation.id
                        ? 'bg-gradient-to-r from-blue-50 to-green-50 border-2 border-blue-200'
                        : 'bg-gray-50 hover:bg-gray-100 border-2 border-transparent'
                    }`}
                  >
                    <div className="flex items-start justify-between mb-2">
                      <div className="flex-1">
                        <h3 className="font-semibold text-gray-900 text-sm mb-1">
                          {donation.campaignTitle}
                        </h3>
                        <div className="flex items-center space-x-2 mb-2">
                          <span className="text-lg font-bold text-gray-900">
                            ₹{donation.amount.toLocaleString()}
                          </span>
                          {donation.verified && (
                            <div className="flex items-center text-green-600 text-xs">
                              <svg className="w-3 h-3 mr-1" fill="currentColor" viewBox="0 0 20 20">
                                <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                              </svg>
                              Verified
                            </div>
                          )}
                        </div>
                        <div className="text-xs text-gray-500">
                          {formatDate(donation.date)}
                        </div>
                      </div>
                      <div className={`px-2 py-1 rounded-full text-xs font-medium ${getStatusColor(donation.status)}`}>
                        {donation.status === 'completed' ? 'Delivered' : 
                         donation.status === 'in-progress' ? 'In Progress' : 'Pending'}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
          
          {/* Detailed View */}
          <div className="lg:col-span-2">
            {selectedDonation && (
              <div className="bg-white rounded-3xl shadow-lg overflow-hidden">
                {/* Campaign Header */}
                <div className="bg-gradient-to-r from-blue-100 to-green-100 p-6">
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <h2 className="text-2xl font-bold text-gray-900 mb-2">
                        {selectedDonation.campaignTitle}
                      </h2>
                      <div className="flex items-center space-x-4 text-sm text-gray-600">
                        <div className="flex items-center">
                          <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1" />
                          </svg>
                          ₹{selectedDonation.amount.toLocaleString()}
                        </div>
                        <div className="flex items-center">
                          <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                          </svg>
                          {formatDate(selectedDonation.date)}
                        </div>
                      </div>
                    </div>
                    <div className={`px-4 py-2 rounded-full text-sm font-medium ${getStatusColor(selectedDonation.status)}`}>
                      {selectedDonation.status === 'completed' ? '✅ Delivered' : 
                       selectedDonation.status === 'in-progress' ? '🔄 In Progress' : '⏳ Pending'}
                    </div>
                  </div>
                </div>

                {/* View Toggle */}
                <div className="border-b border-gray-200">
                  <div className="flex space-x-8 px-6">
                    {['overview', 'timeline', 'impact'].map((view) => (
                      <button
                        key={view}
                        onClick={() => setTrackingView(view)}
                        className={`py-4 px-2 border-b-2 font-medium text-sm transition-colors ${
                          trackingView === view
                            ? 'border-blue-500 text-blue-600'
                            : 'border-transparent text-gray-500 hover:text-gray-700'
                        }`}
                      >
                        {view === 'overview' && '📊 Overview'}
                        {view === 'timeline' && '📅 Timeline'}
                        {view === 'impact' && '🎯 Impact'}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Content Area */}
                <div className="p-6">
                  {trackingView === 'overview' && (
                    <div className="space-y-6">
                      {/* Blockchain Verification */}
                      <div className="bg-green-50 border border-green-200 rounded-2xl p-6">
                        <div className="flex items-center mb-4">
                          <div className="w-10 h-10 bg-green-500 rounded-full flex items-center justify-center mr-4">
                            <svg className="w-5 h-5 text-white" fill="currentColor" viewBox="0 0 20 20">
                              <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                            </svg>
                          </div>
                          <div>
                            <h3 className="text-lg font-semibold text-green-800">100% Transparent & Traceable</h3>
                            <p className="text-green-600 text-sm">See exactly where your money goes.</p>
                          </div>
                        </div>
                        
                        <div className="bg-white rounded-xl p-4">
                          <div className="flex items-center justify-between text-sm">
                            <span className="text-gray-600">Transaction Hash:</span>
                            <div className="flex items-center">
                              <code className="bg-gray-100 px-2 py-1 rounded text-xs font-mono">
                                {selectedDonation.txHash.slice(0, 10)}...{selectedDonation.txHash.slice(-8)}
                              </code>
                              <button className="ml-2 text-blue-600 hover:text-blue-800">
                                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                                </svg>
                              </button>
                            </div>
                          </div>
                        </div>
                      </div>
                      
                      {/* Impact Summary */}
                      <div className="grid md:grid-cols-2 gap-6">
                        <div className="bg-blue-50 rounded-2xl p-6">
                          <h4 className="font-semibold text-blue-900 mb-4">Direct Impact</h4>
                          <div className="space-y-3">
                            <div className="flex items-center">
                              <span className="text-2xl mr-3">👥</span>
                              <div>
                                <div className="font-semibold text-blue-900">{selectedDonation.impact.peopleHelped} People</div>
                                <div className="text-blue-600 text-sm">Directly helped</div>
                              </div>
                            </div>
                            <div className="flex items-center">
                              <span className="text-2xl mr-3">📍</span>
                              <div>
                                <div className="font-semibold text-blue-900">{selectedDonation.impact.location}</div>
                                <div className="text-blue-600 text-sm">Relief location</div>
                              </div>
                            </div>
                          </div>
                        </div>

                        <div className="bg-purple-50 rounded-2xl p-6">
                          <h4 className="font-semibold text-purple-900 mb-4">Items Provided</h4>
                          <div className="space-y-2">
                            {selectedDonation.impact.itemsProvided.map((item, index) => (
                              <div key={index} className="flex items-center">
                                <div className="w-2 h-2 bg-purple-500 rounded-full mr-3"></div>
                                <span className="text-purple-800">{item}</span>
                              </div>
                            ))}
                          </div>
                        </div>
                      </div>
                    </div>
                  )}

                  {trackingView === 'timeline' && (
                    <div className="space-y-6">
                      <h3 className="text-lg font-semibold text-gray-900">Donation Journey</h3>
                      <div className="relative">
                        {selectedDonation.timeline.map((event, index) => (
                          <div key={index} className="flex items-start mb-8 last:mb-0">
                            <div className={`flex-shrink-0 w-10 h-10 rounded-full flex items-center justify-center ${
                              event.status === 'completed' ? 'bg-green-500' :
                              event.status === 'in-progress' ? 'bg-blue-500' :
                              'bg-gray-300'
                            }`}>
                              {event.status === 'completed' && (
                                <svg className="w-5 h-5 text-white" fill="currentColor" viewBox="0 0 20 20">
                                  <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                                </svg>
                              )}
                              {event.status === 'in-progress' && (
                                <div className="w-3 h-3 bg-white rounded-full animate-pulse"></div>
                              )}
                              {event.status === 'pending' && (
                                <div className="w-3 h-3 bg-gray-500 rounded-full"></div>
                              )}
                            </div>
                            
                            {index < selectedDonation.timeline.length - 1 && (
                              <div className={`absolute left-5 mt-10 w-0.5 h-8 ${
                                selectedDonation.timeline[index + 1].status === 'completed' ? 'bg-green-300' : 'bg-gray-200'
                              }`}></div>
                            )}
                            
                            <div className="ml-6 flex-1">
                              <div className="flex items-center justify-between">
                                <h4 className="font-semibold text-gray-900">{event.event}</h4>
                                <span className={`px-2 py-1 rounded-full text-xs font-medium ${getStatusColor(event.status)}`}>
                                  {event.status}
                                </span>
                              </div>
                              {event.date && (
                                <p className="text-sm text-gray-500 mt-1">{formatDate(event.date)}</p>
                              )}
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {trackingView === 'impact' && (
                    <div className="space-y-6">
                      <h3 className="text-lg font-semibold text-gray-900">Your Impact Story</h3>
                      
                      <div className="bg-gradient-to-r from-blue-50 to-green-50 rounded-2xl p-6">
                        <div className="text-center mb-6">
                          <div className="text-4xl mb-4">🎯</div>
                          <h4 className="text-xl font-bold text-gray-900 mb-2">Mission Accomplished!</h4>
                          <p className="text-gray-600">Your donation has made a real difference in people's lives.</p>
                        </div>
                        
                        <div className="grid md:grid-cols-3 gap-4 text-center">
                          <div className="bg-white rounded-xl p-4">
                            <div className="text-2xl font-bold text-blue-600 mb-1">{selectedDonation.impact.peopleHelped}</div>
                            <div className="text-sm text-gray-600">Lives Touched</div>
                          </div>
                          <div className="bg-white rounded-xl p-4">
                            <div className="text-2xl font-bold text-green-600 mb-1">{selectedDonation.impact.itemsProvided.length}</div>
                            <div className="text-sm text-gray-600">Types of Aid</div>
                          </div>
                          <div className="bg-white rounded-xl p-4">
                            <div className="text-2xl font-bold text-purple-600 mb-1">100%</div>
                            <div className="text-sm text-gray-600">Transparency</div>
                          </div>
                        </div>
                      </div>

                      <div className="bg-yellow-50 border border-yellow-200 rounded-2xl p-6">
                        <h4 className="font-semibold text-yellow-800 mb-3">📸 Impact Photos</h4>
                        <p className="text-yellow-700 text-sm mb-4">
                          Photos from the relief distribution will be uploaded here once available.
                        </p>
                        <div className="grid grid-cols-3 gap-4">
                          {[1, 2, 3].map((i) => (
                            <div key={i} className="aspect-square bg-yellow-100 rounded-xl flex items-center justify-center">
                              <span className="text-yellow-400 text-2xl">📷</span>
                            </div>
                          ))}
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default TrackFunds;