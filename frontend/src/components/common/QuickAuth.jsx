import { useState } from 'react';
import { useAuth } from '../../hooks/useAuth';
import { useWallet } from '../../hooks/useWallet';

const QuickAuth = ({ onSuccess, onCancel }) => {
  const { authenticateWithWallet } = useAuth();
  const { web3, account } = useWallet();
  const [isLoading, setIsLoading] = useState(false);
  const [selectedRole, setSelectedRole] = useState('donor');

  const handleQuickAuth = async () => {
    if (!web3 || !account) {
      alert('Please connect your wallet first');
      return;
    }

    setIsLoading(true);
    
    try {
      await authenticateWithWallet(web3, account, selectedRole, {
        quickAuth: true,
        timestamp: Date.now()
      });
      
      onSuccess && onSuccess();
    } catch (error) {
      console.error('Quick auth failed:', error);
      alert('Authentication failed. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-2xl p-6 max-w-md w-full mx-4">
        <h3 className="text-lg font-bold text-gray-900 mb-4">Quick Authentication</h3>
        <p className="text-gray-600 mb-4">
          Select your role to quickly authenticate and access your dashboard:
        </p>
        
        <div className="space-y-3 mb-6">
          <label className="flex items-center">
            <input
              type="radio"
              name="role"
              value="donor"
              checked={selectedRole === 'donor'}
              onChange={(e) => setSelectedRole(e.target.value)}
              className="mr-3"
            />
            <span>💝 Donor - Make donations</span>
          </label>
          <label className="flex items-center">
            <input
              type="radio"
              name="role"
              value="beneficiary"
              checked={selectedRole === 'beneficiary'}
              onChange={(e) => setSelectedRole(e.target.value)}
              className="mr-3"
            />
            <span>🏠 Beneficiary - Receive aid</span>
          </label>
          <label className="flex items-center">
            <input
              type="radio"
              name="role"
              value="vendor"
              checked={selectedRole === 'vendor'}
              onChange={(e) => setSelectedRole(e.target.value)}
              className="mr-3"
            />
            <span>🏪 Vendor - Provide services</span>
          </label>
        </div>

        <div className="flex gap-3">
          <button
            onClick={onCancel}
            className="flex-1 bg-gray-200 text-gray-700 px-4 py-2 rounded-lg hover:bg-gray-300"
          >
            Cancel
          </button>
          <button
            onClick={handleQuickAuth}
            disabled={isLoading}
            className="flex-1 bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 disabled:opacity-50"
          >
            {isLoading ? 'Authenticating...' : 'Authenticate'}
          </button>
        </div>
      </div>
    </div>
  );
};

export default QuickAuth;