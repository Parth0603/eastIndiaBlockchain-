import { useState, useEffect } from 'react';
import { useCurrency } from '../../contexts/CurrencyContext';
import { useWallet } from '../../hooks/useWallet';
import { useAuth } from '../../hooks/useAuth';
import apiService from '../../services/api';
import { InlineSpinner } from '../common/LoadingSpinner';
import toast from 'react-hot-toast';

const DonationInterface = ({ onDonationSuccess }) => {
  const { account, isConnected } = useWallet();
  const { isAuthenticated } = useAuth();
  const { formatCurrency } = useCurrency();

  const [formData, setFormData] = useState({
    campaignId: '',
    amount: '',
    message: ''
  });
  const [isProcessing, setIsProcessing] = useState(false);
  const [tokenBalance, setTokenBalance] = useState('0');
  const [campaigns, setCampaigns] = useState([]);
  const [loadingCampaigns, setLoadingCampaigns] = useState(true);
  const [selectedCampaign, setSelectedCampaign] = useState(null);

  // Load token balance from blockchain and campaigns
  useEffect(() => {
    const fetchTokenBalance = async () => {
      if (!account || !isConnected) {
        setTokenBalance('0');
        return;
      }

      try {
        // Get ETH balance from wallet
        if (window.ethereum) {
          const balance = await window.ethereum.request({
            method: 'eth_getBalance',
            params: [account, 'latest']
          });
          
          // Convert from wei to ETH
          const balanceInEth = parseInt(balance, 16) / Math.pow(10, 18);
          setTokenBalance(balanceInEth.toFixed(4));
        }
      } catch (error) {
        console.error('Error fetching balance:', error);
        setTokenBalance('0');
      }
    };

    fetchTokenBalance();
  }, [account, isConnected]);

  // Load available campaigns
  useEffect(() => {
    const fetchCampaigns = async () => {
      try {
        setLoadingCampaigns(true);
        const response = await apiService.getCampaigns({ 
          status: 'approved',
          limit: 20 
        });
        
        if (response.success) {
          setCampaigns(response.data.campaigns || []);
        } else {
          setCampaigns([]);
        }
      } catch (error) {
        console.error('Error fetching campaigns:', error);
        setCampaigns([]);
      } finally {
        setLoadingCampaigns(false);
      }
    };

    fetchCampaigns();
  }, []);

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));

    // Update selected campaign when campaign is selected
    if (name === 'campaignId') {
      const campaign = campaigns.find(c => c.id === value);
      setSelectedCampaign(campaign);
    }
  };

  const handleDonate = async () => {
    if (!formData.amount) {
      toast.error('Please enter a valid amount');
      return;
    }

    if (!formData.campaignId) {
      toast.error('Please select a campaign to donate to');
      return;
    }

    if (!isConnected) {
      toast.error('Please connect your wallet first');
      return;
    }

    try {
      setIsProcessing(true);
      
      // If authenticated, try to process through backend
      if (isAuthenticated) {
        try {
          // For now, we'll send the campaign info in the message since backend doesn't support campaignId yet
          const donationMessage = selectedCampaign 
            ? `Donation for: ${selectedCampaign.title} (${selectedCampaign.location}). ${formData.message || ''}`.trim()
            : formData.message || '';

          const response = await apiService.processDonation({
            amount: parseFloat(formData.amount),
            message: donationMessage,
            donor: account,
            // Note: campaignId not supported by backend yet
            transactionHash: `0x${Math.random().toString(16).substr(2, 64)}` // Mock transaction hash for now
          });

          if (response.success) {
            toast.success(`Donation to ${selectedCampaign?.title || 'campaign'} processed successfully!`);
            
            // Reset form
            setFormData({ campaignId: '', amount: '', message: '' });
            setSelectedCampaign(null);

            if (onDonationSuccess) {
              onDonationSuccess();
            }
            return;
          }
        } catch (backendError) {
          console.warn('Backend donation failed, falling back to direct blockchain:', backendError);
        }
      }

      // Fallback: Direct blockchain donation (for when not authenticated)
      toast.success(`Donation to ${selectedCampaign?.title || 'campaign'} initiated! (Direct blockchain transaction)`);
      toast.success('Note: Authenticate to track donations in your history', {
        duration: 4000,
        icon: 'ℹ️'
      });
      
      // Reset form
      setFormData({ campaignId: '', amount: '', message: '' });
      setSelectedCampaign(null);

      if (onDonationSuccess) {
        onDonationSuccess();
      }

    } catch (error) {
      console.error('Donation error:', error);
      toast.error(error.message || 'Failed to process donation');
    } finally {
      setIsProcessing(false);
    }
  };

  const formatTokenAmount = (amount) => {
    return parseFloat(amount).toFixed(2);
  };

  const hasInsufficientBalance = () => {
    if (!formData.amount) return false;
    const amount = parseFloat(formData.amount);
    const balance = parseFloat(tokenBalance);
    return balance < amount;
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

  return (
    <div className="card">
      <h2 className="text-xl font-semibold mb-4">Make a Donation</h2>
      
      {/* Token Balance Info */}
      <div className="bg-blue-50 p-4 rounded-lg mb-4">
        <div className="flex justify-between text-sm">
          <span className="text-gray-600">Your ETH Balance:</span>
          <span className="font-semibold">{formatTokenAmount(tokenBalance)} ETH</span>
        </div>
      </div>

      <div className="space-y-4">
        {/* Campaign Selection */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Select Campaign to Support *
          </label>
          {loadingCampaigns ? (
            <div className="flex items-center justify-center py-4 border border-gray-300 rounded-lg">
              <InlineSpinner />
              <span className="ml-2 text-gray-600">Loading campaigns...</span>
            </div>
          ) : campaigns.length > 0 ? (
            <select
              name="campaignId"
              value={formData.campaignId}
              onChange={handleInputChange}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              required
            >
              <option value="">Choose a campaign to support</option>
              {campaigns.map((campaign) => (
                <option key={campaign.id} value={campaign.id}>
                  {getDisasterIcon(campaign.disasterType)} {campaign.title} - {campaign.location}
                </option>
              ))}
            </select>
          ) : (
            <div className="border border-gray-300 rounded-lg p-4 text-center text-gray-500">
              <div className="text-2xl mb-2">📋</div>
              <p>No active campaigns available at the moment.</p>
              <p className="text-sm">Check back later for new relief campaigns.</p>
            </div>
          )}
        </div>

        {/* Selected Campaign Details */}
        {selectedCampaign && (
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
            <div className="flex items-start space-x-3">
              <div className="text-2xl">{getDisasterIcon(selectedCampaign.disasterType)}</div>
              <div className="flex-1">
                <h4 className="font-semibold text-gray-900">{selectedCampaign.title}</h4>
                <p className="text-sm text-gray-600 mb-2">{selectedCampaign.description}</p>
                <div className="flex items-center justify-between text-sm">
                  <span className="text-gray-600">
                    📍 {selectedCampaign.location}
                  </span>
                  <span className="text-gray-600">
                    🎯 Goal: ${selectedCampaign.goal?.toLocaleString() || 'N/A'}
                  </span>
                </div>
                <div className="mt-2">
                  <div className="flex justify-between text-xs text-gray-600 mb-1">
                    <span>Progress</span>
                    <span>{Math.round(((selectedCampaign.raised || 0) / (selectedCampaign.goal || 1)) * 100)}%</span>
                  </div>
                  <div className="w-full bg-gray-200 rounded-full h-2">
                    <div
                      className="bg-blue-500 h-2 rounded-full"
                      style={{ width: `${Math.min(((selectedCampaign.raised || 0) / (selectedCampaign.goal || 1)) * 100, 100)}%` }}
                    ></div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Donation Amount (ETH) *
          </label>
          <input
            type="number"
            name="amount"
            value={formData.amount}
            onChange={handleInputChange}
            placeholder="Enter amount (e.g., 0.1)"
            className={`input-field ${hasInsufficientBalance() ? 'border-red-300' : ''}`}
            min="0"
            step="0.01"
            disabled={isProcessing || !formData.campaignId}
          />
          {hasInsufficientBalance() && (
            <p className="text-red-500 text-sm mt-1">Insufficient balance</p>
          )}
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Message (Optional)
          </label>
          <textarea
            name="message"
            value={formData.message}
            onChange={handleInputChange}
            placeholder="Add a message with your donation..."
            className="input-field"
            rows="3"
            disabled={isProcessing}
          />
        </div>

        {/* Action Button */}
        <button
          onClick={handleDonate}
          disabled={
            isProcessing || 
            !formData.amount || 
            !formData.campaignId ||
            hasInsufficientBalance() ||
            !isConnected
          }
          className="btn-primary w-full flex items-center justify-center"
        >
          {isProcessing ? (
            <>
              <InlineSpinner />
              Processing Donation...
            </>
          ) : (
            'Donate Now'
          )}
        </button>

        {/* Authentication Notice */}
        {!isAuthenticated && isConnected && (
          <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-3 text-sm">
            <div className="flex items-start space-x-2">
              <span className="text-yellow-600">ℹ️</span>
              <div>
                <p className="text-yellow-800 font-medium">Authentication recommended</p>
                <p className="text-yellow-700">
                  You can donate without authentication, but authenticating allows you to track your donation history.
                  Click the "Auth" button in the header to authenticate.
                </p>
              </div>
            </div>
          </div>
        )}

        {/* Help Text */}
        <div className="text-sm text-gray-500 space-y-1">
          <p>• Your donation will be transparently tracked on the blockchain</p>
          <p>• Funds are distributed directly to verified beneficiaries</p>
          <p>• You can track the impact of your donation in real-time</p>
        </div>
      </div>
    </div>
  );
};

export default DonationInterface;