import React, { useState } from 'react';
import { useAuth } from '../../hooks/useAuth';
import { useWallet } from '../../hooks/useWallet';

const RoleSwitcher = ({ className = '' }) => {
  // Disable role switcher in production
  if (import.meta.env.PROD) {
    return null;
  }
  const { user, isAuthenticated, authenticateWithWallet } = useAuth();
  const { isConnected, web3, account } = useWallet();
  const [switching, setSwitching] = useState(false);

  // Show role switcher when wallet is connected
  if (!isConnected) return null;

  const switchRole = async (newRole) => {
    setSwitching(true);
    
    try {
      // If not authenticated, authenticate first
      if (!isAuthenticated && web3 && account) {
        await authenticateWithWallet(web3, account);
      }

      // Update user role in localStorage for demo purposes
      const authData = JSON.parse(localStorage.getItem('walletAuth') || '{}');
      if (authData.user) {
        authData.user.roles = [newRole];
        localStorage.setItem('walletAuth', JSON.stringify(authData));
        
        // Small delay to show the switching state
        await new Promise(resolve => setTimeout(resolve, 500));
        
        // Refresh to apply new role
        window.location.reload();
      } else if (web3 && account) {
        // Create new auth data if none exists
        const userData = {
          address: account,
          roles: [newRole],
          authenticated: true,
          timestamp: Date.now()
        };
        localStorage.setItem('walletAuth', JSON.stringify({ user: userData }));
        window.location.reload();
      }
    } catch (error) {
      console.error('Error switching role:', error);
      setSwitching(false);
    }
  };

  const currentRole = user?.roles?.[0] || 'donor';

  if (switching) {
    return (
      <div className={`bg-white rounded-lg shadow p-4 ${className}`}>
        <div className="flex items-center justify-center py-4">
          <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-600"></div>
          <span className="ml-2 text-sm text-gray-600">Switching role...</span>
        </div>
      </div>
    );
  }

  return (
    <div className={`bg-white rounded-lg shadow p-4 ${className}`}>
      <h3 className="text-sm font-medium text-gray-900 mb-3">🎭 Demo: Switch Role</h3>
      <div className="grid grid-cols-4 gap-2">
        {['donor', 'beneficiary', 'vendor', 'admin'].map((role) => (
          <button
            key={role}
            onClick={() => switchRole(role)}
            disabled={currentRole === role}
            className={`px-3 py-2 text-xs rounded-md transition-colors font-medium ${
              currentRole === role
                ? 'bg-blue-600 text-white cursor-not-allowed'
                : 'bg-gray-100 text-gray-700 hover:bg-blue-100 hover:text-blue-800'
            }`}
          >
            {role.charAt(0).toUpperCase() + role.slice(1)}
          </button>
        ))}
      </div>
      <p className="text-xs text-gray-500 mt-2 flex items-center">
        <span className="w-2 h-2 bg-green-400 rounded-full mr-2"></span>
        Current: <strong className="ml-1">{currentRole}</strong>
        {!isAuthenticated && (
          <span className="ml-2 text-orange-600">(Click role to authenticate)</span>
        )}
      </p>
    </div>
  );
};

export default RoleSwitcher;