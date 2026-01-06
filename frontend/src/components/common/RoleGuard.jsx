import React from 'react';
import { useAuth } from '../../hooks/useAuth';
import { useWallet } from '../../hooks/useWallet';
import { DetailedWalletConnect } from './WalletConnect';

const RoleGuard = ({ 
  children, 
  requiredRole = null, 
  requireWallet = false, 
  requireAuth = false,
  fallback = null 
}) => {
  const { isAuthenticated, user } = useAuth();
  const { isConnected } = useWallet();

  // Check wallet connection requirement
  if (requireWallet && !isConnected) {
    return fallback || (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="max-w-md w-full bg-white rounded-lg shadow-lg p-8 text-center">
          <div className="mb-6">
            <div className="mx-auto w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center mb-4">
              <svg className="w-8 h-8 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
              </svg>
            </div>
            <h2 className="text-2xl font-bold text-gray-900 mb-2">Connect Your Wallet</h2>
            <p className="text-gray-600">
              Please connect your wallet to access the Disaster Relief System
            </p>
          </div>
          <DetailedWalletConnect />
        </div>
      </div>
    );
  }

  // Check authentication requirement
  if (requireAuth && !isAuthenticated) {
    return fallback || (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="max-w-md w-full bg-white rounded-lg shadow-lg p-8 text-center">
          <div className="mb-6">
            <div className="mx-auto w-16 h-16 bg-yellow-100 rounded-full flex items-center justify-center mb-4">
              <svg className="w-8 h-8 text-yellow-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
            <h2 className="text-2xl font-bold text-gray-900 mb-2">Authenticate to Continue</h2>
            <p className="text-gray-600 mb-4">
              Please sign a message to verify your wallet ownership
            </p>
          </div>
          <DetailedWalletConnect />
        </div>
      </div>
    );
  }

  // Check role requirement
  if (requiredRole && (!user || !user.roles || !user.roles.includes(requiredRole))) {
    return fallback || (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="max-w-md w-full bg-white rounded-lg shadow-lg p-8 text-center">
          <div className="mb-6">
            <div className="mx-auto w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mb-4">
              <svg className="w-8 h-8 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.732 16.5c-.77.833.192 2.5 1.732 2.5z" />
              </svg>
            </div>
            <h2 className="text-2xl font-bold text-gray-900 mb-2">Access Denied</h2>
            <p className="text-gray-600 mb-4">
              You don't have the required permissions to access this page.
            </p>
            <p className="text-sm text-gray-500 mt-2">
              Required role: {requiredRole}
            </p>
            <p className="text-sm text-gray-500">
              Your roles: {user?.roles?.join(', ') || 'None'}
            </p>
          </div>
        </div>
      </div>
    );
  }

  // All checks passed, render children
  return children;
};

// Convenience components for specific roles
export const AdminGuard = ({ children, fallback }) => (
  <RoleGuard 
    requiredRole="admin" 
    requireAuth={true} 
    requireWallet={true}
    fallback={fallback}
  >
    {children}
  </RoleGuard>
);

export const VerifierGuard = ({ children, fallback }) => (
  <RoleGuard 
    requiredRole="verifier" 
    requireAuth={true} 
    requireWallet={true}
    fallback={fallback}
  >
    {children}
  </RoleGuard>
);

export const BeneficiaryGuard = ({ children, fallback }) => (
  <RoleGuard 
    requireAuth={true} 
    requireWallet={true}
    fallback={fallback}
  >
    {children}
  </RoleGuard>
);

export const VendorGuard = ({ children, fallback }) => (
  <RoleGuard 
    requiredRole="vendor" 
    requireAuth={true} 
    requireWallet={true}
    fallback={fallback}
  >
    {children}
  </RoleGuard>
);

export const WalletGuard = ({ children, fallback }) => (
  <RoleGuard 
    requireWallet={true}
    fallback={fallback}
  >
    {children}
  </RoleGuard>
);

export const AuthGuard = ({ children, fallback }) => (
  <RoleGuard 
    requireAuth={true}
    requireWallet={true}
    fallback={fallback}
  >
    {children}
  </RoleGuard>
);

export default RoleGuard;