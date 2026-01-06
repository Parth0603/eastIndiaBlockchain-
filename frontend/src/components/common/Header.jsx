import { Link, useNavigate } from 'react-router-dom';
import { useState } from 'react';
import { useAuth } from '../../hooks/useAuth';
import { useWallet } from '../../hooks/useWallet';
import QuickAuth from './QuickAuth';
import CurrencyOverlay from './CurrencyOverlay';
import logoImage from '../../assets/logo.png';

const Header = () => {
  const { isAuthenticated, user, logout, isLoading } = useAuth();
  const { isConnected, account, connectWallet, disconnectWallet } = useWallet();
  const [showQuickAuth, setShowQuickAuth] = useState(false);
  const navigate = useNavigate();

  const handleSignOut = () => {
    try {
      logout();
      navigate('/'); // Redirect to home page
      console.log('User signed out - redirected to home page');
    } catch (error) {
      console.error('Failed to sign out:', error);
    }
  };

  const handleDisconnect = () => {
    try {
      if (isAuthenticated) {
        logout();
      }
      disconnectWallet();
    } catch (error) {
      console.error('Failed to disconnect:', error);
    }
  };

  const truncateAddress = (address) => {
    if (!address) return '';
    return `${address.slice(0, 6)}...${address.slice(-4)}`;
  };

  return (
    <header className="bg-white/95 backdrop-blur-sm shadow-sm border-b sticky top-0 z-50">
      <nav className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Main Header Row */}
        <div className="flex justify-between items-center h-20 py-2">
          {/* Logo */}
          <div className="flex items-center flex-shrink-0 min-w-0 flex-1 max-w-md">
            <Link to="/" className="flex items-center space-x-4">
              <div className="relative">
                <img 
                  src={logoImage}
                  alt="ReliefChain Logo" 
                  className="w-14 h-14 object-contain"
                  onError={(e) => {
                    // Try public folder path as fallback
                    e.target.src = '/logo.png';
                    e.target.onerror = () => {
                      // Final fallback to emoji
                      e.target.style.display = 'none';
                      e.target.nextElementSibling.style.display = 'flex';
                    };
                  }}
                />
                <div className="w-14 h-14 bg-blue-500 rounded-lg items-center justify-center hidden">
                  <span className="text-white font-bold text-2xl">⛓️</span>
                </div>
              </div>
              <div className="flex flex-col">
                <span className="hidden sm:block text-xl font-bold text-blue-600 leading-tight">
                  ReliefChain
                </span>
                <span className="hidden lg:block text-sm text-gray-500 leading-tight">
                  Transparent, stablecoin-powered disaster relief
                </span>
                <span className="sm:hidden text-xl font-bold text-blue-600">
                  RC
                </span>
              </div>
            </Link>
          </div>
          
          {/* Right Side - Wallet & Actions */}
          <div className="flex items-center space-x-2">
            {/* Currency Overlay - Only show on larger screens */}
            <div className="hidden xl:block">
              <CurrencyOverlay />
            </div>
            
            {/* Show Sign Up button when not connected or not authenticated (but not while loading) */}
            {!isLoading && (!isConnected || !isAuthenticated) && (
              <Link 
                to="/signup" 
                className="bg-blue-500 text-white px-3 py-2 rounded-lg hover:bg-blue-600 font-medium transition-all duration-200 text-sm whitespace-nowrap"
              >
                Sign Up
              </Link>
            )}

            {/* Show Dashboard button for authenticated users */}
            {!isLoading && isAuthenticated && user?.roles && (
              <Link 
                to={
                  user.roles.includes('admin') ? '/admin' :
                  user.roles.includes('beneficiary') ? '/beneficiary' :
                  user.roles.includes('vendor') ? '/vendor' :
                  '/donor'
                }
                className="bg-green-500 text-white px-3 py-2 rounded-lg hover:bg-green-600 font-medium transition-all duration-200 text-sm whitespace-nowrap"
              >
                My Dashboard
              </Link>
            )}

            {/* Wallet Connection/Disconnection */}
            {!isConnected ? (
              <button
                onClick={connectWallet}
                className="inline-flex items-center px-3 py-2 text-sm bg-blue-600 hover:bg-blue-700 text-white font-medium rounded-lg transition-colors duration-200 whitespace-nowrap"
              >
                <svg className="w-4 h-4 mr-2" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M3 4a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1zm0 4a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1zm0 4a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1z" clipRule="evenodd" />
                </svg>
                Connect Wallet
              </button>
            ) : (
              <div className="flex items-center space-x-2">
                {/* Connected Wallet Info */}
                <div className="flex items-center space-x-2 bg-green-50 px-3 py-2 rounded-lg">
                  <div className="w-2 h-2 bg-green-400 rounded-full"></div>
                  <span className="text-sm text-gray-700 font-medium">
                    {truncateAddress(account)}
                  </span>
                  {!isLoading && isAuthenticated && user?.roles && (
                    <span className="text-sm text-green-600 font-medium capitalize">
                      {user.roles[0]}
                    </span>
                  )}
                </div>
                
                {/* Quick Auth Button (if connected but not authenticated) */}
                {!isLoading && !isAuthenticated && (
                  <button
                    onClick={() => setShowQuickAuth(true)}
                    className="inline-flex items-center px-2 py-2 text-sm bg-yellow-100 text-yellow-700 hover:bg-yellow-200 rounded-lg transition-colors whitespace-nowrap"
                    title="Authenticate to access dashboards"
                  >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                    <span className="hidden sm:inline ml-1">Authenticate</span>
                  </button>
                )}
                
                {/* Sign Out Button (if authenticated - keeps wallet connected) */}
                {!isLoading && isAuthenticated && (
                  <button
                    onClick={handleSignOut}
                    className="inline-flex items-center px-2 py-2 text-sm bg-orange-100 text-orange-700 hover:bg-orange-200 rounded-lg transition-colors whitespace-nowrap"
                    title="Sign out (keep wallet connected)"
                  >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
                    </svg>
                    <span className="hidden sm:inline ml-1">Sign Out</span>
                  </button>
                )}
                
                {/* Disconnect Button */}
                <button
                  onClick={handleDisconnect}
                  className="inline-flex items-center px-2 py-2 text-sm bg-red-100 text-red-700 hover:bg-red-200 rounded-lg transition-colors whitespace-nowrap"
                  title="Disconnect wallet completely"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                  <span className="hidden sm:inline ml-1">Disconnect</span>
                </button>
              </div>
            )}
          </div>
        </div>

        {/* Navigation Links Row - Always visible */}
        <div className="border-t border-gray-100 py-3">
          <div className="flex items-center justify-center space-x-8 overflow-x-auto">
            <Link 
              to="/" 
              className="text-gray-700 hover:text-blue-600 font-medium transition-colors duration-200 text-sm whitespace-nowrap"
            >
              Home
            </Link>
            
            <Link 
              to="/how-it-works" 
              className="text-gray-700 hover:text-blue-600 font-medium transition-colors duration-200 text-sm whitespace-nowrap"
            >
              How It Works
            </Link>
            
            <Link 
              to="/donate" 
              className="text-gray-700 hover:text-blue-600 font-medium transition-colors duration-200 text-sm whitespace-nowrap"
            >
              Campaigns
            </Link>
            
            <Link 
              to="/track-funds" 
              className="text-gray-700 hover:text-blue-600 font-medium transition-colors duration-200 text-sm whitespace-nowrap"
            >
              Track Funds
            </Link>
            
            <Link 
              to="/public-transparency" 
              className="text-gray-700 hover:text-blue-600 font-medium transition-colors duration-200 text-sm whitespace-nowrap"
            >
              Public Ledger
            </Link>
            
            {/* Role-based Dashboard Links */}
            {!isLoading && isAuthenticated && user?.roles?.includes('admin') && (
              <Link 
                to="/admin" 
                className="text-purple-600 hover:text-purple-700 font-medium transition-colors duration-200 text-sm whitespace-nowrap"
              >
                Admin Panel
              </Link>
            )}
            {!isLoading && isAuthenticated && user?.roles?.includes('beneficiary') && (
              <Link 
                to="/beneficiary" 
                className="text-green-600 hover:text-green-700 font-medium transition-colors duration-200 text-sm whitespace-nowrap"
              >
                My Dashboard
              </Link>
            )}
            {!isLoading && isAuthenticated && user?.roles?.includes('vendor') && (
              <Link 
                to="/vendor" 
                className="text-orange-600 hover:text-orange-700 font-medium transition-colors duration-200 text-sm whitespace-nowrap"
              >
                Vendor Portal
              </Link>
            )}
            {!isLoading && isAuthenticated && !user?.roles?.includes('admin') && !user?.roles?.includes('beneficiary') && !user?.roles?.includes('vendor') && (
              <Link 
                to="/donor" 
                className="text-blue-600 hover:text-blue-700 font-medium transition-colors duration-200 text-sm whitespace-nowrap"
              >
                My Donations
              </Link>
            )}
          </div>
        </div>
      </nav>
      
      {/* Quick Auth Modal */}
      {showQuickAuth && (
        <QuickAuth
          onSuccess={() => {
            setShowQuickAuth(false);
            window.location.reload(); // Refresh to update dashboard access
          }}
          onCancel={() => setShowQuickAuth(false)}
        />
      )}
    </header>
  );
};

export default Header;