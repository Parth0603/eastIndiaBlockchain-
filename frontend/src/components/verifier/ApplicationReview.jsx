import React, { useState, useEffect } from 'react';
import { useApi } from '../../hooks/useApi';
import LoadingSpinner from '../common/LoadingSpinner';
import toast from 'react-hot-toast';

const ApplicationReview = () => {
  const [applications, setApplications] = useState([]);
  const [selectedApplication, setSelectedApplication] = useState(null);
  const [filter, setFilter] = useState('pending');
  const [reviewData, setReviewData] = useState({
    action: '',
    approvedAmount: '',
    notes: ''
  });
  const [isSubmitting, setIsSubmitting] = useState(false);
  
  const { verifier, isLoading } = useApi();

  useEffect(() => {
    loadApplications();
  }, [filter]);

  const loadApplications = async () => {
    try {
      const response = await verifier.getApplications({ status: filter });
      setApplications(response.applications || []);
    } catch (error) {
      console.error('Failed to load applications:', error);
    }
  };

  const handleReviewSubmit = async (e) => {
    e.preventDefault();
    if (!selectedApplication || !reviewData.action) return;

    setIsSubmitting(true);
    try {
      await verifier.reviewApplication(selectedApplication._id, {
        action: reviewData.action,
        approvedAmount: reviewData.action === 'approve' ? reviewData.approvedAmount : undefined,
        notes: reviewData.notes
      });

      // Refresh applications list
      await loadApplications();
      
      // Reset form and close modal
      setSelectedApplication(null);
      setReviewData({ action: '', approvedAmount: '', notes: '' });
      
      toast.success(`Application ${reviewData.action}d successfully`);
    } catch (error) {
      toast.error(`Failed to ${reviewData.action} application`);
    } finally {
      setIsSubmitting(false);
    }
  };

  const formatAmount = (amount) => {
    if (!amount) return '0';
    const amountInEther = parseFloat(amount) / Math.pow(10, 18);
    return amountInEther.toFixed(4);
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

  const getPriorityColor = (priority) => {
    switch (priority) {
      case 'urgent': return 'bg-red-100 text-red-800';
      case 'high': return 'bg-orange-100 text-orange-800';
      case 'medium': return 'bg-yellow-100 text-yellow-800';
      case 'low': return 'bg-green-100 text-green-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'approved': return 'bg-green-100 text-green-800';
      case 'rejected': return 'bg-red-100 text-red-800';
      case 'under_review': return 'bg-blue-100 text-blue-800';
      case 'pending': return 'bg-yellow-100 text-yellow-800';
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
        <h2 className="text-xl font-semibold text-gray-900">Application Review</h2>
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
            <option value="">All Applications</option>
          </select>
          <button
            onClick={loadApplications}
            className="btn-secondary text-sm"
          >
            Refresh
          </button>
        </div>
      </div>

      {/* Applications List */}
      <div className="space-y-4">
        {applications.length === 0 ? (
          <div className="text-center py-12">
            <div className="text-4xl mb-4">📋</div>
            <p className="text-gray-500">No applications found</p>
          </div>
        ) : (
          applications.map((application) => (
            <div
              key={application._id}
              className="border border-gray-200 rounded-lg p-4 hover:shadow-md transition-shadow cursor-pointer"
              onClick={() => setSelectedApplication(application)}
            >
              <div className="flex justify-between items-start">
                <div className="flex-1">
                  <div className="flex items-center space-x-3 mb-2">
                    <h3 className="font-medium text-gray-900">
                      {application.applicantAddress.slice(0, 10)}...
                    </h3>
                    <span className={`px-2 py-1 text-xs font-medium rounded-full ${getPriorityColor(application.priority)}`}>
                      {application.priority}
                    </span>
                    <span className={`px-2 py-1 text-xs font-medium rounded-full ${getStatusColor(application.status)}`}>
                      {application.status.replace('_', ' ')}
                    </span>
                  </div>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm text-gray-600">
                    <div>
                      <span className="font-medium">Disaster:</span> {application.disasterType}
                    </div>
                    <div>
                      <span className="font-medium">Location:</span> {application.location}
                    </div>
                    <div>
                      <span className="font-medium">Requested:</span> {formatAmount(application.requestedAmount)} ETH
                    </div>
                    <div>
                      <span className="font-medium">Applied:</span> {formatDate(application.createdAt)}
                    </div>
                  </div>
                  {application.description && (
                    <p className="text-sm text-gray-600 mt-2 line-clamp-2">
                      {application.description}
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

      {/* Application Review Modal */}
      {selectedApplication && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg max-w-4xl w-full max-h-[90vh] overflow-y-auto">
            <div className="p-6">
              <div className="flex justify-between items-center mb-6">
                <h3 className="text-xl font-semibold">Application Review</h3>
                <button
                  onClick={() => setSelectedApplication(null)}
                  className="text-gray-400 hover:text-gray-600"
                >
                  ✕
                </button>
              </div>

              {/* Application Details */}
              <div className="grid md:grid-cols-2 gap-6 mb-6">
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Applicant Address
                    </label>
                    <p className="text-sm text-gray-900 font-mono bg-gray-50 p-2 rounded">
                      {selectedApplication.applicantAddress}
                    </p>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Disaster Type
                    </label>
                    <p className="text-sm text-gray-900 capitalize">
                      {selectedApplication.disasterType}
                    </p>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Location
                    </label>
                    <p className="text-sm text-gray-900">{selectedApplication.location}</p>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Requested Amount
                    </label>
                    <p className="text-sm text-gray-900">
                      {formatAmount(selectedApplication.requestedAmount)} ETH
                    </p>
                  </div>
                </div>

                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Priority
                    </label>
                    <span className={`px-2 py-1 text-xs font-medium rounded-full ${getPriorityColor(selectedApplication.priority)}`}>
                      {selectedApplication.priority}
                    </span>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Status
                    </label>
                    <span className={`px-2 py-1 text-xs font-medium rounded-full ${getStatusColor(selectedApplication.status)}`}>
                      {selectedApplication.status.replace('_', ' ')}
                    </span>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Application Date
                    </label>
                    <p className="text-sm text-gray-900">
                      {formatDate(selectedApplication.createdAt)}
                    </p>
                  </div>
                  {selectedApplication.metadata?.familySize && (
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Family Size
                      </label>
                      <p className="text-sm text-gray-900">
                        {selectedApplication.metadata.familySize} members
                      </p>
                    </div>
                  )}
                </div>
              </div>

              {/* Description */}
              {selectedApplication.description && (
                <div className="mb-6">
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Description
                  </label>
                  <p className="text-sm text-gray-900 bg-gray-50 p-3 rounded">
                    {selectedApplication.description}
                  </p>
                </div>
              )}

              {/* Documents */}
              {selectedApplication.documents && selectedApplication.documents.length > 0 && (
                <div className="mb-6">
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Supporting Documents
                  </label>
                  <div className="space-y-2">
                    {selectedApplication.documents.map((doc, index) => (
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

              {/* Review Form */}
              {(selectedApplication.status === 'pending' || selectedApplication.status === 'under_review') && (
                <form onSubmit={handleReviewSubmit} className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Review Decision
                    </label>
                    <div className="flex space-x-4">
                      <label className="flex items-center">
                        <input
                          type="radio"
                          name="action"
                          value="approve"
                          checked={reviewData.action === 'approve'}
                          onChange={(e) => setReviewData({ ...reviewData, action: e.target.value })}
                          className="mr-2"
                        />
                        Approve
                      </label>
                      <label className="flex items-center">
                        <input
                          type="radio"
                          name="action"
                          value="reject"
                          checked={reviewData.action === 'reject'}
                          onChange={(e) => setReviewData({ ...reviewData, action: e.target.value })}
                          className="mr-2"
                        />
                        Reject
                      </label>
                    </div>
                  </div>

                  {reviewData.action === 'approve' && (
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Approved Amount (ETH)
                      </label>
                      <input
                        type="number"
                        step="0.0001"
                        value={reviewData.approvedAmount}
                        onChange={(e) => setReviewData({ ...reviewData, approvedAmount: e.target.value })}
                        className="w-full border border-gray-300 rounded-md px-3 py-2"
                        placeholder="Enter approved amount"
                        required
                      />
                    </div>
                  )}

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Review Notes
                    </label>
                    <textarea
                      value={reviewData.notes}
                      onChange={(e) => setReviewData({ ...reviewData, notes: e.target.value })}
                      className="w-full border border-gray-300 rounded-md px-3 py-2"
                      rows="3"
                      placeholder="Add review notes..."
                    />
                  </div>

                  <div className="flex justify-end space-x-3">
                    <button
                      type="button"
                      onClick={() => setSelectedApplication(null)}
                      className="btn-secondary"
                    >
                      Cancel
                    </button>
                    <button
                      type="submit"
                      disabled={!reviewData.action || isSubmitting}
                      className={`btn-primary ${
                        reviewData.action === 'reject' ? 'bg-red-600 hover:bg-red-700' : ''
                      }`}
                    >
                      {isSubmitting ? 'Processing...' : `${reviewData.action === 'approve' ? 'Approve' : 'Reject'} Application`}
                    </button>
                  </div>
                </form>
              )}

              {/* Previous Review Info */}
              {selectedApplication.reviewedAt && (
                <div className="mt-6 pt-6 border-t border-gray-200">
                  <h4 className="text-sm font-medium text-gray-700 mb-2">Previous Review</h4>
                  <div className="bg-gray-50 p-3 rounded">
                    <p className="text-sm text-gray-900">
                      <span className="font-medium">Reviewed by:</span> {selectedApplication.verifierAddress}
                    </p>
                    <p className="text-sm text-gray-900">
                      <span className="font-medium">Date:</span> {formatDate(selectedApplication.reviewedAt)}
                    </p>
                    {selectedApplication.approvedAmount && (
                      <p className="text-sm text-gray-900">
                        <span className="font-medium">Approved Amount:</span> {formatAmount(selectedApplication.approvedAmount)} ETH
                      </p>
                    )}
                    {selectedApplication.reviewNotes && (
                      <p className="text-sm text-gray-900 mt-2">
                        <span className="font-medium">Notes:</span> {selectedApplication.reviewNotes}
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

export default ApplicationReview;