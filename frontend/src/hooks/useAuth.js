import { useState, useEffect } from 'react';

export const useAuth = () => {
  const [user, setUser] = useState(null);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);

  // Check for existing token on mount
  useEffect(() => {
    const token = localStorage.getItem('authToken');
    if (token) {
      // TODO: Validate token and get user info
      setIsAuthenticated(true);
    }
  }, []);

  const login = async (address, signature, message) => {
    setIsLoading(true);
    setError(null);

    try {
      // TODO: Implement actual authentication
      const response = await fetch('/api/auth/connect', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ address, signature, message }),
      });

      const data = await response.json();

      if (data.success) {
        localStorage.setItem('authToken', data.data.token);
        setUser(data.data.user);
        setIsAuthenticated(true);
      } else {
        setError(data.message || 'Authentication failed');
      }
    } catch (error) {
      setError('Network error occurred');
    } finally {
      setIsLoading(false);
    }
  };

  const logout = () => {
    localStorage.removeItem('authToken');
    setUser(null);
    setIsAuthenticated(false);
    setError(null);
  };

  return {
    user,
    isAuthenticated,
    isLoading,
    error,
    login,
    logout,
  };
};