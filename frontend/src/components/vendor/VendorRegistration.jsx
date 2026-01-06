import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useApi } from '../../hooks/useApi';
import LoadingSpinner from '../common/LoadingSpinner';
import toast from 'react-hot-toast';

const VendorRegistration = () => {
  const navigate = useNavigate();
  const { vendor } = useApi();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [currentStep, setCurrentStep] = useState(1);
  const [formData, setFormData] = useState({
    // Business Information
    businessName: '',
    businessType: '',
    businessLicense: '',
    description: '',
    
    // Contact Information
    email: '',
    phone: '',
    
    // Business Address
    address_line1: '',
    address_line2: '',
    city: '',
    state: '',
    zipCode: '',
    country: 'US',
    
    // Categories
    requestedCategories: [],
    
    // Documents
    documents: []
  });

  const businessTypes = [
    { value: 'retail', label: 'Retail Store' },
    { value: 'pharmacy', label: 'Pharmacy' },
    { value: 'grocery', label: 'Grocery Store' },
    { value: 'hardware', label: 'Hardware Store' },
    { value: 'medical', label: 'Medical Supplies' },
    { value: 'restaurant', label: 'Restaurant/Food Service' },
    { value: 'other', label: 'Other' }
  ];

  const essentialCategories = [
    { value: 'food', label: 'Food & Beverages', description: 'Groceries, meals, and food items' },
    { value: 'medicine', label: 'Medicine & Healthcare', description: 'Medications, medical supplies, and healthcare services' },
    { value: 'shelter', label: 'Shelter & Housing', description: 'Temporary housing, building materials, and shelter supplies' },
    { value: 'clothing', label: 'Clothing & Textiles', description: 'Clothing, blankets, and textile goods' },
    { value: 'water', label: 'Water & Sanitation', description: 'Clean water, water purification, and sanitation supplies' },
    { value: 'hygiene', label: 'Hygiene & Personal Care', description: 'Personal hygiene items and cleaning supplies' },
    { value: 'emergency_supplies', label: 'Emergency Supplies', description: 'Flashlights, batteries, first aid, and emergency equipment' }
  ];

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const handleCategoryToggle = (category) => {
    setFormData(prev => ({
      ...prev,
      requestedCategories: prev.requestedCategories.includes(category)
        ? prev.requestedCategories.filter(c => c !== category)
        : [...prev.requestedCategories, category]
    }));
  };

  const handleFileUpload = (e) => {
    const files = Array.from(e.target.files);
    setFormData(prev => ({
      ...prev,
      documents: [...prev.documents, ...files]
    }));
  };

  const removeDocument = (index) => {
    setFormData(prev => ({
      ...prev,
      documents: prev.documents.filter((_, i) => i !== index)
    }));
  };

  const validateStep = (step) => {
    switch (step) {
      case 1:
        return formData.businessName && formData.businessType && formData.email;
      case 2:
        return formData.address_line1 && formData.city && formData.state && formData.zipCode;
      case 3:
        return formData.requestedCategories.length > 0;
      case 4:
        return true; // Documents are optional
      default:
        return false;
    }
  };

  const nextStep = () => {
    if (validateStep(currentStep)) {
      setCurrentStep(prev => Math.min(prev + 1, 4));
    } else {
      toast.error('Please fill in all required fields');
    }
  };

  const prevStep = () => {
    setCurrentStep(prev => Math.max(prev - 1, 1));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!validateStep(4)) {
      toast.error('Please complete all required fields');
      return;
    }

    setIsSubmitting(true);
    try {
      const submitData = new FormData();
      
      // Add form fields
      Object.keys(formData).forEach(key => {
        if (key === 'documents') return;
        if (key === 'requestedCategories') {
          submitData.append(key, JSON.stringify(formData[key]));
        } else {
          submitData.append(key, formData[key]);
        }
      });

      // Add documents
      formData.documents.forEach((file, index) => {
        submitData.append('documents', file);
      });

      await vendor.register(submitData);
      
      toast.success('Vendor registration submitted successfully!');
      navigate('/vendor-dashboard');
      
    } catch (error) {
      toast.error(error.message || 'Failed to submit registration');
    } finally {
      setIsSubmitting(false);
    }
  };

  const renderStepIndicator = () => (
    <div className="flex items-center justify-center mb-8">
      {[1, 2, 3, 4].map((step) => (
        <React.Fragment key={step}>
          <div className={`flex items-center justify-center w-8 h-8 rounded-full text-sm font-medium ${
            step <= currentStep 
              ? 'bg-blue-600 text-white' 
              : 'bg-gray-200 text-gray-600'
          }`}>
            {step}
          </div>
          {step < 4 && (
            <div className={`w-12 h-1 mx-2 ${
              step < currentStep ? 'bg-blue-600' : 'bg-gray-200'
            }`} />
          )}
        </React.Fragment>
      ))}
    </div>
  );

  const renderStep1 = () => (
    <div className="space-y-6">
      <h3 className="text-lg font-medium text-gray-900 mb-4">Business Information</h3>
      
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">
          Business Name *
        </label>
        <input
          type="text"
          name="businessName"
          value={formData.businessName}
          onChange={handleInputChange}
          className="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
          placeholder="Enter your business name"
          required
        />
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">
          Business Type *
        </label>
        <select
          name="businessType"
          value={formData.businessType}
          onChange={handleInputChange}
          className="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
          required
        >
          <option value="">Select business type</option>
          {businessTypes.map(type => (
            <option key={type.value} value={type.value}>
              {type.label}
            </option>
          ))}
        </select>
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">
          Business License Number
        </label>
        <input
          type="text"
          name="businessLicense"
          value={formData.businessLicense}
          onChange={handleInputChange}
          className="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
          placeholder="Enter business license number"
        />
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">
          Email Address *
        </label>
        <input
          type="email"
          name="email"
          value={formData.email}
          onChange={handleInputChange}
          className="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
          placeholder="Enter email address"
          required
        />
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">
          Phone Number
        </label>
        <input
          type="tel"
          name="phone"
          value={formData.phone}
          onChange={handleInputChange}
          className="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
          placeholder="Enter phone number"
        />
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">
          Business Description
        </label>
        <textarea
          name="description"
          value={formData.description}
          onChange={handleInputChange}
          rows="3"
          className="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
          placeholder="Describe your business and services"
        />
      </div>
    </div>
  );

  const renderStep2 = () => (
    <div className="space-y-6">
      <h3 className="text-lg font-medium text-gray-900 mb-4">Business Address</h3>
      
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">
          Address Line 1 *
        </label>
        <input
          type="text"
          name="address_line1"
          value={formData.address_line1}
          onChange={handleInputChange}
          className="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
          placeholder="Street address"
          required
        />
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">
          Address Line 2
        </label>
        <input
          type="text"
          name="address_line2"
          value={formData.address_line2}
          onChange={handleInputChange}
          className="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
          placeholder="Apartment, suite, etc."
        />
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            City *
          </label>
          <input
            type="text"
            name="city"
            value={formData.city}
            onChange={handleInputChange}
            className="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
            placeholder="City"
            required
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            State *
          </label>
          <input
            type="text"
            name="state"
            value={formData.state}
            onChange={handleInputChange}
            className="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
            placeholder="State"
            required
          />
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            ZIP Code *
          </label>
          <input
            type="text"
            name="zipCode"
            value={formData.zipCode}
            onChange={handleInputChange}
            className="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
            placeholder="ZIP Code"
            required
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Country
          </label>
          <select
            name="country"
            value={formData.country}
            onChange={handleInputChange}
            className="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="US">United States</option>
            <option value="CA">Canada</option>
            <option value="MX">Mexico</option>
          </select>
        </div>
      </div>
    </div>
  );

  const renderStep3 = () => (
    <div className="space-y-6">
      <h3 className="text-lg font-medium text-gray-900 mb-4">Service Categories</h3>
      <p className="text-sm text-gray-600 mb-6">
        Select the categories of essential goods and services your business can provide to disaster relief beneficiaries.
      </p>
      
      <div className="space-y-4">
        {essentialCategories.map(category => (
          <div
            key={category.value}
            className={`border rounded-lg p-4 cursor-pointer transition-colors ${
              formData.requestedCategories.includes(category.value)
                ? 'border-blue-500 bg-blue-50'
                : 'border-gray-200 hover:border-gray-300'
            }`}
            onClick={() => handleCategoryToggle(category.value)}
          >
            <div className="flex items-start">
              <input
                type="checkbox"
                checked={formData.requestedCategories.includes(category.value)}
                onChange={() => handleCategoryToggle(category.value)}
                className="mt-1 mr-3"
              />
              <div>
                <h4 className="font-medium text-gray-900">{category.label}</h4>
                <p className="text-sm text-gray-600 mt-1">{category.description}</p>
              </div>
            </div>
          </div>
        ))}
      </div>

      {formData.requestedCategories.length === 0 && (
        <p className="text-red-600 text-sm">Please select at least one category.</p>
      )}
    </div>
  );

  const renderStep4 = () => (
    <div className="space-y-6">
      <h3 className="text-lg font-medium text-gray-900 mb-4">Business Documents</h3>
      <p className="text-sm text-gray-600 mb-6">
        Upload business documents to verify your legitimacy. Accepted formats: PDF, JPG, PNG, DOC, DOCX (max 10MB each).
      </p>
      
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">
          Upload Documents
        </label>
        <input
          type="file"
          multiple
          accept=".pdf,.jpg,.jpeg,.png,.doc,.docx"
          onChange={handleFileUpload}
          className="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
        />
        <p className="text-xs text-gray-500 mt-1">
          Recommended: Business license, tax ID, insurance certificate, identity verification
        </p>
      </div>

      {formData.documents.length > 0 && (
        <div className="space-y-2">
          <h4 className="text-sm font-medium text-gray-700">Uploaded Documents:</h4>
          {formData.documents.map((file, index) => (
            <div key={index} className="flex items-center justify-between bg-gray-50 p-3 rounded">
              <div>
                <p className="text-sm font-medium text-gray-900">{file.name}</p>
                <p className="text-xs text-gray-500">
                  {(file.size / 1024 / 1024).toFixed(2)} MB
                </p>
              </div>
              <button
                type="button"
                onClick={() => removeDocument(index)}
                className="text-red-600 hover:text-red-800 text-sm"
              >
                Remove
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );

  return (
    <div className="max-w-2xl mx-auto p-6">
      <div className="bg-white rounded-lg shadow-md p-8">
        <div className="text-center mb-8">
          <h2 className="text-2xl font-bold text-gray-900">Vendor Registration</h2>
          <p className="text-gray-600 mt-2">
            Join our network of verified vendors to serve disaster relief beneficiaries
          </p>
        </div>

        {renderStepIndicator()}

        <form onSubmit={handleSubmit}>
          {currentStep === 1 && renderStep1()}
          {currentStep === 2 && renderStep2()}
          {currentStep === 3 && renderStep3()}
          {currentStep === 4 && renderStep4()}

          <div className="flex justify-between mt-8">
            <button
              type="button"
              onClick={prevStep}
              disabled={currentStep === 1}
              className={`px-6 py-2 rounded-md ${
                currentStep === 1
                  ? 'bg-gray-100 text-gray-400 cursor-not-allowed'
                  : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
              }`}
            >
              Previous
            </button>

            {currentStep < 4 ? (
              <button
                type="button"
                onClick={nextStep}
                disabled={!validateStep(currentStep)}
                className={`px-6 py-2 rounded-md ${
                  validateStep(currentStep)
                    ? 'bg-blue-600 text-white hover:bg-blue-700'
                    : 'bg-gray-100 text-gray-400 cursor-not-allowed'
                }`}
              >
                Next
              </button>
            ) : (
              <button
                type="submit"
                disabled={isSubmitting || !validateStep(4)}
                className={`px-6 py-2 rounded-md ${
                  isSubmitting || !validateStep(4)
                    ? 'bg-gray-100 text-gray-400 cursor-not-allowed'
                    : 'bg-green-600 text-white hover:bg-green-700'
                }`}
              >
                {isSubmitting ? (
                  <div className="flex items-center">
                    <LoadingSpinner size="sm" />
                    <span className="ml-2">Submitting...</span>
                  </div>
                ) : (
                  'Submit Registration'
                )}
              </button>
            )}
          </div>
        </form>
      </div>
    </div>
  );
};

export default VendorRegistration;