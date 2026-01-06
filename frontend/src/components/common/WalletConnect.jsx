import React, { useState, useEffect } from 'react';
import { useWallet } from '../../hooks/useWallet';
import { useAuth } from '../../hooks/useAuth';
import LoadingSpinner, { ButtonSpinner } from './LoadingSpinner';

const WalletConnect = ({ 
  showBalance = true, 
  showNetwork = true,
  className = '',
  size = 'md' 
}) => {
  const { 
    isConnected, 
    account, 
    balance, 
    network, 
    isLoading: isConnecting, 
    connectWallet, 
    disconnectWallet,
    web3,
    error: walletError 
  } = useWallet();
  
  const { 
    isAuthenticated, 
    user, 
    authenticateWithWallet, 
    logout, 
    isLoading: authLoading 
  } = useAuth();

  const [isAuthenticating, setIsAuthenticating] = useState(false);

  // REMOVED AUTO-AUTHENTICATION - Only connect wallet, don't auto-authenticate
  // This prevents the MetaMask popup on refresh

  const handleConnect = async () => {
    try {
      await connectWallet();
    } catch (error) {
      console.error('Failed to connect wallet:', error);
    }
  };

  const handleAuthenticate = async () => {
    if (!isConnected || !web3 || !account) {
      await handleConnect();
      return;
    }

    setIsAuthenticating(true);
    try {
      await authenticateWithWallet(web3, account);
    } catch (error) {
      console.error('Failed to authenticate:', error);
    } finally {
      setIsAuthenticating(false);
    }
  };

  const handleDisconnect = async () => {
    try {
      // Show confirmation
      const confirmed = window.confirm(
        'Are you sure you want to disconnect your wallet?\n\n' +
        'Note: This will clear your authentication and you\'ll need to reconnect and sign again to access the app.'
      );
      
      if (!confirmed) return;

      if (isAuthenticated) {
        await logout();
      }
      await disconnectWallet();
      
      // Show success message
      console.log('✅ Wallet disconnected successfully');
    } catch (error) {
      console.error('Failed to disconnect:', error);
    }
  };

  const truncateAddress = (address) => {
    if (!address) return '';
    return `${address.slice(0, 6)}...${address.slice(-4)}`;
  };

  const formatBalance = (balance) => {
    if (!balance) return '0';
    return parseFloat(balance).toFixed(4);
  };

  const sizeClasses = {
    sm: 'px-3 py-1.5 text-sm',
    md: 'px-4 py-2 text-sm',
    lg: 'px-6 py-3 text-base'
  };

  // Not connected state
  if (!isConnected) {
    return (
      <div className={className}>
        <button
          onClick={handleConnect}
          disabled={isConnecting}
          className={`
            inline-flex items-center justify-center
            ${sizeClasses[size]}
            bg-blue-600 hover:bg-blue-700 disabled:bg-blue-400
            text-white font-medium rounded-lg
            transition-colors duration-200
            focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2
          `}
        >
          {isConnecting ? (
            <>
              <ButtonSpinner className="mr-2" />
              Connecting...
            </>
          ) : (
            <>
              <svg className="w-4 h-4 mr-2" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M3 4a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1zm0 4a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1zm0 4a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1z" clipRule="evenodd" />
              </svg>
              Connect Wallet
            </>
          )}
        </button>
        {walletError && (
          <p className="mt-2 text-sm text-red-600">{walletError}</p>
        )}
      </div>
    );
  }

  // Connected and authenticated - show full wallet info
  if (isConnected && isAuthenticated) {
    return (
      <div className={className}>
        <div className="flex items-center space-x-4">
          {/* Connection Status */}
          <div className="flex items-center space-x-2">
            <div className="w-2 h-2 bg-green-400 rounded-full"></div>
            <div className="text-sm">
              <div className="font-medium text-gray-900">
                {truncateAddress(account)}
              </div>
              {user?.roles && (
                <div className="text-xs text-gray-500">
                  {user.roles.join(', ')}
                </div>
              )}
            </div>
          </div>

          {/* Balance */}
          {showBalance && balance && (
            <div className="text-sm text-gray-600">
              <span className="font-medium">{formatBalance(balance)} ETH</span>
            </div>
          )}

          {/* Network */}
          {showNetwork && network && (
            <div className="text-xs text-gray-500">
              {network.name || `Chain ${network.chainId}`}
            </div>
          )}

          {/* Disconnect Button */}
          <button
            onClick={handleDisconnect}
            className="inline-flex items-center px-3 py-1 text-xs bg-red-100 text-red-700 hover:bg-red-200 rounded-md transition-colors"
            title="Disconnect wallet"
          >
            <svg className="w-3 h-3 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
            </svg>
            Disconnect
          </button>
        </div>
      </div>
    );
  }

  // Connected but not authenticated - show simple connect button only
  return (
    <div className={className}>
      <div className="flex items-center space-x-3">
        <div className="flex items-center space-x-2">
          <div className="w-2 h-2 bg-blue-400 rounded-full"></div>
          <span className="text-sm text-gray-600">
            {truncateAddress(account)}
          </span>
        </div>
        <span className="text-xs text-gray-500">Connected</span>
      </div>
    </div>
  );
};

// Compact version for headers
export const CompactWalletConnect = ({ className = '' }) => (
  <WalletConnect 
    size="sm"
    showBalance={false}
    showNetwork={false}
    className={className}
  />
);

// Full version for dashboards
export const DetailedWalletConnect = ({ className = '' }) => (
  <WalletConnect 
    size="lg"
    showBalance={true}
    showNetwork={true}
    className={className}
  />
);

export default WalletConnect;