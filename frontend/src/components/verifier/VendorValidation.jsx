import React, { useState, useEffect } from 'react';
import { useApi } from '../../hooks/useApi';
import LoadingSpinner from '../common/LoadingSpinner';
import toast from 'react-hot-toast';

const VendorValidation = () => {
  const [vendors, setVendors] = useState([]);
  const [selectedVendor, setSelectedVendor] = useState(null);
  const [filter, setFilter] = useState('pending');
  const [validationData, setValidationData] = useState({
    action: '',
    approvedCategories: [],
    notes: ''
  });
  const [isSubmitting, setIsSubmitting] = useState(false);
  
  const { verifier, isLoading } = useApi();

  const essentialCategories = [
    'food',
    'medicine',
    'shelter',
    'clothing',
    'water',
    'hygiene',
    'emergency_supplies'
  ];

  useEffect(() => {
    loadVendors();
  }, [filter]);

  const loadVendors = async () => {
    try {
      const response = await verifier.getVendors({ status: filter });
      setVendors(response.vendors || []);
    } catch (error) {
      console.error('Failed to load vendors:', error);
    }
  };

  const handleValidationSubmit = async (e) => {
    e.preventDefault();
    if (!selectedVendor || !validationData.action) return;

    setIsSubmitting(true);
    try {
      await verifier.approveVendor(selectedVendor._id, {
        action: validationData.action,
        approvedCategories: validationData.action === 'approve' ? validationData.approvedCategories : [],
        notes: validationData.notes
      });

      // Refresh vendors list
      await loadVendors();
      
      // Reset form and close modal
      setSelectedVendor(null);
      setValidationData({ action: '', approvedCategories: [], notes: '' });
      
      toast.success(`Vendor ${validationData.action}d successfully`);
    } catch (error) {
      toast.error(`Failed to ${validationData.action} vendor`);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleCategoryToggle = (category) => {
    setValidationData(prev => ({
      ...prev,
      approvedCategories: prev.approvedCategories.includes(category)
        ? prev.approvedCategories.filter(c => c !== category)
        : [...prev.approvedCategories, category]
    }));
  };

  const formatDate = (date) => {
    return new Date(date).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
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

  if (isLoading) {
    return (
      <div className="p-8">
        <LoadingSpinner />
      </div>
    );
  }

  return (
    <div className="p-6">
      {/* Header with filters */}
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-xl font-semibold text-gray-900">Vendor Validation</h2>
        <div className="flex space-x-4">
          <select
            value={filter}
            onChange={(e) => setFilter(e.target.value)}
            className="border border-gray-300 rounded-md px-3 py-2 text-sm"
          >
            <option value="pending">Pending</option>
            <option value="under_review">Under Review</option>
            <option value="approved">Approved</option>
            <option value="rejected">Rejected</option>
            <option value="suspended">Suspended</option>
            <option value="">All Vendors</option>
          </select>
          <button
            onClick={loadVendors}
            className="btn-secondary text-sm"
          >
            Refresh
          </button>
        </div>
      </div>

      {/* Vendors List */}
      <div className="space-y-4">
        {vendors.length === 0 ? (
          <div className="text-center py-12">
            <div className="text-4xl mb-4">🏪</div>
            <p className="text-gray-500">No vendors found</p>
          </div>
        ) : (
          vendors.map((vendor) => (
            <div
              key={vendor._id}
              className="border border-gray-200 rounded-lg p-4 hover:shadow-md transition-shadow cursor-pointer"
              onClick={() => setSelectedVendor(vendor)}
            >
              <div className="flex justify-between items-start">
                <div className="flex-1">
                  <div className="flex items-center space-x-3 mb-2">
                    <h3 className="font-medium text-gray-900">
                      {vendor.businessName || `${vendor.address.slice(0, 10)}...`}
                    </h3>
                    <span className={`px-2 py-1 text-xs font-medium rounded-full ${getStatusColor(vendor.status)}`}>
                      {vendor.status.replace('_', ' ')}
                    </span>
                  </div>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm text-gray-600">
                    <div>
                      <span className="font-medium">Address:</span> {vendor.address.slice(0, 10)}...
                    </div>
                    <div>
                      <span className="font-medium">Business Type:</span> {vendor.businessType || 'N/A'}
                    </div>
                    <div>
                      <span className="font-medium">Categories:</span> {vendor.categories?.length || 0}
                    </div>
                    <div>
                      <span className="font-medium">Registered:</span> {formatDate(vendor.createdAt)}
                    </div>
                  </div>
                  {vendor.description && (
                    <p className="text-sm text-gray-600 mt-2 line-clamp-2">
                      {vendor.description}
                    </p>
                  )}
                </div>
                <div className="ml-4">
                  <button className="text-blue-600 hover:text-blue-800 text-sm font-medium">
                    Review →
                  </button>
                </div>
              </div>
            </div>
          ))
        )}
      </div>

      {/* Vendor Validation Modal */}
      {selectedVendor && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg max-w-4xl w-full max-h-[90vh] overflow-y-auto">
            <div className="p-6">
              <div className="flex justify-between items-center mb-6">
                <h3 className="text-xl font-semibold">Vendor Validation</h3>
                <button
                  onClick={() => setSelectedVendor(null)}
                  className="text-gray-400 hover:text-gray-600"
                >
                  ✕
                </button>
              </div>

              {/* Vendor Details */}
              <div className="grid md:grid-cols-2 gap-6 mb-6">
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Wallet Address
                    </label>
                    <p className="text-sm text-gray-900 font-mono bg-gray-50 p-2 rounded">
                      {selectedVendor.address}
                    </p>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Business Name
                    </label>
                    <p className="text-sm text-gray-900">
                      {selectedVendor.businessName || 'Not provided'}
                    </p>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Business Type
                    </label>
                    <p className="text-sm text-gray-900">
                      {selectedVendor.businessType || 'Not specified'}
                    </p>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Contact Email
                    </label>
                    <p className="text-sm text-gray-900">
                      {selectedVendor.email || 'Not provided'}
                    </p>
                  </div>
                </div>

                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Status
                    </label>
                    <span className={`px-2 py-1 text-xs font-medium rounded-full ${getStatusColor(selectedVendor.status)}`}>
                      {selectedVendor.status.replace('_', ' ')}
                    </span>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Registration Date
                    </label>
                    <p className="text-sm text-gray-900">
                      {formatDate(selectedVendor.createdAt)}
                    </p>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Phone Number
                    </label>
                    <p className="text-sm text-gray-900">
                      {selectedVendor.phone || 'Not provided'}
                    </p>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Business License
                    </label>
                    <p className="text-sm text-gray-900">
                      {selectedVendor.businessLicense || 'Not provided'}
                    </p>
                  </div>
                </div>
              </div>

              {/* Business Description */}
              {selectedVendor.description && (
                <div className="mb-6">
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Business Description
                  </label>
                  <p className="text-sm text-gray-900 bg-gray-50 p-3 rounded">
                    {selectedVendor.description}
                  </p>
                </div>
              )}

              {/* Current Categories */}
              {selectedVendor.categories && selectedVendor.categories.length > 0 && (
                <div className="mb-6">
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Requested Categories
                  </label>
                  <div className="flex flex-wrap gap-2">
                    {selectedVendor.categories.map((category) => (
                      <span
                        key={category}
                        className="px-3 py-1 bg-blue-100 text-blue-800 text-sm rounded-full"
                      >
                        {category}
                      </span>
                    ))}
                  </div>
                </div>
              )}

              {/* Business Documents */}
              {selectedVendor.documents && selectedVendor.documents.length > 0 && (
                <div className="mb-6">
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Business Documents
                  </label>
                  <div className="space-y-2">
                    {selectedVendor.documents.map((doc, index) => (
                      <div key={index} className="flex items-center justify-between bg-gray-50 p-3 rounded">
                        <div>
                          <p className="text-sm font-medium text-gray-900">
                            {doc.originalName || doc.filename}
                          </p>
                          <p className="text-xs text-gray-500">
                            Uploaded: {formatDate(doc.uploadDate)}
                          </p>
                        </div>
                        <div className="flex items-center space-x-2">
                          {doc.verified && (
                            <span className="text-green-600 text-xs">✓ Verified</span>
                          )}
                          <button className="text-blue-600 hover:text-blue-800 text-sm">
                            View
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Validation Form */}
              {(selectedVendor.status === 'pending' || selectedVendor.status === 'under_review') && (
                <form onSubmit={handleValidationSubmit} className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Validation Decision
                    </label>
                    <div className="flex space-x-4">
                      <label className="flex items-center">
                        <input
                          type="radio"
                          name="action"
                          value="approve"
                          checked={validationData.action === 'approve'}
                          onChange={(e) => setValidationData({ ...validationData, action: e.target.value })}
                          className="mr-2"
                        />
                        Approve
                      </label>
                      <label className="flex items-center">
                        <input
                          type="radio"
                          name="action"
                          value="reject"
                          checked={validationData.action === 'reject'}
                          onChange={(e) => setValidationData({ ...validationData, action: e.target.value })}
                          className="mr-2"
                        />
                        Reject
                      </label>
                    </div>
                  </div>

                  {validationData.action === 'approve' && (
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Approved Categories
                      </label>
                      <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
                        {essentialCategories.map((category) => (
                          <label key={category} className="flex items-center">
                            <input
                              type="checkbox"
                              checked={validationData.approvedCategories.includes(category)}
                              onChange={() => handleCategoryToggle(category)}
                              className="mr-2"
                            />
                            <span className="text-sm capitalize">{category.replace('_', ' ')}</span>
                          </label>
                        ))}
                      </div>
                    </div>
                  )}

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Validation Notes
                    </label>
                    <textarea
                      value={validationData.notes}
                      onChange={(e) => setValidationData({ ...validationData, notes: e.target.value })}
                      className="w-full border border-gray-300 rounded-md px-3 py-2"
                      rows="3"
                      placeholder="Add validation notes..."
                    />
                  </div>

                  <div className="flex justify-end space-x-3">
                    <button
                      type="button"
                      onClick={() => setSelectedVendor(null)}
                      className="btn-secondary"
                    >
                      Cancel
                    </button>
                    <button
                      type="submit"
                      disabled={!validationData.action || isSubmitting || 
                        (validationData.action === 'approve' && validationData.approvedCategories.length === 0)}
                      className={`btn-primary ${
                        validationData.action === 'reject' ? 'bg-red-600 hover:bg-red-700' : ''
                      }`}
                    >
                      {isSubmitting ? 'Processing...' : `${validationData.action === 'approve' ? 'Approve' : 'Reject'} Vendor`}
                    </button>
                  </div>
                </form>
              )}

              {/* Previous Validation Info */}
              {selectedVendor.reviewedAt && (
                <div className="mt-6 pt-6 border-t border-gray-200">
                  <h4 className="text-sm font-medium text-gray-700 mb-2">Previous Validation</h4>
                  <div className="bg-gray-50 p-3 rounded">
                    <p className="text-sm text-gray-900">
                      <span className="font-medium">Reviewed by:</span> {selectedVendor.verifierAddress}
                    </p>
                    <p className="text-sm text-gray-900">
                      <span className="font-medium">Date:</span> {formatDate(selectedVendor.reviewedAt)}
                    </p>
                    {selectedVendor.approvedCategories && selectedVendor.approvedCategories.length > 0 && (
                      <div className="mt-2">
                        <span className="font-medium text-sm text-gray-900">Approved Categories:</span>
                        <div className="flex flex-wrap gap-1 mt-1">
                          {selectedVendor.approvedCategories.map((category) => (
                            <span
                              key={category}
                              className="px-2 py-1 bg-green-100 text-green-800 text-xs rounded"
                            >
                              {category}
                            </span>
                          ))}
                        </div>
                      </div>
                    )}
                    {selectedVendor.reviewNotes && (
                      <p className="text-sm text-gray-900 mt-2">
                        <span className="font-medium">Notes:</span> {selectedVendor.reviewNotes}
                      </p>
                    )}
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default VendorValidation;