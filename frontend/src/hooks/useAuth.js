import { useState, useEffect } from 'react';

export const useAuth = () => {
  const [user, setUser] = useState(null);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [isLoading, setIsLoading] = useState(true); // Start with loading true
  const [error, setError] = useState(null);

  // Check for existing session authentication on mount
  useEffect(() => {
    const savedAuth = sessionStorage.getItem('walletAuth');
    if (savedAuth) {
      try {
        const authData = JSON.parse(savedAuth);
        setUser(authData.user);
        setIsAuthenticated(true);
        console.log('Restored authentication from session:', {
          roles: authData.user?.roles,
          address: authData.user?.address
        });
      } catch (error) {
        console.error('Failed to restore auth from session:', error);
        sessionStorage.removeItem('walletAuth');
      }
    }
    setIsLoading(false); // Authentication check complete
  }, []);

  const signMessage = async (web3, account) => {
    const message = `Welcome to Disaster Relief System!\n\nPlease sign this message to authenticate your wallet.\n\nAddress: ${account}\nTimestamp: ${Date.now()}`;

    try {
      console.log('Requesting message signature from user...');
      const signature = await web3.eth.personal.sign(message, account, '');
      console.log('Message signed successfully');
      return { message, signature };
    } catch (error) {
      console.error('Failed to sign message:', error);
      if (error.code === 4001) {
        throw new Error('Signature rejected by user');
      }
      throw new Error('Failed to sign authentication message');
    }
  };

  const authenticateWithWallet = async (web3, account, selectedRole = 'donor', profile = {}) => {
    try {
      setIsLoading(true);
      setError(null);

      // Sign authentication message
      const { message, signature } = await signMessage(web3, account);

      // Create user data - Store in sessionStorage for better UX
      const userData = {
        address: account,
        roles: [selectedRole],
        profile: profile,
        authenticated: true,
        timestamp: Date.now()
      };

      // Try to authenticate with backend
      try {
        const response = await fetch('http://localhost:3001/api/auth/connect', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            address: account,
            signature,
            message,
            role: selectedRole,
            profile: profile
          })
        });

        if (response.ok) {
          const result = await response.json();
          if (result.success && result.data) {
            // Use the role and token from backend response
            userData.roles = [result.data.user.role];
            userData.token = result.data.token;
            userData.profile = result.data.user.profile || profile;
            userData.userId = result.data.user.id;
            
            console.log('Backend authentication successful:', {
              role: result.data.user.role,
              hasToken: !!result.data.token
            });
          }
        } else {
          const errorData = await response.json();
          console.warn('Backend authentication failed:', errorData.message);
        }
      } catch (backendError) {
        console.warn('Backend authentication failed, using local auth:', backendError);
        // Continue with local authentication
      }

      // Store authentication data in sessionStorage (cleared when browser closes)
      sessionStorage.setItem('walletAuth', JSON.stringify({ user: userData }));
      setUser(userData);
      setIsAuthenticated(true);
      
      return userData;
    } catch (error) {
      setError(error.message);
      throw error;
    } finally {
      setIsLoading(false);
    }
  };

  const logout = () => {
    // Clear session authentication
    sessionStorage.removeItem('walletAuth');
    setUser(null);
    setIsAuthenticated(false);
    console.log('User logged out - session cleared');
  };

  return {
    user,
    isAuthenticated,
    isLoading,
    error,
    logout,
    authenticateWithWallet
  };
};