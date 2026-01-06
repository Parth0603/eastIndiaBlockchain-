import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';
import apiService from '../services/api';

const ApplyRelief = () => {
  const { user, isAuthenticated } = useAuth();
  const navigate = useNavigate();
  const [currentStep, setCurrentStep] = useState(1);
  const [formData, setFormData] = useState({
    // Personal Info
    fullName: '',
    email: '',
    phone: '',
    address: '',
    
    // Disaster Info
    disasterType: '',
    disasterDate: '',
    disasterDescription: '',
    urgencyLevel: '',
    
    // Needs
    immediateNeeds: [],
    estimatedAmount: '',
    
    // Vendor Selection
    selectedVendors: []
  });

  const disasterTypes = [
    'Earthquake', 'Flood', 'Hurricane', 'Wildfire', 'Tornado', 
    'Drought', 'Tsunami', 'Volcanic Eruption', 'Other'
  ];

  const needsCategories = [
    { id: 'shelter', name: 'Emergency Shelter', icon: '🏠' },
    { id: 'food', name: 'Food & Water', icon: '🍞' },
    { id: 'medical', name: 'Medical Care', icon: '🏥' },
    { id: 'clothing', name: 'Clothing', icon: '👕' },
    { id: 'transportation', name: 'Transportation', icon: '🚗' },
    { id: 'utilities', name: 'Utilities', icon: '💡' }
  ];

  // Verified vendors will be loaded from backend
  const verifiedVendors = [];

  const handleInputChange = (field, value) => {
    setFormData(prev => ({
      ...prev,
      [field]: value
    }));
  };

  const handleNeedsChange = (needId) => {
    setFormData(prev => ({
      ...prev,
      immediateNeeds: prev.immediateNeeds.includes(needId)
        ? prev.immediateNeeds.filter(id => id !== needId)
        : [...prev.immediateNeeds, needId]
    }));
  };

  const handleVendorSelect = (vendorId) => {
    setFormData(prev => ({
      ...prev,
      selectedVendors: prev.selectedVendors.includes(vendorId)
        ? prev.selectedVendors.filter(id => id !== vendorId)
        : [...prev.selectedVendors, vendorId]
    }));
  };

  const nextStep = () => {
    if (currentStep < 4) {
      setCurrentStep(currentStep + 1);
    }
  };

  const prevStep = () => {
    if (currentStep > 1) {
      setCurrentStep(currentStep - 1);
    }
  };

  const submitApplication = async () => {
    // Check authentication
    if (!isAuthenticated) {
      alert('Please connect your wallet and authenticate to submit your application.');
      return;
    }

    try {
      // Prepare application data for backend
      const applicationData = {
        personalInfo: {
          fullName: formData.fullName,
          familySize: parseInt(formData.familySize) || 1,
          hasChildren: formData.hasChildren === 'yes',
          hasElderly: formData.hasElderly === 'yes',
          hasDisabled: formData.hasDisabled === 'yes'
        },
        contactInfo: {
          email: formData.email,
          phone: formData.phone,
          address: formData.address,
          emergencyContact: {
            name: formData.emergencyContactName,
            phone: formData.emergencyContactPhone
          }
        },
        emergencyInfo: {
          situation: 'disaster_relief',
          description: formData.disasterDescription,
          urgencyLevel: formData.urgencyLevel
        },
        requestedAmount: parseFloat(formData.estimatedAmount) || 5000,
        documents: formData.documents || []
      };

      // Submit application to backend
      const response = await apiService.submitApplication(applicationData);
      
      if (response.success) {
        alert('Your relief application has been submitted successfully! It will be reviewed and appear in the donor list once approved.');
        
        // Reset form and redirect to home page
        setFormData({
          fullName: '',
          email: '',
          phone: '',
          address: '',
          disasterType: '',
          disasterDate: '',
          disasterDescription: '',
          urgencyLevel: '',
          immediateNeeds: [],
          estimatedAmount: '',
          selectedVendors: []
        });
        setCurrentStep(1);
        navigate('/donate');
        
      } else {
        throw new Error(response.message || 'Failed to submit application');
      }
      
    } catch (error) {
      console.error('Application submission error:', error);
      alert(error.message || 'Failed to submit application. Please try again.');
    }
  };

  const getFilteredVendors = () => {
    if (formData.immediateNeeds.length === 0) return verifiedVendors;
    return verifiedVendors.filter(vendor => 
      formData.immediateNeeds.includes(vendor.category)
    );
  };

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Authentication Check */}
        {!isAuthenticated && (
          <div className="mb-8 bg-yellow-50 border border-yellow-200 rounded-lg p-4">
            <div className="flex items-center">
              <div className="text-yellow-600 mr-3">⚠️</div>
              <div>
                <h3 className="text-sm font-medium text-yellow-800">Authentication Required</h3>
                <p className="text-sm text-yellow-700 mt-1">
                  Please connect your wallet and authenticate to apply for relief.
                </p>
              </div>
            </div>
          </div>
        )}

        {/* Progress Bar */}
        <div className="mb-8">
          <div className="flex items-center justify-between">
            <h1 className="text-3xl font-bold text-gray-900">Apply for Relief</h1>
            <div className="text-sm text-gray-500">Step {currentStep} of 4</div>
          </div>
          <div className="mt-4 w-full bg-gray-200 rounded-full h-2">
            <div
              className="bg-blue-600 h-2 rounded-full transition-all duration-300"
              style={{ width: `${(currentStep / 4) * 100}%` }}
            ></div>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow-lg p-6">
          {/* Step 1: Personal Information */}
          {currentStep === 1 && (
            <div>
              <h2 className="text-xl font-semibold text-gray-900 mb-6">Personal Information</h2>
              <div className="grid md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Full Name *</label>
                  <input
                    type="text"
                    value={formData.fullName}
                    onChange={(e) => handleInputChange('fullName', e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Email *</label>
                  <input
                    type="email"
                    value={formData.email}
                    onChange={(e) => handleInputChange('email', e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Phone Number *</label>
                  <input
                    type="tel"
                    value={formData.phone}
                    onChange={(e) => handleInputChange('phone', e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Current Address *</label>
                  <input
                    type="text"
                    value={formData.address}
                    onChange={(e) => handleInputChange('address', e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                    required
                  />
                </div>
              </div>
            </div>
          )}

          {/* Step 2: Disaster Information */}
          {currentStep === 2 && (
            <div>
              <h2 className="text-xl font-semibold text-gray-900 mb-6">Disaster Information</h2>
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Type of Disaster *</label>
                  <select
                    value={formData.disasterType}
                    onChange={(e) => handleInputChange('disasterType', e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                    required
                  >
                    <option value="">Select disaster type</option>
                    {disasterTypes.map(type => (
                      <option key={type} value={type}>{type}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Date of Disaster *</label>
                  <input
                    type="date"
                    value={formData.disasterDate}
                    onChange={(e) => handleInputChange('disasterDate', e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Urgency Level *</label>
                  <select
                    value={formData.urgencyLevel}
                    onChange={(e) => handleInputChange('urgencyLevel', e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                    required
                  >
                    <option value="">Select urgency level</option>
                    <option value="critical">Critical - Life threatening</option>
                    <option value="high">High - Urgent assistance needed</option>
                    <option value="medium">Medium - Important but not urgent</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Describe Your Situation *</label>
                  <textarea
                    value={formData.disasterDescription}
                    onChange={(e) => handleInputChange('disasterDescription', e.target.value)}
                    rows={4}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="Please describe how the disaster has affected you and what kind of help you need..."
                    required
                  />
                </div>
              </div>
            </div>
          )}

          {/* Step 3: Immediate Needs */}
          {currentStep === 3 && (
            <div>
              <h2 className="text-xl font-semibold text-gray-900 mb-6">What Do You Need Most?</h2>
              <div className="grid md:grid-cols-2 gap-4 mb-6">
                {needsCategories.map(need => (
                  <div
                    key={need.id}
                    onClick={() => handleNeedsChange(need.id)}
                    className={`p-4 border-2 rounded-lg cursor-pointer transition-colors ${
                      formData.immediateNeeds.includes(need.id)
                        ? 'border-blue-500 bg-blue-50'
                        : 'border-gray-200 hover:border-gray-300'
                    }`}
                  >
                    <div className="flex items-center">
                      <span className="text-2xl mr-3">{need.icon}</span>
                      <span className="font-medium">{need.name}</span>
                    </div>
                  </div>
                ))}
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Estimated Amount Needed (USD)
                </label>
                <input
                  type="number"
                  value={formData.estimatedAmount}
                  onChange={(e) => handleInputChange('estimatedAmount', e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="Enter estimated amount"
                  min="1"
                />
              </div>
            </div>
          )}

          {/* Step 4: Vendor Selection */}
          {currentStep === 4 && (
            <div>
              <h2 className="text-xl font-semibold text-gray-900 mb-6">Choose Service Providers</h2>
              <p className="text-gray-600 mb-6">
                Select verified vendors who can help with your needs. These providers have been vetted and approved.
              </p>
              <div className="space-y-4">
                {getFilteredVendors().map(vendor => (
                  <div
                    key={vendor.id}
                    onClick={() => handleVendorSelect(vendor.id)}
                    className={`p-4 border-2 rounded-lg cursor-pointer transition-colors ${
                      formData.selectedVendors.includes(vendor.id)
                        ? 'border-blue-500 bg-blue-50'
                        : 'border-gray-200 hover:border-gray-300'
                    }`}
                  >
                    <div className="flex items-start justify-between">
                      <div className="flex items-start">
                        <span className="text-3xl mr-4">{vendor.image}</span>
                        <div>
                          <div className="flex items-center mb-2">
                            <h3 className="font-semibold text-gray-900 mr-2">{vendor.name}</h3>
                            {vendor.verified && (
                              <span className="bg-green-100 text-green-800 text-xs px-2 py-1 rounded-full">
                                ✓ Verified
                              </span>
                            )}
                          </div>
                          <p className="text-gray-600 text-sm mb-2">{vendor.description}</p>
                          <div className="flex flex-wrap gap-1 mb-2">
                            {vendor.services.map(service => (
                              <span key={service} className="bg-gray-100 text-gray-700 text-xs px-2 py-1 rounded">
                                {service}
                              </span>
                            ))}
                          </div>
                          <div className="flex items-center text-sm text-gray-500">
                            <span className="mr-4">⭐ {vendor.rating}</span>
                            <span>⏱️ Response: {vendor.responseTime}</span>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Navigation Buttons */}
          <div className="flex justify-between mt-8">
            <button
              onClick={prevStep}
              disabled={currentStep === 1}
              className="px-6 py-2 text-gray-700 bg-gray-200 rounded-lg hover:bg-gray-300 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Previous
            </button>
            
            {currentStep < 4 ? (
              <button
                onClick={nextStep}
                disabled={!isAuthenticated}
                className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Next
              </button>
            ) : (
              <button
                onClick={submitApplication}
                disabled={!isAuthenticated}
                className="px-6 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Submit Application
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default ApplyRelief;