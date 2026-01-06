import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { usePageTitle } from '../hooks/usePageTitle';

const CreateCampaign = () => {
  const navigate = useNavigate();
  
  // Set page title
  usePageTitle('Create Campaign');
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    location: '',
    disasterType: '',
    urgency: 'Medium',
    goal: '',
    beneficiaries: '',
    categories: []
  });
  const [isSubmitting, setIsSubmitting] = useState(false);

  const disasterTypes = ['earthquake', 'flood', 'hurricane', 'wildfire', 'tornado', 'drought', 'tsunami', 'volcanic_eruption'];
  const urgencyLevels = ['Low', 'Medium', 'High', 'Critical'];
  const availableCategories = [
    'Emergency Shelter', 'Medical Aid', 'Food Relief', 'Clean Water',
    'Housing Reconstruction', 'Community Support', 'Temporary Housing',
    'Emergency Supplies', 'Family Support', 'Infrastructure',
    'Education Support', 'Community Rebuilding'
  ];

  const handleInputChange = (field, value) => {
    setFormData(prev => ({
      ...prev,
      [field]: value
    }));
  };

  const handleCategoryToggle = (category) => {
    setFormData(prev => ({
      ...prev,
      categories: prev.categories.includes(category)
        ? prev.categories.filter(c => c !== category)
        : [...prev.categories, category]
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!formData.title || !formData.description || !formData.location || !formData.disasterType || !formData.goal) {
      alert('Please fill in all required fields');
      return;
    }

    if (formData.categories.length === 0) {
      alert('Please select at least one category');
      return;
    }

    setIsSubmitting(true);

    try {
      // Create new campaign object
      const newCampaign = {
        id: `camp-${Date.now()}`, // Generate unique ID
        title: formData.title,
        description: formData.description,
        location: formData.location,
        disasterType: formData.disasterType,
        urgency: formData.urgency,
        raised: 0, // Start with 0 raised
        goal: parseInt(formData.goal),
        beneficiaries: parseInt(formData.beneficiaries) || 0,
        categories: formData.categories,
        submittedAt: new Date().toISOString(),
        status: 'approved' // Directly approved for immediate display
      };

      // Get existing campaigns from localStorage
      const existingCampaigns = JSON.parse(localStorage.getItem('userCreatedCampaigns') || '[]');
      
      // Add new campaign to the list
      const updatedCampaigns = [newCampaign, ...existingCampaigns];
      
      // Save to localStorage
      localStorage.setItem('userCreatedCampaigns', JSON.stringify(updatedCampaigns));
      
      // Simulate brief processing time
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      alert('Campaign created successfully and is now live!');
      navigate('/donate');
    } catch (error) {
      console.error('Error creating campaign:', error);
      alert('Failed to create campaign. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
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
    <div className="min-h-screen bg-blue-50 py-12">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="text-center mb-8">
          <div className="w-20 h-20 bg-purple-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <span className="text-4xl">📝</span>
          </div>
          <h1 className="text-3xl font-bold text-gray-900 mb-4">Create New Campaign</h1>
          <p className="text-lg text-gray-600">
            Create a new disaster relief campaign to help those in need
          </p>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="bg-white rounded-2xl shadow-lg p-8 space-y-6">
          {/* Basic Information */}
          <div className="space-y-6">
            <h2 className="text-xl font-semibold text-gray-900 border-b border-gray-200 pb-2">
              Basic Information
            </h2>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Campaign Title *
              </label>
              <input
                type="text"
                value={formData.title}
                onChange={(e) => handleInputChange('title', e.target.value)}
                className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-purple-500"
                placeholder="e.g., Turkey Earthquake Emergency Relief"
                required
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Description *
              </label>
              <textarea
                value={formData.description}
                onChange={(e) => handleInputChange('description', e.target.value)}
                rows={4}
                className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-purple-500"
                placeholder="Describe the situation and what help is needed..."
                required
              />
            </div>

            <div className="grid md:grid-cols-2 gap-6">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Location *
                </label>
                <input
                  type="text"
                  value={formData.location}
                  onChange={(e) => handleInputChange('location', e.target.value)}
                  className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-purple-500"
                  placeholder="e.g., Turkey, Middle East"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Disaster Type *
                </label>
                <select
                  value={formData.disasterType}
                  onChange={(e) => handleInputChange('disasterType', e.target.value)}
                  className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-purple-500"
                  required
                >
                  <option value="">Select disaster type</option>
                  {disasterTypes.map(type => (
                    <option key={type} value={type}>
                      {getDisasterIcon(type)} {type.charAt(0).toUpperCase() + type.slice(1).replace('_', ' ')}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div className="grid md:grid-cols-3 gap-6">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Urgency Level
                </label>
                <select
                  value={formData.urgency}
                  onChange={(e) => handleInputChange('urgency', e.target.value)}
                  className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-purple-500"
                >
                  {urgencyLevels.map(level => (
                    <option key={level} value={level}>{level}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Funding Goal (USD) *
                </label>
                <input
                  type="number"
                  value={formData.goal}
                  onChange={(e) => handleInputChange('goal', e.target.value)}
                  className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-purple-500"
                  placeholder="100000"
                  min="1000"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  People Affected
                </label>
                <input
                  type="number"
                  value={formData.beneficiaries}
                  onChange={(e) => handleInputChange('beneficiaries', e.target.value)}
                  className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-purple-500"
                  placeholder="1000"
                  min="1"
                />
              </div>
            </div>
          </div>

          {/* Categories */}
          <div className="space-y-4">
            <h2 className="text-xl font-semibold text-gray-900 border-b border-gray-200 pb-2">
              Relief Categories *
            </h2>
            <p className="text-sm text-gray-600">Select all categories that apply to this campaign</p>
            
            <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
              {availableCategories.map(category => (
                <label key={category} className="flex items-center p-3 border border-gray-200 rounded-xl hover:bg-gray-50 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={formData.categories.includes(category)}
                    onChange={() => handleCategoryToggle(category)}
                    className="mr-3 text-purple-600 focus:ring-purple-500"
                  />
                  <span className="text-sm text-gray-700">{category}</span>
                </label>
              ))}
            </div>
          </div>

          {/* Preview */}
          {formData.title && formData.description && (
            <div className="space-y-4">
              <h2 className="text-xl font-semibold text-gray-900 border-b border-gray-200 pb-2">
                Campaign Preview
              </h2>
              
              <div className="bg-gray-50 rounded-xl p-6">
                <div className="flex items-start mb-4">
                  <div className="text-4xl mr-4">
                    {getDisasterIcon(formData.disasterType)}
                  </div>
                  <div className="flex-1">
                    <h3 className="text-xl font-bold text-gray-900 mb-2">{formData.title}</h3>
                    <p className="text-gray-600 mb-3">{formData.description}</p>
                    {formData.location && (
                      <div className="flex items-center text-sm text-gray-500 mb-2">
                        <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                        </svg>
                        {formData.location}
                      </div>
                    )}
                    {formData.goal && (
                      <div className="text-sm text-gray-600">
                        <strong>Goal:</strong> ${parseInt(formData.goal).toLocaleString()}
                      </div>
                    )}
                    {formData.beneficiaries && (
                      <div className="text-sm text-gray-600">
                        <strong>People Affected:</strong> {parseInt(formData.beneficiaries).toLocaleString()}
                      </div>
                    )}
                  </div>
                  <div className={`px-3 py-1 rounded-full text-sm font-medium ${
                    formData.urgency === 'Critical' ? 'bg-red-500 text-white' :
                    formData.urgency === 'High' ? 'bg-orange-500 text-white' :
                    formData.urgency === 'Medium' ? 'bg-yellow-500 text-white' :
                    'bg-green-500 text-white'
                  }`}>
                    {formData.urgency}
                  </div>
                </div>
                
                {formData.categories.length > 0 && (
                  <div className="flex flex-wrap gap-2">
                    {formData.categories.map(category => (
                      <span key={category} className="px-2 py-1 text-xs bg-blue-100 text-blue-800 rounded-full">
                        {category}
                      </span>
                    ))}
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Submit Buttons */}
          <div className="flex gap-4 pt-6">
            <button
              type="button"
              onClick={() => navigate('/donate')}
              className="flex-1 bg-gray-200 text-gray-700 px-6 py-4 rounded-xl hover:bg-gray-300 font-medium transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="flex-1 bg-purple-600 text-white px-6 py-4 rounded-xl hover:bg-purple-700 disabled:opacity-50 font-medium transition-colors"
            >
              {isSubmitting ? 'Creating Campaign...' : 'Create Campaign'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default CreateCampaign;