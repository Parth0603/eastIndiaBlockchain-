import React, { useState, useEffect } from 'react';
import { useApi } from '../../hooks/useApi';
import LoadingSpinner from '../common/LoadingSpinner';
import toast from 'react-hot-toast';

const PurchaseValidation = () => {
  const [validationData, setValidationData] = useState({
    beneficiaryAddress: '',
    amount: '',
    category: '',
    items: [{ name: '', quantity: 1, price: '' }],
    receiptData: {
      receiptNumber: '',
      notes: ''
    }
  });
  const [isValidating, setIsValidating] = useState(false);
  const [approvedCategories, setApprovedCategories] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [validationResult, setValidationResult] = useState(null);
  const [showConfirmation, setShowConfirmation] = useState(false);
  
  const { vendor } = useApi();

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
    loadVendorCategories();
  }, []);

  const loadVendorCategories = async () => {
    try {
      const response = await vendor.getCategories();
      setApprovedCategories(response.data.approvedCategories || []);
    } catch (error) {
      toast.error('Failed to load vendor categories');
    } finally {
      setIsLoading(false);
    }
  };

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    if (name.startsWith('receiptData.')) {
      const field = name.split('.')[1];
      setValidationData(prev => ({
        ...prev,
        receiptData: {
          ...prev.receiptData,
          [field]: value
        }
      }));
    } else {
      setValidationData(prev => ({
        ...prev,
        [name]: value
      }));
    }
  };

  const handleItemChange = (index, field, value) => {
    setValidationData(prev => ({
      ...prev,
      items: prev.items.map((item, i) => 
        i === index ? { ...item, [field]: value } : item
      )
    }));
  };

  const addItem = () => {
    setValidationData(prev => ({
      ...prev,
      items: [...prev.items, { name: '', quantity: 1, price: '' }]
    }));
  };

  const removeItem = (index) => {
    if (validationData.items.length > 1) {
      setValidationData(prev => ({
        ...prev,
        items: prev.items.filter((_, i) => i !== index)
      }));
    }
  };

  const calculateTotal = () => {
    return validationData.items.reduce((total, item) => {
      const itemTotal = parseFloat(item.quantity || 0) * parseFloat(item.price || 0);
      return total + (isNaN(itemTotal) ? 0 : itemTotal);
    }, 0).toFixed(2);
  };

  const validateForm = () => {
    if (!validationData.beneficiaryAddress) {
      toast.error('Beneficiary address is required');
      return false;
    }

    if (!validationData.category) {
      toast.error('Category is required');
      return false;
    }

    if (!approvedCategories.includes(validationData.category)) {
      toast.error('You are not approved for this category');
      return false;
    }

    const total = calculateTotal();
    if (parseFloat(total) <= 0) {
      toast.error('Total amount must be greater than 0');
      return false;
    }

    if (Math.abs(parseFloat(total) - parseFloat(validationData.amount)) > 0.01) {
      toast.error('Amount must match the total of items');
      return false;
    }

    const hasEmptyItems = validationData.items.some(item => 
      !item.name || !item.quantity || !item.price
    );
    if (hasEmptyItems) {
      toast.error('All item fields must be filled');
      return false;
    }

    return true;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!validateForm()) return;

    setIsValidating(true);
    try {
      const submitData = {
        beneficiaryAddress: validationData.beneficiaryAddress,
        amount: validationData.amount,
        category: validationData.category,
        items: validationData.items,
        receiptData: validationData.receiptData
      };

      const response = await vendor.validatePurchase(submitData);
      
      // Store validation result for confirmation display
      setValidationResult({
        transactionId: response.data.transactionId,
        status: response.data.status,
        estimatedConfirmation: response.data.estimatedConfirmation,
        amount: validationData.amount,
        category: validationData.category,
        beneficiary: validationData.beneficiaryAddress,
        items: validationData.items,
        timestamp: new Date().toISOString()
      });
      
      setShowConfirmation(true);
      
      // Reset form
      setValidationData({
        beneficiaryAddress: '',
        amount: '',
        category: '',
        items: [{ name: '', quantity: 1, price: '' }],
        receiptData: {
          receiptNumber: '',
          notes: ''
        }
      });
      
      toast.success('Purchase validated successfully!');
    } catch (error) {
      toast.error(error.message || 'Failed to validate purchase');
    } finally {
      setIsValidating(false);
    }
  };

  // Auto-calculate amount when items change
  useEffect(() => {
    const total = calculateTotal();
    setValidationData(prev => ({
      ...prev,
      amount: total
    }));
  }, [validationData.items]);

  if (isLoading) {
    return (
      <div className="p-8">
        <LoadingSpinner />
      </div>
    );
  }

  if (approvedCategories.length === 0) {
    return (
      <div className="bg-white rounded-lg shadow-md p-8 text-center">
        <div className="text-4xl mb-4">⚠️</div>
        <h3 className="text-lg font-semibold text-gray-900 mb-2">
          No Approved Categories
        </h3>
        <p className="text-gray-600">
          You need to be approved for at least one category to validate purchases.
          Please wait for verification or contact support.
        </p>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-lg shadow-md p-6">
      <div className="mb-6">
        <h2 className="text-xl font-semibold text-gray-900">Purchase Validation</h2>
        <p className="text-gray-600 mt-1">
          Validate purchases from disaster relief beneficiaries
        </p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Beneficiary Information */}
        <div className="grid md:grid-cols-2 gap-6">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Beneficiary Wallet Address *
            </label>
            <input
              type="text"
              name="beneficiaryAddress"
              value={validationData.beneficiaryAddress}
              onChange={handleInputChange}
              className="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="0x..."
              required
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Category *
            </label>
            <select
              name="category"
              value={validationData.category}
              onChange={handleInputChange}
              className="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
              required
            >
              <option value="">Select category</option>
              {essentialCategories
                .filter(cat => approvedCategories.includes(cat.value))
                .map(category => (
                  <option key={category.value} value={category.value}>
                    {category.label}
                  </option>
                ))}
            </select>
          </div>
        </div>

        {/* Items Section */}
        <div>
          <div className="flex justify-between items-center mb-4">
            <h3 className="text-lg font-medium text-gray-900">Items</h3>
            <button
              type="button"
              onClick={addItem}
              className="btn-secondary text-sm"
            >
              Add Item
            </button>
          </div>

          <div className="space-y-4">
            {validationData.items.map((item, index) => (
              <div key={index} className="grid grid-cols-12 gap-4 items-end">
                <div className="col-span-5">
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Item Name
                  </label>
                  <input
                    type="text"
                    value={item.name}
                    onChange={(e) => handleItemChange(index, 'name', e.target.value)}
                    className="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="Enter item name"
                    required
                  />
                </div>

                <div className="col-span-2">
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Quantity
                  </label>
                  <input
                    type="number"
                    min="1"
                    value={item.quantity}
                    onChange={(e) => handleItemChange(index, 'quantity', e.target.value)}
                    className="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                    required
                  />
                </div>

                <div className="col-span-3">
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Price ($)
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    min="0"
                    value={item.price}
                    onChange={(e) => handleItemChange(index, 'price', e.target.value)}
                    className="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="0.00"
                    required
                  />
                </div>

                <div className="col-span-2">
                  {validationData.items.length > 1 && (
                    <button
                      type="button"
                      onClick={() => removeItem(index)}
                      className="w-full btn-secondary text-red-600 hover:bg-red-50"
                    >
                      Remove
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>

          {/* Total Amount */}
          <div className="mt-4 p-4 bg-gray-50 rounded-lg">
            <div className="flex justify-between items-center">
              <span className="text-lg font-medium text-gray-900">Total Amount:</span>
              <span className="text-xl font-bold text-gray-900">${calculateTotal()}</span>
            </div>
          </div>
        </div>

        {/* Receipt Information */}
        <div>
          <h3 className="text-lg font-medium text-gray-900 mb-4">Receipt Information</h3>
          <div className="grid md:grid-cols-2 gap-6">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Receipt Number
              </label>
              <input
                type="text"
                name="receiptData.receiptNumber"
                value={validationData.receiptData.receiptNumber}
                onChange={handleInputChange}
                className="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="Enter receipt number"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Total Amount *
              </label>
              <input
                type="number"
                step="0.01"
                name="amount"
                value={validationData.amount}
                onChange={handleInputChange}
                className="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500 bg-gray-50"
                placeholder="0.00"
                readOnly
                required
              />
            </div>
          </div>

          <div className="mt-4">
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Additional Notes
            </label>
            <textarea
              name="receiptData.notes"
              value={validationData.receiptData.notes}
              onChange={handleInputChange}
              rows="3"
              className="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="Add any additional notes about the purchase..."
            />
          </div>
        </div>

        {/* Submit Button */}
        <div className="flex justify-end">
          <button
            type="submit"
            disabled={isValidating}
            className="btn-primary px-8"
          >
            {isValidating ? (
              <div className="flex items-center">
                <LoadingSpinner size="sm" />
                <span className="ml-2">Validating...</span>
              </div>
            ) : (
              'Validate Purchase'
            )}
          </button>
        </div>
      </form>

      {/* Help Section */}
      <div className="mt-8 p-4 bg-blue-50 rounded-lg">
        <h4 className="font-medium text-blue-900 mb-2">How Purchase Validation Works</h4>
        <ul className="text-sm text-blue-800 space-y-1">
          <li>• Enter the beneficiary's wallet address and select the appropriate category</li>
          <li>• Add all items being purchased with quantities and prices</li>
          <li>• The system will verify the beneficiary has sufficient funds</li>
          <li>• Once validated, the transaction will be processed on the blockchain</li>
          <li>• You'll receive payment confirmation within 2-5 minutes</li>
        </ul>
      </div>

      {/* Payment Confirmation Modal */}
      {showConfirmation && validationResult && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg shadow-xl max-w-2xl w-full mx-4">
            <div className="p-6">
              <div className="text-center mb-6">
                <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
                  <span className="text-3xl">✅</span>
                </div>
                <h3 className="text-xl font-semibold text-gray-900">Payment Validation Successful</h3>
                <p className="text-gray-600 mt-2">
                  The purchase has been validated and is being processed on the blockchain.
                </p>
              </div>

              <div className="bg-gray-50 p-4 rounded-lg mb-6">
                <h4 className="font-medium text-gray-900 mb-3">Transaction Details</h4>
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span className="text-gray-600">Transaction ID:</span>
                    <span className="font-mono text-gray-900">
                      {validationResult.transactionId.slice(0, 8)}...{validationResult.transactionId.slice(-8)}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">Amount:</span>
                    <span className="font-semibold text-gray-900">${validationResult.amount}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">Category:</span>
                    <span className="text-gray-900 capitalize">
                      {validationResult.category.replace('_', ' ')}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">Status:</span>
                    <span className="px-2 py-1 text-xs font-medium rounded-full bg-yellow-100 text-yellow-800">
                      {validationResult.status.toUpperCase()}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">Estimated Confirmation:</span>
                    <span className="text-gray-900">{validationResult.estimatedConfirmation}</span>
                  </div>
                </div>
              </div>

              {validationResult.items.length > 0 && (
                <div className="bg-gray-50 p-4 rounded-lg mb-6">
                  <h4 className="font-medium text-gray-900 mb-3">Items Purchased</h4>
                  <div className="space-y-2">
                    {validationResult.items.map((item, index) => (
                      <div key={index} className="flex justify-between text-sm">
                        <span className="text-gray-600">
                          {item.name} (x{item.quantity})
                        </span>
                        <span className="text-gray-900">${item.price}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              <div className="bg-blue-50 p-4 rounded-lg mb-6">
                <h4 className="font-medium text-blue-900 mb-2">What Happens Next?</h4>
                <ul className="text-sm text-blue-800 space-y-1">
                  <li>• The transaction is being processed on the blockchain</li>
                  <li>• You'll receive payment once the transaction is confirmed</li>
                  <li>• Check your transaction history for real-time updates</li>
                  <li>• A receipt will be available once the transaction is confirmed</li>
                </ul>
              </div>

              <div className="flex justify-end space-x-4">
                <button
                  onClick={() => setShowConfirmation(false)}
                  className="btn-secondary"
                >
                  Close
                </button>
                <button
                  onClick={() => {
                    setShowConfirmation(false);
                    // Could navigate to transaction history here
                  }}
                  className="btn-primary"
                >
                  View Transaction History
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default PurchaseValidation;