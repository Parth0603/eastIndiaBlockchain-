import React, { useState, useEffect } from 'react';
import { useApi } from '../../hooks/useApi';
import LoadingSpinner from '../common/LoadingSpinner';

const ESSENTIAL_CATEGORIES = [
  { id: 'food', name: 'Food & Water', icon: '🍽️' },
  { id: 'medicine', name: 'Medicine & Healthcare', icon: '💊' },
  { id: 'shelter', name: 'Shelter & Housing', icon: '🏠' },
  { id: 'clothing', name: 'Clothing & Personal Items', icon: '👕' },
];

const SpendingInterface = ({ onTransactionComplete }) => {
  const [vendors, setVendors] = useState([]);
  const [selectedCategory, setSelectedCategory] = useState('');
  const [selectedVendor, setSelectedVendor] = useState('');
  const [amount, setAmount] = useState('');
  const [description, setDescription] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const { beneficiary, isLoading } = useApi();

  // Fetch approved vendors for selected category
  useEffect(() => {
    const fetchVendors = async () => {
      if (!selectedCategory) {
        setVendors([]);
        return;
      }

      try {
        // Fetch vendors from API
        const response = await fetch(`http://localhost:3001/api/beneficiaries/vendors?category=${selectedCategory}`, {
          headers: {
            'Authorization': `Bearer ${user?.token}`,
            'Content-Type': 'application/json',
          }
        });
        
        if (response.ok) {
          const vendorData = await response.json();
          setVendors(vendorData.vendors || []);
        } else {
          setVendors([]);
        }
      } catch (error) {
        console.error('Error fetching vendors:', error);
        setVendors([]);
      }
    };

    fetchVendors();
  }, [selectedCategory]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!selectedCategory || !selectedVendor || !amount || !description) {
      return;
    }

    setIsSubmitting(true);

    try {
      const transactionData = {
        vendorId: selectedVendor,
        category: selectedCategory,
        amount: parseFloat(amount),
        description: description.trim(),
      };

      await beneficiary.spend(transactionData);
      
      // Reset form
      setSelectedCategory('');
      setSelectedVendor('');
      setAmount('');
      setDescription('');
      
      // Notify parent component
      if (onTransactionComplete) {
        onTransactionComplete();
      }
    } catch (error) {
      console.error('Error processing transaction:', error);
    } finally {
      setIsSubmitting(false);
    }
  };

  const isFormValid = selectedCategory && selectedVendor && amount && description && parseFloat(amount) > 0;

  return (
    <div className="card">
      <h2 className="text-xl font-semibold mb-4">Make a Purchase</h2>
      
      <form onSubmit={handleSubmit} className="space-y-4">
        {/* Category Selection */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Category *
          </label>
          <div className="grid grid-cols-2 gap-2">
            {ESSENTIAL_CATEGORIES.map((category) => (
              <button
                key={category.id}
                type="button"
                onClick={() => {
                  setSelectedCategory(category.id);
                  setSelectedVendor(''); // Reset vendor when category changes
                }}
                className={`p-3 border rounded-lg text-left transition-colors ${
                  selectedCategory === category.id
                    ? 'border-blue-500 bg-blue-50 text-blue-700'
                    : 'border-gray-300 hover:border-gray-400'
                }`}
              >
                <div className="flex items-center space-x-2">
                  <span className="text-lg">{category.icon}</span>
                  <span className="text-sm font-medium">{category.name}</span>
                </div>
              </button>
            ))}
          </div>
        </div>

        {/* Vendor Selection */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Approved Vendor *
          </label>
          <select
            value={selectedVendor}
            onChange={(e) => setSelectedVendor(e.target.value)}
            disabled={!selectedCategory || vendors.length === 0}
            className="input-field"
            required
          >
            <option value="">
              {!selectedCategory 
                ? 'Select a category first' 
                : vendors.length === 0 
                ? 'No approved vendors available' 
                : 'Choose a vendor'
              }
            </option>
            {vendors.map((vendor) => (
              <option key={vendor.id} value={vendor.id}>
                {vendor.name} - {vendor.address}
              </option>
            ))}
          </select>
        </div>

        {/* Amount */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Amount (USD) *
          </label>
          <input
            type="number"
            step="0.01"
            min="0.01"
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
            placeholder="Enter purchase amount"
            className="input-field"
            required
          />
        </div>

        {/* Description */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Purchase Description *
          </label>
          <textarea
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="Describe what you're purchasing (e.g., groceries for family, prescription medication, etc.)"
            rows={3}
            className="input-field resize-none"
            required
          />
        </div>

        {/* Submit Button */}
        <button
          type="submit"
          disabled={!isFormValid || isSubmitting}
          className="btn-primary w-full disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {isSubmitting ? (
            <div className="flex items-center justify-center space-x-2">
              <LoadingSpinner size="sm" />
              <span>Processing Transaction...</span>
            </div>
          ) : (
            'Submit Purchase Request'
          )}
        </button>
      </form>

      {/* Help Text */}
      <div className="mt-4 p-3 bg-gray-50 rounded-lg">
        <p className="text-sm text-gray-600">
          <strong>Note:</strong> All purchases must be from approved vendors and within essential categories. 
          Transactions are recorded on the blockchain for transparency and cannot be reversed.
        </p>
      </div>
    </div>
  );
};

export default SpendingInterface;