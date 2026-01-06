import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../hooks/useAuth';
import { useWallet } from '../../hooks/useWallet';

const BeneficiarySignup = () => {
  const navigate = useNavigate();
  const { authenticateWithWallet } = useAuth();
  const { connectWallet, isConnected, web3, account } = useWallet();
  const [formData, setFormData] = useState({
    fullName: '',
    email: '',
    phone: '',
    address: '',
    emergencyContact: '',
    familySize: '',
    disasterType: '',
    description: ''
  });
  const [isLoading, setIsLoading] = useState(false);

  const disasterTypes = [
    'earthquake', 'flood', 'hurricane', 'wildfire', 
    'tornado', 'drought', 'tsunami', 'volcanic_eruption'
  ];

  const handleInputChange = (field, value) => {
    setFormData(prev => ({
      ...prev,
      [field]: value
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!formData.fullName || !formData.email || !formData.disasterType) {
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
      await authenticateWithWallet(web3, connectedAccount, 'beneficiary', formData);

      alert('Registration successful! You can now apply for relief assistance.');
      navigate('/beneficiary');
      
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
          <div className="w-20 h-20 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <span className="text-4xl">🏠</span>
          </div>
          <h1 className="text-3xl font-bold text-gray-900 mb-4">Apply for Relief</h1>
          <p className="text-lg text-gray-600">
            Register to receive assistance during disaster situations
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
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500"
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
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500"
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
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Family Size
              </label>
              <input
                type="number"
                min="1"
                value={formData.familySize}
                onChange={(e) => handleInputChange('familySize', e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500"
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Current Address
            </label>
            <textarea
              value={formData.address}
              onChange={(e) => handleInputChange('address', e.target.value)}
              rows={2}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500"
              placeholder="Your current address or location"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Emergency Contact
            </label>
            <input
              type="text"
              value={formData.emergencyContact}
              onChange={(e) => handleInputChange('emergencyContact', e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500"
              placeholder="Name and phone number of emergency contact"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Disaster Type *
            </label>
            <select
              value={formData.disasterType}
              onChange={(e) => handleInputChange('disasterType', e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500"
              required
            >
              <option value="">Select disaster type</option>
              {disasterTypes.map(type => (
                <option key={type} value={type}>
                  {type.charAt(0).toUpperCase() + type.slice(1).replace('_', ' ')}
                </option>
              ))}
            </select>
          </div>
          
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Describe Your Situation *
            </label>
            <textarea
              value={formData.description}
              onChange={(e) => handleInputChange('description', e.target.value)}
              rows={4}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500"
              placeholder="Please describe your current situation and what assistance you need..."
              required
            />
          </div>

          {/* Security Notice */}
          <div className="bg-green-50 border border-green-200 rounded-lg p-4">
            <div className="flex items-start">
              <div className="text-green-600 mr-3">🔒</div>
              <div>
                <h3 className="text-sm font-medium text-green-800 mb-1">Secure Wallet Connection</h3>
                <p className="text-sm text-green-700">
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
              className="flex-1 bg-green-600 text-white px-6 py-3 rounded-lg hover:bg-green-700 disabled:opacity-50 font-medium"
            >
              {isLoading ? 'Creating Account...' : 'Register for Relief'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default BeneficiarySignup;