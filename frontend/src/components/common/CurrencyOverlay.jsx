import React, { useState } from 'react';
import { useCurrency } from '../../contexts/CurrencyContext';

const CurrencyOverlay = () => {
  const {
    primaryCurrency,
    showDualCurrency,
    exchangeRate,
    isLoading,
    togglePrimaryCurrency,
    toggleDualCurrency,
    getExchangeRateDisplay,
    getLastUpdatedDisplay
  } = useCurrency();

  const [isOpen, setIsOpen] = useState(false);

  return (
    <div className="relative">
      {/* Currency Toggle Button */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center space-x-2 px-3 py-2 text-sm bg-white/10 hover:bg-white/20 rounded-lg transition-colors duration-200 text-white"
        title="Currency Settings"
      >
        <span className="font-medium">
          {primaryCurrency === 'INR' ? '₹' : '$'}
        </span>
        <span className="text-xs opacity-75">
          {getExchangeRateDisplay()}
        </span>
        {isLoading && (
          <div className="w-3 h-3 border border-white/30 border-t-white rounded-full animate-spin"></div>
        )}
        <svg 
          className={`w-4 h-4 transition-transform duration-200 ${isOpen ? 'rotate-180' : ''}`} 
          fill="none" 
          stroke="currentColor" 
          viewBox="0 0 24 24"
        >
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
        </svg>
      </button>

      {/* Dropdown Panel */}
      {isOpen && (
        <>
          {/* Backdrop */}
          <div 
            className="fixed inset-0 z-40" 
            onClick={() => setIsOpen(false)}
          ></div>
          
          {/* Dropdown Content */}
          <div className="absolute right-0 top-full mt-2 w-80 bg-white rounded-xl shadow-2xl border border-gray-200 z-50 overflow-hidden">
            {/* Header */}
            <div className="bg-blue-500 px-4 py-3">
              <h3 className="text-white font-semibold flex items-center">
                <span className="text-lg mr-2">💱</span>
                Currency Settings
              </h3>
            </div>

            <div className="p-4 space-y-4">
              {/* Exchange Rate Info */}
              <div className="bg-gray-50 rounded-lg p-3">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm font-medium text-gray-700">Current Rate</span>
                  <span className="text-xs text-gray-500">
                    Updated {getLastUpdatedDisplay()}
                  </span>
                </div>
                <div className="text-lg font-bold text-gray-900">
                  {getExchangeRateDisplay()}
                </div>
                <div className="text-xs text-gray-500 mt-1">
                  Live exchange rate from exchangerate-api.com
                </div>
              </div>

              {/* Primary Currency Selection */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Primary Currency
                </label>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    onClick={() => {
                      if (primaryCurrency !== 'INR') togglePrimaryCurrency();
                    }}
                    className={`p-3 rounded-lg border-2 transition-all duration-200 ${
                      primaryCurrency === 'INR'
                        ? 'border-blue-500 bg-blue-50 text-blue-700'
                        : 'border-gray-200 hover:border-gray-300 text-gray-700'
                    }`}
                  >
                    <div className="text-lg font-bold">₹ INR</div>
                    <div className="text-xs">Indian Rupee</div>
                  </button>
                  <button
                    onClick={() => {
                      if (primaryCurrency !== 'USD') togglePrimaryCurrency();
                    }}
                    className={`p-3 rounded-lg border-2 transition-all duration-200 ${
                      primaryCurrency === 'USD'
                        ? 'border-blue-500 bg-blue-50 text-blue-700'
                        : 'border-gray-200 hover:border-gray-300 text-gray-700'
                    }`}
                  >
                    <div className="text-lg font-bold">$ USD</div>
                    <div className="text-xs">US Dollar</div>
                  </button>
                </div>
              </div>

              {/* Dual Currency Toggle */}
              <div className="flex items-center justify-between">
                <div>
                  <div className="text-sm font-medium text-gray-700">
                    Show Both Currencies
                  </div>
                  <div className="text-xs text-gray-500">
                    Display secondary currency in parentheses
                  </div>
                </div>
                <button
                  onClick={toggleDualCurrency}
                  className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors duration-200 ${
                    showDualCurrency ? 'bg-blue-500' : 'bg-gray-300'
                  }`}
                >
                  <span
                    className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform duration-200 ${
                      showDualCurrency ? 'translate-x-6' : 'translate-x-1'
                    }`}
                  />
                </button>
              </div>

              {/* Example Display */}
              <div className="bg-blue-50 rounded-lg p-3">
                <div className="text-sm font-medium text-blue-700 mb-1">
                  Example Display:
                </div>
                <div className="text-lg font-bold text-blue-900">
                  {primaryCurrency === 'INR' ? (
                    showDualCurrency ? '₹10,000 ($120)' : '₹10,000'
                  ) : (
                    showDualCurrency ? '$120 (₹10,000)' : '$120'
                  )}
                </div>
              </div>

              {/* Quick Actions */}
              <div className="flex space-x-2 pt-2 border-t border-gray-200">
                <button
                  onClick={() => {
                    togglePrimaryCurrency();
                    setIsOpen(false);
                  }}
                  className="flex-1 px-3 py-2 text-sm bg-gray-100 hover:bg-gray-200 rounded-lg transition-colors duration-200"
                >
                  Switch to {primaryCurrency === 'INR' ? 'USD' : 'INR'}
                </button>
                <button
                  onClick={() => setIsOpen(false)}
                  className="px-4 py-2 text-sm bg-blue-500 hover:bg-blue-600 text-white rounded-lg transition-colors duration-200"
                >
                  Done
                </button>
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  );
};

export default CurrencyOverlay;