import React, { useState } from 'react';
import { useApi } from '../../hooks/useApi';

const FraudReportModal = ({ isOpen, onClose, reportedEntity, entityType }) => {
  const [formData, setFormData] = useState({
    reportType: '',
    severity: 'medium',
    description: '',
    evidence: []
  });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);

  const apiClient = useApi();

  const reportTypes = {
    vendor: [
      { value: 'fraudulent_transaction', label: 'Fraudulent Transaction' },
      { value: 'price_manipulation', label: 'Price Manipulation' },
      { value: 'fake_documents', label: 'Fake Documents' },
      { value: 'suspicious_behavior', label: 'Suspicious Behavior' },
      { value: 'other', label: 'Other' }
    ],
    beneficiary: [
      { value: 'identity_theft', label: 'Identity Theft' },
      { value: 'duplicate_claims', label: 'Duplicate Claims' },
      { value: 'fake_documents', label: 'Fake Documents' },
      { value: 'suspicious_behavior', label: 'Suspicious Behavior' },
      { value: 'other', label: 'Other' }
    ],
    verifier: [
      { value: 'collusion', label: 'Collusion' },
      { value: 'suspicious_behavior', label: 'Suspicious Behavior' },
      { value: 'other', label: 'Other' }
    ]
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setIsSubmitting(true);
    setError('');

    try {
      const reportData = {
        reportedEntity,
        entityType,
        reportType: formData.reportType,
        severity: formData.severity,
        description: formData.description,
        evidence: formData.evidence,
        isAnonymous: false
      };

      await apiClient.fraud.submitReport(reportData);
      setSuccess(true);
      
      // Reset form after successful submission
      setTimeout(() => {
        setSuccess(false);
        onClose();
        setFormData({
          reportType: '',
          severity: 'medium',
          description: '',
          evidence: []
        });
      }, 2000);

    } catch (error) {
      console.error('Submit fraud report error:', error);
      setError(error.response?.data?.message || 'Failed to submit fraud report');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleInputChange = (field, value) => {
    setFormData(prev => ({
      ...prev,
      [field]: value
    }));
  };

  const addEvidence = () => {
    setFormData(prev => ({
      ...prev,
      evidence: [...prev.evidence, { type: 'other', description: '', data: '' }]
    }));
  };

  const updateEvidence = (index, field, value) => {
    setFormData(prev => ({
      ...prev,
      evidence: prev.evidence.map((item, i) => 
        i === index ? { ...item, [field]: value } : item
      )
    }));
  };

  const removeEvidence = (index) => {
    setFormData(prev => ({
      ...prev,
      evidence: prev.evidence.filter((_, i) => i !== index)
    }));
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg p-6 w-full max-w-2xl max-h-[90vh] overflow-y-auto">
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-2xl font-bold text-gray-900">Report Fraud</h2>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600"
          >
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {success ? (
          <div className="text-center py-8">
            <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <svg className="w-8 h-8 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
              </svg>
            </div>
            <h3 className="text-lg font-semibold text-gray-900 mb-2">Report Submitted</h3>
            <p className="text-gray-600">Your fraud report has been submitted successfully and will be reviewed by our team.</p>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
              <div className="flex">
                <svg className="w-5 h-5 text-yellow-400 mr-2 mt-0.5" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                </svg>
                <div>
                  <h4 className="text-sm font-medium text-yellow-800">Important Notice</h4>
                  <p className="text-sm text-yellow-700 mt-1">
                    False reports may result in account suspension. Please ensure all information is accurate.
                  </p>
                </div>
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Reporting: {entityType} ({reportedEntity?.slice(0, 10)}...{reportedEntity?.slice(-8)})
              </label>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Report Type *
              </label>
              <select
                value={formData.reportType}
                onChange={(e) => handleInputChange('reportType', e.target.value)}
                required
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              >
                <option value="">Select report type</option>
                {reportTypes[entityType]?.map(type => (
                  <option key={type.value} value={type.value}>
                    {type.label}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Severity
              </label>
              <select
                value={formData.severity}
                onChange={(e) => handleInputChange('severity', e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              >
                <option value="low">Low - Minor concern</option>
                <option value="medium">Medium - Moderate concern</option>
                <option value="high">High - Serious concern</option>
                <option value="critical">Critical - Immediate attention required</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Description *
              </label>
              <textarea
                value={formData.description}
                onChange={(e) => handleInputChange('description', e.target.value)}
                required
                rows={4}
                placeholder="Please provide detailed information about the suspected fraud..."
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>

            <div>
              <div className="flex justify-between items-center mb-2">
                <label className="block text-sm font-medium text-gray-700">
                  Evidence (Optional)
                </label>
                <button
                  type="button"
                  onClick={addEvidence}
                  className="text-sm text-blue-600 hover:text-blue-800"
                >
                  + Add Evidence
                </button>
              </div>
              
              {formData.evidence.map((evidence, index) => (
                <div key={index} className="border border-gray-200 rounded-lg p-4 mb-3">
                  <div className="flex justify-between items-start mb-3">
                    <h4 className="text-sm font-medium text-gray-700">Evidence {index + 1}</h4>
                    <button
                      type="button"
                      onClick={() => removeEvidence(index)}
                      className="text-red-600 hover:text-red-800"
                    >
                      Remove
                    </button>
                  </div>
                  
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-xs font-medium text-gray-600 mb-1">Type</label>
                      <select
                        value={evidence.type}
                        onChange={(e) => updateEvidence(index, 'type', e.target.value)}
                        className="w-full px-2 py-1 text-sm border border-gray-300 rounded focus:ring-1 focus:ring-blue-500"
                      >
                        <option value="transaction_hash">Transaction Hash</option>
                        <option value="screenshot">Screenshot</option>
                        <option value="document">Document</option>
                        <option value="witness_statement">Witness Statement</option>
                        <option value="other">Other</option>
                      </select>
                    </div>
                    
                    <div>
                      <label className="block text-xs font-medium text-gray-600 mb-1">Description</label>
                      <input
                        type="text"
                        value={evidence.description}
                        onChange={(e) => updateEvidence(index, 'description', e.target.value)}
                        placeholder="Brief description"
                        className="w-full px-2 py-1 text-sm border border-gray-300 rounded focus:ring-1 focus:ring-blue-500"
                      />
                    </div>
                  </div>
                  
                  <div className="mt-3">
                    <label className="block text-xs font-medium text-gray-600 mb-1">Data/Reference</label>
                    <input
                      type="text"
                      value={evidence.data}
                      onChange={(e) => updateEvidence(index, 'data', e.target.value)}
                      placeholder="Transaction hash, URL, or other reference"
                      className="w-full px-2 py-1 text-sm border border-gray-300 rounded focus:ring-1 focus:ring-blue-500"
                    />
                  </div>
                </div>
              ))}
            </div>

            {error && (
              <div className="bg-red-50 border border-red-200 rounded-lg p-4">
                <div className="flex">
                  <svg className="w-5 h-5 text-red-400 mr-2" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                  </svg>
                  <p className="text-sm text-red-700">{error}</p>
                </div>
              </div>
            )}

            <div className="flex justify-end space-x-4 pt-4 border-t">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2 text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={isSubmitting || !formData.reportType || !formData.description}
                className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isSubmitting ? 'Submitting...' : 'Submit Report'}
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
};

export default FraudReportModal;