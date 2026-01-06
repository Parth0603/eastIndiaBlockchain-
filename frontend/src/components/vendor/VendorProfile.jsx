import React, { useState, useEffect } from 'react';
import { useApi } from '../../hooks/useApi';
import LoadingSpinner from '../common/LoadingSpinner';
import toast from 'react-hot-toast';

const VendorProfile = () => {
  const [profile, setProfile] = useState(null);
  const [isEditing, setIsEditing] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [editData, setEditData] = useState({});
  const [newDocuments, setNewDocuments] = useState([]);
  
  const { vendor } = useApi();

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
    { value: 'food', label: 'Food & Beverages' },
    { value: 'medicine', label: 'Medicine & Healthcare' },
    { value: 'shelter', label: 'Shelter & Housing' },
    { value: 'clothing', label: 'Clothing & Textiles' },
    { value: 'water', label: 'Water & Sanitation' },
    { value: 'hygiene', label: 'Hygiene & Personal Care' },
    { value: 'emergency_supplies', label: 'Emergency Supplies' }
  ];

  useEffect(() => {
    loadProfile();
  }, []);

  const loadProfile = async () => {
    try {
      setIsLoading(true);
      const response = await vendor.getProfile();
      setProfile(response.data);
      setEditData(response.data);
    } catch (error) {
      toast.error('Failed to load vendor profile');
    } finally {
      setIsLoading(false);
    }
  };

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setEditData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const handleCategoryToggle = (category) => {
    setEditData(prev => ({
      ...prev,
      requestedCategories: prev.requestedCategories?.includes(category)
        ? prev.requestedCategories.filter(c => c !== category)
        : [...(prev.requestedCategories || []), category]
    }));
  };

  const handleFileUpload = (e) => {
    const files = Array.from(e.target.files);
    setNewDocuments(prev => [...prev, ...files]);
  };

  const removeNewDocument = (index) => {
    setNewDocuments(prev => prev.filter((_, i) => i !== index));
  };

  const handleSave = async () => {
    try {
      setIsSaving(true);
      
      const formData = new FormData();
      
      // Add form fields
      Object.keys(editData).forEach(key => {
        if (key === 'documents' || key === '_id' || key === 'createdAt' || key === 'updatedAt') return;
        if (key === 'requestedCategories') {
          formData.append(key, JSON.stringify(editData[key]));
        } else {
          formData.append(key, editData[key]);
        }
      });

      // Add new documents
      newDocuments.forEach((file) => {
        formData.append('newDocuments', file);
      });

      const response = await vendor.updateProfile(formData);
      setProfile(response.data);
      setEditData(response.data);
      setNewDocuments([]);
      setIsEditing(false);
      
      toast.success('Profile updated successfully');
    } catch (error) {
      toast.error(error.message || 'Failed to update profile');
    } finally {
      setIsSaving(false);
    }
  };

  const handleCancel = () => {
    setEditData(profile);
    setNewDocuments([]);
    setIsEditing(false);
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'approved': return 'bg-green-100 text-green-800';
      case 'rejected': return 'bg-red-100 text-red-800';
      case 'under_review': return 'bg-blue-100 text-blue-800';
      case 'pending': return 'bg-yellow-100 text-yellow-800';
      case 'suspended': return 'bg-red-100 text-red-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const formatDate = (date) => {
    return new Date(date).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
  };

  if (isLoading) {
    return (
      <div className="p-8">
        <LoadingSpinner />
      </div>
    );
  }

  if (!profile) {
    return (
      <div className="p-8 text-center">
        <p className="text-gray-500">No vendor profile found</p>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto p-6">
      <div className="bg-white rounded-lg shadow-md">
        {/* Header */}
        <div className="p-6 border-b border-gray-200">
          <div className="flex justify-between items-start">
            <div>
              <h2 className="text-2xl font-bold text-gray-900">{profile.businessName}</h2>
              <div className="flex items-center mt-2 space-x-4">
                <span className={`px-3 py-1 text-sm font-medium rounded-full ${getStatusColor(profile.status)}`}>
                  {profile.verificationStatusDisplay || profile.status.replace('_', ' ')}
                </span>
                <span className="text-sm text-gray-500">
                  Registered: {formatDate(profile.createdAt)}
                </span>
              </div>
            </div>
            <div className="flex space-x-3">
              {!isEditing ? (
                <button
                  onClick={() => setIsEditing(true)}
                  className="btn-secondary"
                  disabled={profile.status === 'suspended'}
                >
                  Edit Profile
                </button>
              ) : (
                <div className="flex space-x-2">
                  <button
                    onClick={handleCancel}
                    className="btn-secondary"
                    disabled={isSaving}
                  >
                    Cancel
                  </button>
                  <button
                    onClick={handleSave}
                    className="btn-primary"
                    disabled={isSaving}
                  >
                    {isSaving ? 'Saving...' : 'Save Changes'}
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Profile Content */}
        <div className="p-6">
          <div className="grid md:grid-cols-2 gap-8">
            {/* Business Information */}
            <div className="space-y-6">
              <h3 className="text-lg font-semibold text-gray-900">Business Information</h3>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Business Name
                </label>
                {isEditing ? (
                  <input
                    type="text"
                    name="businessName"
                    value={editData.businessName || ''}
                    onChange={handleInputChange}
                    className="w-full border border-gray-300 rounded-md px-3 py-2"
                  />
                ) : (
                  <p className="text-gray-900">{profile.businessName}</p>
                )}
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Business Type
                </label>
                {isEditing ? (
                  <select
                    name="businessType"
                    value={editData.businessType || ''}
                    onChange={handleInputChange}
                    className="w-full border border-gray-300 rounded-md px-3 py-2"
                  >
                    {businessTypes.map(type => (
                      <option key={type.value} value={type.value}>
                        {type.label}
                      </option>
                    ))}
                  </select>
                ) : (
                  <p className="text-gray-900">
                    {businessTypes.find(t => t.value === profile.businessType)?.label || profile.businessType}
                  </p>
                )}
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Business License
                </label>
                {isEditing ? (
                  <input
                    type="text"
                    name="businessLicense"
                    value={editData.businessLicense || ''}
                    onChange={handleInputChange}
                    className="w-full border border-gray-300 rounded-md px-3 py-2"
                  />
                ) : (
                  <p className="text-gray-900">{profile.businessLicense || 'Not provided'}</p>
                )}
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Description
                </label>
                {isEditing ? (
                  <textarea
                    name="description"
                    value={editData.description || ''}
                    onChange={handleInputChange}
                    rows="3"
                    className="w-full border border-gray-300 rounded-md px-3 py-2"
                  />
                ) : (
                  <p className="text-gray-900">{profile.description || 'No description provided'}</p>
                )}
              </div>
            </div>

            {/* Contact Information */}
            <div className="space-y-6">
              <h3 className="text-lg font-semibold text-gray-900">Contact Information</h3>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Email
                </label>
                {isEditing ? (
                  <input
                    type="email"
                    name="email"
                    value={editData.email || ''}
                    onChange={handleInputChange}
                    className="w-full border border-gray-300 rounded-md px-3 py-2"
                  />
                ) : (
                  <p className="text-gray-900">{profile.email}</p>
                )}
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Phone
                </label>
                {isEditing ? (
                  <input
                    type="tel"
                    name="phone"
                    value={editData.phone || ''}
                    onChange={handleInputChange}
                    className="w-full border border-gray-300 rounded-md px-3 py-2"
                  />
                ) : (
                  <p className="text-gray-900">{profile.phone || 'Not provided'}</p>
                )}
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Business Address
                </label>
                {isEditing ? (
                  <div className="space-y-2">
                    <input
                      type="text"
                      name="address_line1"
                      value={editData.address_line1 || ''}
                      onChange={handleInputChange}
                      placeholder="Address Line 1"
                      className="w-full border border-gray-300 rounded-md px-3 py-2"
                    />
                    <input
                      type="text"
                      name="address_line2"
                      value={editData.address_line2 || ''}
                      onChange={handleInputChange}
                      placeholder="Address Line 2"
                      className="w-full border border-gray-300 rounded-md px-3 py-2"
                    />
                    <div className="grid grid-cols-2 gap-2">
                      <input
                        type="text"
                        name="city"
                        value={editData.city || ''}
                        onChange={handleInputChange}
                        placeholder="City"
                        className="border border-gray-300 rounded-md px-3 py-2"
                      />
                      <input
                        type="text"
                        name="state"
                        value={editData.state || ''}
                        onChange={handleInputChange}
                        placeholder="State"
                        className="border border-gray-300 rounded-md px-3 py-2"
                      />
                    </div>
                    <input
                      type="text"
                      name="zipCode"
                      value={editData.zipCode || ''}
                      onChange={handleInputChange}
                      placeholder="ZIP Code"
                      className="w-full border border-gray-300 rounded-md px-3 py-2"
                    />
                  </div>
                ) : (
                  <p className="text-gray-900">{profile.fullAddress}</p>
                )}
              </div>
            </div>
          </div>

          {/* Categories Section */}
          <div className="mt-8 pt-6 border-t border-gray-200">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Service Categories</h3>
            
            {/* Approved Categories */}
            {profile.approvedCategories && profile.approvedCategories.length > 0 && (
              <div className="mb-6">
                <h4 className="text-sm font-medium text-gray-700 mb-2">Approved Categories</h4>
                <div className="flex flex-wrap gap-2">
                  {profile.approvedCategories.map(category => (
                    <span
                      key={category}
                      className="px-3 py-1 bg-green-100 text-green-800 text-sm rounded-full"
                    >
                      {essentialCategories.find(c => c.value === category)?.label || category}
                    </span>
                  ))}
                </div>
              </div>
            )}

            {/* Requested Categories */}
            <div>
              <h4 className="text-sm font-medium text-gray-700 mb-2">
                {isEditing ? 'Update Requested Categories' : 'Requested Categories'}
              </h4>
              {isEditing ? (
                <div className="grid grid-cols-2 gap-2">
                  {essentialCategories.map(category => (
                    <label key={category.value} className="flex items-center">
                      <input
                        type="checkbox"
                        checked={editData.requestedCategories?.includes(category.value) || false}
                        onChange={() => handleCategoryToggle(category.value)}
                        className="mr-2"
                      />
                      <span className="text-sm">{category.label}</span>
                    </label>
                  ))}
                </div>
              ) : (
                <div className="flex flex-wrap gap-2">
                  {profile.requestedCategories?.map(category => (
                    <span
                      key={category}
                      className="px-3 py-1 bg-blue-100 text-blue-800 text-sm rounded-full"
                    >
                      {essentialCategories.find(c => c.value === category)?.label || category}
                    </span>
                  )) || <span className="text-gray-500">No categories requested</span>}
                </div>
              )}
            </div>
          </div>

          {/* Documents Section */}
          <div className="mt-8 pt-6 border-t border-gray-200">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Business Documents</h3>
            
            {/* Existing Documents */}
            {profile.documents && profile.documents.length > 0 && (
              <div className="mb-6">
                <h4 className="text-sm font-medium text-gray-700 mb-2">Uploaded Documents</h4>
                <div className="space-y-2">
                  {profile.documents.map((doc, index) => (
                    <div key={index} className="flex items-center justify-between bg-gray-50 p-3 rounded">
                      <div>
                        <p className="text-sm font-medium text-gray-900">
                          {doc.originalName || doc.filename}
                        </p>
                        <p className="text-xs text-gray-500">
                          Uploaded: {formatDate(doc.uploadDate)}
                          {doc.verified && <span className="ml-2 text-green-600">✓ Verified</span>}
                        </p>
                      </div>
                      <button className="text-blue-600 hover:text-blue-800 text-sm">
                        View
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Add New Documents */}
            {isEditing && (
              <div>
                <h4 className="text-sm font-medium text-gray-700 mb-2">Add New Documents</h4>
                <input
                  type="file"
                  multiple
                  accept=".pdf,.jpg,.jpeg,.png,.doc,.docx"
                  onChange={handleFileUpload}
                  className="w-full border border-gray-300 rounded-md px-3 py-2"
                />
                
                {newDocuments.length > 0 && (
                  <div className="mt-4 space-y-2">
                    {newDocuments.map((file, index) => (
                      <div key={index} className="flex items-center justify-between bg-blue-50 p-3 rounded">
                        <div>
                          <p className="text-sm font-medium text-gray-900">{file.name}</p>
                          <p className="text-xs text-gray-500">
                            {(file.size / 1024 / 1024).toFixed(2)} MB
                          </p>
                        </div>
                        <button
                          type="button"
                          onClick={() => removeNewDocument(index)}
                          className="text-red-600 hover:text-red-800 text-sm"
                        >
                          Remove
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Verification Status */}
          {profile.verifiedAt && (
            <div className="mt-8 pt-6 border-t border-gray-200">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">Verification Details</h3>
              <div className="bg-gray-50 p-4 rounded">
                <p className="text-sm text-gray-900">
                  <span className="font-medium">Verified by:</span> {profile.verifiedBy}
                </p>
                <p className="text-sm text-gray-900">
                  <span className="font-medium">Verification date:</span> {formatDate(profile.verifiedAt)}
                </p>
                {profile.reviewNotes && (
                  <p className="text-sm text-gray-900 mt-2">
                    <span className="font-medium">Notes:</span> {profile.reviewNotes}
                  </p>
                )}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default VendorProfile;