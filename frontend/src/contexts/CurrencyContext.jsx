import React, { createContext, useContext, useState, useEffect } from 'react';
import currencyService from '../services/currency';

const CurrencyContext = createContext();

export const useCurrency = () => {
  const context = useContext(CurrencyContext);
  if (!context) {
    throw new Error('useCurrency must be used within a CurrencyProvider');
  }
  return context;
};

export const CurrencyProvider = ({ children }) => {
  const [primaryCurrency, setPrimaryCurrency] = useState('INR');
  const [showDualCurrency, setShowDualCurrency] = useState(true);
  const [exchangeRate, setExchangeRate] = useState(83.25);
  const [lastUpdated, setLastUpdated] = useState(null);
  const [isLoading, setIsLoading] = useState(true);

  // Initialize currency service
  useEffect(() => {
    const initializeCurrency = async () => {
      setIsLoading(true);
      await currencyService.initialize();
      
      // Update local state with current exchange rate
      const rateInfo = currencyService.getExchangeRateInfo();
      setExchangeRate(rateInfo.rate);
      setLastUpdated(rateInfo.lastUpdated);
      setIsLoading(false);
    };

    initializeCurrency();

    // Set up periodic updates to sync with currency service
    const syncInterval = setInterval(() => {
      const rateInfo = currencyService.getExchangeRateInfo();
      setExchangeRate(rateInfo.rate);
      setLastUpdated(rateInfo.lastUpdated);
    }, 60000); // Check every minute

    return () => {
      clearInterval(syncInterval);
      currencyService.stopPeriodicUpdates();
    };
  }, []);

  // Format currency based on current settings
  const formatCurrency = (amount, options = {}) => {
    const {
      isWei = false,
      showSecondary = showDualCurrency,
      compact = false
    } = options;

    if (primaryCurrency === 'INR') {
      if (isWei) {
        const inrFormatted = currencyService.weiToINR(amount, { compact });
        if (showSecondary) {
          const usdFormatted = currencyService.weiToUSD(amount);
          return `${inrFormatted} (${usdFormatted})`;
        }
        return inrFormatted;
      } else {
        // Amount is in USD, convert to INR
        const inrAmount = currencyService.usdToInr(amount);
        const inrFormatted = currencyService.formatINR(inrAmount, { compact });
        if (showSecondary) {
          const usdFormatted = currencyService.formatUSD(amount);
          return `${inrFormatted} (${usdFormatted})`;
        }
        return inrFormatted;
      }
    } else {
      // Primary currency is USD
      if (isWei) {
        const usdFormatted = currencyService.weiToUSD(amount);
        if (showSecondary) {
          const inrFormatted = currencyService.weiToINR(amount, { compact });
          return `${usdFormatted} (${inrFormatted})`;
        }
        return usdFormatted;
      } else {
        const usdFormatted = currencyService.formatUSD(amount);
        if (showSecondary) {
          const inrAmount = currencyService.usdToInr(amount);
          const inrFormatted = currencyService.formatINR(inrAmount, { compact });
          return `${usdFormatted} (${inrFormatted})`;
        }
        return usdFormatted;
      }
    }
  };

  // Toggle between INR and USD as primary currency
  const togglePrimaryCurrency = () => {
    setPrimaryCurrency(prev => prev === 'INR' ? 'USD' : 'INR');
  };

  // Toggle dual currency display
  const toggleDualCurrency = () => {
    setShowDualCurrency(prev => !prev);
  };

  // Get exchange rate display string
  const getExchangeRateDisplay = () => {
    return `1 USD = ₹${exchangeRate.toFixed(2)}`;
  };

  // Get last updated time display
  const getLastUpdatedDisplay = () => {
    if (!lastUpdated) return 'Never';
    
    const now = new Date();
    const diffMinutes = Math.floor((now - lastUpdated) / (1000 * 60));
    
    if (diffMinutes < 1) return 'Just now';
    if (diffMinutes < 60) return `${diffMinutes}m ago`;
    
    const diffHours = Math.floor(diffMinutes / 60);
    if (diffHours < 24) return `${diffHours}h ago`;
    
    const diffDays = Math.floor(diffHours / 24);
    return `${diffDays}d ago`;
  };

  const value = {
    // State
    primaryCurrency,
    showDualCurrency,
    exchangeRate,
    lastUpdated,
    isLoading,
    
    // Actions
    setPrimaryCurrency,
    setShowDualCurrency,
    togglePrimaryCurrency,
    toggleDualCurrency,
    
    // Utilities
    formatCurrency,
    getExchangeRateDisplay,
    getLastUpdatedDisplay,
    
    // Direct access to currency service methods
    currencyService
  };

  return (
    <CurrencyContext.Provider value={value}>
      {children}
    </CurrencyContext.Provider>
  );
};