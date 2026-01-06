import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../hooks/useAuth';
import { useWallet } from '../../hooks/useWallet';

const DonorSignup = () => {
  const navigate = useNavigate();
  const { authenticateWithWallet } = useAuth();
  const { connectWallet, isConnected, web3, account } = useWallet();
  const [formData, setFormData] = useState({
    fullName: '',
    email: '',
    phone: '',
    organization: '',
    donorType: 'individual',
    interests: [],
    preferredRegions: [],
    description: ''
  });
  const [isLoading, setIsLoading] = useState(false);

  const interestOptions = [
    'Emergency Food Relief',
    'Medical Aid',
    'Shelter & Housing',
    'Education Support',
    'Clean Water Projects',
    'Disaster Preparedness',
    'Community Rebuilding',
    'Child Welfare',
    'Elderly Care',
    'Environmental Recovery'
  ];

  const regionOptions = [
    'Local Community',
    'National',
    'Asia',
    'Europe',
    'Americas',
    'Africa',
    'Middle East',
    'Oceania',
    'Global'
  ];

  const handleInputChange = (field, value) => {
    setFormData(prev => ({
      ...prev,
      [field]: value
    }));
  };

  const handleInterestToggle = (interest) => {
    setFormData(prev => ({
      ...prev,
      interests: prev.interests.includes(interest)
        ? prev.interests.filter(i => i !== interest)
        : [...prev.interests, interest]
    }));
  };

  const handleRegionToggle = (region) => {
    setFormData(prev => ({
      ...prev,
      preferredRegions: prev.preferredRegions.includes(region)
        ? prev.preferredRegions.filter(r => r !== region)
        : [...prev.preferredRegions, region]
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!formData.fullName || !formData.email) {
      alert('Please fill in all required fields');
      return;
    }

    setIsLoading(true);
    
    try {
      let connectedAccount = account;
      
      // Connect wallet if not connected
      if (!isConnected || !account) {
        console.log('Connecting wallet for registration...');
        connectedAccount = await connectWallet();
        
        if (!connectedAccount) {
          throw new Error('Failed to connect wallet');
        }
        
        // Wait for connection to be fully established
        await new Promise(resolve => setTimeout(resolve, 1500));
      }

      // Verify we have web3 and account
      if (!web3 || !connectedAccount) {
        throw new Error('Wallet connection not established. Please try again.');
      }

      console.log('Authenticating with wallet...', connectedAccount);
      
      // Authenticate with wallet
      await authenticateWithWallet(web3, connectedAccount, 'donor', formData);

      alert('Registration successful! You can now start making transparent donations.');
      navigate('/donor');
      
    } catch (error) {
      console.error('Registration error:', error);
      
      if (error.code === 4001) {
        alert('Registration cancelled. Please approve the wallet connection to continue.');
      } else if (error.message.includes('User rejected')) {
        alert('Registration cancelled. Please approve the wallet connection to continue.');
      } else {
        alert(`Registration failed: ${error.message}. Please try again.`);
      }
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 py-12">
      <div className="max-w-2xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center mb-8">
          <div className="w-20 h-20 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <span className="text-4xl">💝</span>
          </div>
          <h1 className="text-3xl font-bold text-gray-900 mb-4">Donor Registration</h1>
          <p className="text-lg text-gray-600">
            Join our community of transparent donors making real impact
          </p>
        </div>

        <form onSubmit={handleSubmit} className="bg-white rounded-lg shadow-lg p-8 space-y-6">
          <div className="grid md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Full Name *
              </label>
              <input
                type="text"
                value={formData.fullName}
                onChange={(e) => handleInputChange('fullName', e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                required
              />
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Email Address *
              </label>
              <input
                type="email"
                value={formData.email}
                onChange={(e) => handleInputChange('email', e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                required
              />
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Phone Number
              </label>
              <input
                type="tel"
                value={formData.phone}
                onChange={(e) => handleInputChange('phone', e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Donor Type
              </label>
              <select
                value={formData.donorType}
                onChange={(e) => handleInputChange('donorType', e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="individual">Individual</option>
                <option value="organization">Organization</option>
                <option value="foundation">Foundation</option>
                <option value="corporate">Corporate</option>
              </select>
            </div>
          </div>

          {(formData.donorType === 'organization' || formData.donorType === 'foundation' || formData.donorType === 'corporate') && (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Organization Name
              </label>
              <input
                type="text"
                value={formData.organization}
                onChange={(e) => handleInputChange('organization', e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="Your organization or company name"
              />
            </div>
          )}

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-3">
              Areas of Interest (Select all that apply)
            </label>
            <div className="grid grid-cols-2 gap-2">
              {interestOptions.map(interest => (
                <label key={interest} className="flex items-center">
                  <input
                    type="checkbox"
                    checked={formData.interests.includes(interest)}
                    onChange={() => handleInterestToggle(interest)}
                    className="mr-2 text-blue-600 focus:ring-blue-500"
                  />
                  <span className="text-sm text-gray-700">{interest}</span>
                </label>
              ))}
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-3">
              Preferred Regions (Select all that apply)
            </label>
            <div className="grid grid-cols-3 gap-2">
              {regionOptions.map(region => (
                <label key={region} className="flex items-center">
                  <input
                    type="checkbox"
                    checked={formData.preferredRegions.includes(region)}
                    onChange={() => handleRegionToggle(region)}
                    className="mr-2 text-blue-600 focus:ring-blue-500"
                  />
                  <span className="text-sm text-gray-700">{region}</span>
                </label>
              ))}
            </div>
          </div>
          
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Why do you want to donate?
            </label>
            <textarea
              value={formData.description}
              onChange={(e) => handleInputChange('description', e.target.value)}
              rows={3}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="Share your motivation for helping disaster victims..."
            />
          </div>

          {/* Security Notice */}
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
            <div className="flex items-start">
              <div className="text-blue-600 mr-3">🔒</div>
              <div>
                <h3 className="text-sm font-medium text-blue-800 mb-1">Secure Wallet Connection</h3>
                <p className="text-sm text-blue-700">
                  You'll need to connect your crypto wallet to complete registration. 
                  For maximum security, you'll need to connect each time you visit.
                </p>
              </div>
            </div>
          </div>

          <div className="flex gap-4">
            <button
              type="button"
              onClick={() => navigate('/signup')}
              className="flex-1 bg-gray-200 text-gray-700 px-6 py-3 rounded-lg hover:bg-gray-300 font-medium"
            >
              ← Back to Role Selection
            </button>
            <button
              type="submit"
              disabled={isLoading}
              className="flex-1 bg-blue-600 text-white px-6 py-3 rounded-lg hover:bg-blue-700 disabled:opacity-50 font-medium"
            >
              {isLoading ? 'Creating Account...' : 'Register as Donor'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default DonorSignup;