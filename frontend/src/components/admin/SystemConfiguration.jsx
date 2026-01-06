import React, { useState, useEffect } from 'react';
import { useApi } from '../../hooks/useApi';
import LoadingSpinner from '../common/LoadingSpinner';
import toast from 'react-hot-toast';

const SystemConfiguration = () => {
  const [categories, setCategories] = useState([]);
  const [newCategory, setNewCategory] = useState('');
  const [isEditing, setIsEditing] = useState(false);
  const { admin, isLoading } = useApi();

  // Default essential categories
  const defaultCategories = [
    'Food & Water',
    'Medical Supplies',
    'Shelter & Housing',
    'Clothing & Personal Items',
    'Emergency Transportation',
    'Communication Services'
  ];

  useEffect(() => {
    fetchCategories();
  }, []);

  const fetchCategories = async () => {
    try {
      const data = await admin.getStats();
      setCategories(data.essentialCategories || defaultCategories);
    } catch (error) {
      console.error('Failed to fetch categories:', error);
      // Fallback to default categories
      setCategories(defaultCategories);
    }
  };

  const handleAddCategory = () => {
    if (!newCategory.trim()) {
      toast.error('Category name cannot be empty');
      return;
    }

    if (categories.includes(newCategory.trim())) {
      toast.error('Category already exists');
      return;
    }

    const updatedCategories = [...categories, newCategory.trim()];
    setCategories(updatedCategories);
    setNewCategory('');
  };

  const handleRemoveCategory = (categoryToRemove) => {
    if (categories.length <= 1) {
      toast.error('At least one category must remain');
      return;
    }

    const updatedCategories = categories.filter(cat => cat !== categoryToRemove);
    setCategories(updatedCategories);
  };

  const handleSaveCategories = async () => {
    if (categories.length === 0) {
      toast.error('At least one category is required');
      return;
    }

    try {
      await admin.updateCategories({ categories });
      setIsEditing(false);
      toast.success('Categories updated successfully');
    } catch (error) {
      console.error('Failed to update categories:', error);
      // Revert to previous state
      await fetchCategories();
    }
  };

  const handleCancelEdit = () => {
    setIsEditing(false);
    setNewCategory('');
    fetchCategories(); // Revert changes
  };

  return (
    <div className="space-y-6">
      {/* Essential Categories Configuration */}
      <div className="card">
        <div className="flex justify-between items-center mb-6">
          <div>
            <h2 className="text-xl font-semibold">Essential Spending Categories</h2>
            <p className="text-gray-600 text-sm mt-1">
              Configure which categories beneficiaries can spend their allocated funds on
            </p>
          </div>
          <div className="flex gap-2">
            {isEditing ? (
              <>
                <button
                  onClick={handleSaveCategories}
                  disabled={isLoading}
                  className="btn-primary"
                >
                  {isLoading ? 'Saving...' : 'Save Changes'}
                </button>
                <button
                  onClick={handleCancelEdit}
                  className="btn-secondary"
                >
                  Cancel
                </button>
              </>
            ) : (
              <button
                onClick={() => setIsEditing(true)}
                className="btn-primary"
              >
                Edit Categories
              </button>
            )}
          </div>
        </div>

        {isLoading && !isEditing ? (
          <LoadingSpinner />
        ) : (
          <div className="space-y-4">
            {/* Current Categories */}
            <div className="grid gap-3">
              {categories.map((category, index) => (
                <div
                  key={index}
                  className="flex items-center justify-between p-3 bg-gray-50 rounded-lg"
                >
                  <div className="flex items-center">
                    <span className="text-2xl mr-3">
                      {getCategoryIcon(category)}
                    </span>
                    <span className="font-medium text-gray-900">{category}</span>
                  </div>
                  {isEditing && (
                    <button
                      onClick={() => handleRemoveCategory(category)}
                      className="text-red-600 hover:text-red-800 p-1"
                      title="Remove category"
                    >
                      ✕
                    </button>
                  )}
                </div>
              ))}
            </div>

            {/* Add New Category */}
            {isEditing && (
              <div className="flex gap-2 mt-4">
                <input
                  type="text"
                  value={newCategory}
                  onChange={(e) => setNewCategory(e.target.value)}
                  placeholder="Enter new category name"
                  className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  onKeyPress={(e) => e.key === 'Enter' && handleAddCategory()}
                />
                <button
                  onClick={handleAddCategory}
                  className="btn-primary"
                >
                  Add
                </button>
              </div>
            )}

            {!isEditing && (
              <div className="text-sm text-gray-500 mt-4">
                <p>
                  <strong>Note:</strong> These categories determine what beneficiaries can purchase 
                  with their allocated relief funds. Changes will apply to all future transactions.
                </p>
              </div>
            )}
          </div>
        )}
      </div>

      {/* System Settings */}
      <div className="card">
        <h2 className="text-xl font-semibold mb-6">System Settings</h2>
        
        <div className="space-y-6">
          {/* Transaction Limits */}
          <div>
            <h3 className="text-lg font-medium mb-3">Transaction Limits</h3>
            <div className="grid md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Maximum Single Transaction ($)
                </label>
                <input
                  type="number"
                  defaultValue="0"
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  disabled={!isEditing}
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Daily Spending Limit ($)
                </label>
                <input
                  type="number"
                  defaultValue="500"
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  disabled={!isEditing}
                />
              </div>
            </div>
          </div>

          {/* Approval Settings */}
          <div>
            <h3 className="text-lg font-medium mb-3">Approval Requirements</h3>
            <div className="space-y-3">
              <label className="flex items-center">
                <input
                  type="checkbox"
                  defaultChecked={true}
                  className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                  disabled={!isEditing}
                />
                <span className="ml-2 text-sm text-gray-700">
                  Require verifier approval for beneficiary applications
                </span>
              </label>
              <label className="flex items-center">
                <input
                  type="checkbox"
                  defaultChecked={true}
                  className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                  disabled={!isEditing}
                />
                <span className="ml-2 text-sm text-gray-700">
                  Require vendor verification before approval
                </span>
              </label>
              <label className="flex items-center">
                <input
                  type="checkbox"
                  defaultChecked={false}
                  className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                  disabled={!isEditing}
                />
                <span className="ml-2 text-sm text-gray-700">
                  Enable automatic fraud detection alerts
                </span>
              </label>
            </div>
          </div>

          {/* Notification Settings */}
          <div>
            <h3 className="text-lg font-medium mb-3">Notifications</h3>
            <div className="space-y-3">
              <label className="flex items-center">
                <input
                  type="checkbox"
                  defaultChecked={true}
                  className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                  disabled={!isEditing}
                />
                <span className="ml-2 text-sm text-gray-700">
                  Email notifications for new applications
                </span>
              </label>
              <label className="flex items-center">
                <input
                  type="checkbox"
                  defaultChecked={true}
                  className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                  disabled={!isEditing}
                />
                <span className="ml-2 text-sm text-gray-700">
                  Real-time alerts for large transactions
                </span>
              </label>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

// Helper function to get category icons
const getCategoryIcon = (category) => {
  const iconMap = {
    'Food & Water': '🍽️',
    'Medical Supplies': '🏥',
    'Shelter & Housing': '🏠',
    'Clothing & Personal Items': '👕',
    'Emergency Transportation': '🚗',
    'Communication Services': '📱',
  };
  
  // Return specific icon or default
  return iconMap[category] || '📦';
};

export default SystemConfiguration;