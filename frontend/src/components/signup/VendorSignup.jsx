import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../hooks/useAuth';
import { useWallet } from '../../hooks/useWallet';

const VendorSignup = () => {
  const navigate = useNavigate();
  const { authenticateWithWallet } = useAuth();
  const { connectWallet, isConnected, web3, account } = useWallet();
  const [formData, setFormData] = useState({
    fullName: '',
    email: '',
    phone: '',
    businessName: '',
    businessAddress: '',
    city: '',
    state: '',
    businessType: '',
    services: [],
    description: '',
    experience: ''
  });
  const [isLoading, setIsLoading] = useState(false);

  const businessTypes = [
    'retail',
    'pharmacy', 
    'grocery',
    'hardware',
    'medical',
    'restaurant',
    'other'
  ];

  const serviceOptions = [
    'Emergency Food Supply',
    'Medical Equipment',
    'Construction Materials',
    'Temporary Shelter',
    'Clean Water Systems',
    'Emergency Transportation',
    'Communication Equipment',
    'Clothing & Blankets',
    'Power Generation',
    'Waste Management'
  ];

  const handleInputChange = (field, value) => {
    setFormData(prev => ({
      ...prev,
      [field]: value
    }));
  };

  const handleServiceToggle = (service) => {
    setFormData(prev => ({
      ...prev,
      services: prev.services.includes(service)
        ? prev.services.filter(s => s !== service)
        : [...prev.services, service]
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!formData.fullName || !formData.email || !formData.businessName || !formData.businessType) {
      alert('Please fill in all required fields');
      return;
    }

    if (formData.services.length === 0) {
      alert('Please select at least one service you can provide');
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
      
      // Authenticate with wallet first
      const authResult = await authenticateWithWallet(web3, connectedAccount, 'vendor', {});

      // Check if authentication was successful and we have a token
      if (!authResult.token) {
        console.warn('Authentication successful but no token received');
        alert('Registration successful! You can now access the vendor dashboard.');
        navigate('/vendor');
        return;
      }

      console.log('Registering vendor with backend...');
      
      // Try to register vendor with backend
      try {
        const response = await fetch('http://localhost:3001/api/vendors/register', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${authResult.token}`
          },
          body: JSON.stringify({
            businessName: formData.businessName,
            businessType: formData.businessType,
            email: formData.email,
            phone: formData.phone,
            address_line1: formData.businessAddress,
            city: formData.city || 'Unknown',
            state: formData.state || 'Unknown',
            zipCode: '00000',
            description: formData.description,
            requestedCategories: [formData.businessType]
          })
        });

        if (response.ok) {
          const result = await response.json();
          console.log('Vendor registration successful:', result);
          alert('Registration successful! Your vendor application is under review.');
        } else {
          const errorData = await response.json();
          console.warn('Vendor registration failed:', errorData.message);
          alert('Registration completed, but vendor profile creation failed. You can still access the dashboard.');
        }
      } catch (registrationError) {
        console.error('Vendor registration failed:', registrationError);
        alert('Registration completed, but vendor profile creation failed. You can still access the dashboard.');
      }

      navigate('/vendor');
      
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
          <div className="w-20 h-20 bg-purple-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <span className="text-4xl">🏪</span>
          </div>
          <h1 className="text-3xl font-bold text-gray-900 mb-4">Service Provider Registration</h1>
          <p className="text-lg text-gray-600">
            Join our network of verified service providers helping disaster victims
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
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500"
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
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500"
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
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Business/Organization Name *
              </label>
              <input
                type="text"
                value={formData.businessName}
                onChange={(e) => handleInputChange('businessName', e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500"
                required
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Business Address
            </label>
            <textarea
              value={formData.businessAddress}
              onChange={(e) => handleInputChange('businessAddress', e.target.value)}
              rows={2}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500"
              placeholder="Your business address or service area"
            />
          </div>

          <div className="grid md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                City
              </label>
              <input
                type="text"
                value={formData.city}
                onChange={(e) => handleInputChange('city', e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500"
                placeholder="City"
              />
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                State/Province
              </label>
              <input
                type="text"
                value={formData.state}
                onChange={(e) => handleInputChange('state', e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500"
                placeholder="State or Province"
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Business Type *
            </label>
            <select
              value={formData.businessType}
              onChange={(e) => handleInputChange('businessType', e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500"
              required
            >
              <option value="">Select business type</option>
              <option value="retail">Retail Store</option>
              <option value="pharmacy">Pharmacy</option>
              <option value="grocery">Grocery Store</option>
              <option value="hardware">Hardware Store</option>
              <option value="medical">Medical Services</option>
              <option value="restaurant">Restaurant/Food Service</option>
              <option value="other">Other</option>
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-3">
              Services You Can Provide * (Select all that apply)
            </label>
            <div className="grid grid-cols-2 gap-2">
              {serviceOptions.map(service => (
                <label key={service} className="flex items-center">
                  <input
                    type="checkbox"
                    checked={formData.services.includes(service)}
                    onChange={() => handleServiceToggle(service)}
                    className="mr-2 text-purple-600 focus:ring-purple-500"
                  />
                  <span className="text-sm text-gray-700">{service}</span>
                </label>
              ))}
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Experience & Qualifications
            </label>
            <textarea
              value={formData.experience}
              onChange={(e) => handleInputChange('experience', e.target.value)}
              rows={3}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500"
              placeholder="Describe your experience, certifications, or qualifications..."
            />
          </div>
          
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Additional Information
            </label>
            <textarea
              value={formData.description}
              onChange={(e) => handleInputChange('description', e.target.value)}
              rows={3}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500"
              placeholder="Any additional information about your services or capabilities..."
            />
          </div>

          {/* Security Notice */}
          <div className="bg-purple-50 border border-purple-200 rounded-lg p-4">
            <div className="flex items-start">
              <div className="text-purple-600 mr-3">🔒</div>
              <div>
                <h3 className="text-sm font-medium text-purple-800 mb-1">Secure Wallet Connection</h3>
                <p className="text-sm text-purple-700">
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
              className="flex-1 bg-purple-600 text-white px-6 py-3 rounded-lg hover:bg-purple-700 disabled:opacity-50 font-medium"
            >
              {isLoading ? 'Creating Account...' : 'Register as Vendor'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default VendorSignup;