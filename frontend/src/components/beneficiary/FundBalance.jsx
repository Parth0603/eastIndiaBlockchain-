import React, { useState, useEffect } from 'react';
import { useAuth } from '../../hooks/useAuth';
import LoadingSpinner from '../common/LoadingSpinner';

const FundBalance = () => {
  const [balance, setBalance] = useState(null);
  const [refreshing, setRefreshing] = useState(false);
  const { user } = useAuth();

  const fetchBalance = async () => {
    try {
      setRefreshing(true);
      
      // Try to fetch from backend
      try {
        const response = await fetch('http://localhost:3001/api/beneficiaries/balance', {
          headers: {
            'Authorization': `Bearer ${user?.token}`,
            'Content-Type': 'application/json',
          }
        });
        
        if (response.ok) {
          const balanceData = await response.json();
          setBalance(balanceData);
        } else {
          throw new Error('Backend not available');
        }
      } catch (backendError) {
        // No balance data available
        setBalance({
          allocated: 0,
          spent: 0,
          spendingByCategory: {}
        });
      }
    } catch (error) {
      console.error('Error fetching balance:', error);
      // Set empty balance on error
      setBalance({
        allocated: 0,
        spent: 0,
        spendingByCategory: {}
      });
    } finally {
      setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchBalance();
  }, []);

  if (!balance) {
    return (
      <div className="bg-white rounded-lg shadow p-6">
        <h2 className="text-xl font-semibold mb-4">Fund Balance</h2>
        <div className="flex justify-center py-8">
          <LoadingSpinner />
        </div>
      </div>
    );
  }

  const allocated = balance?.allocated || 0;
  const spent = balance?.spent || 0;
  const remaining = allocated - spent;
  const spentPercentage = allocated > 0 ? (spent / allocated) * 100 : 0;

  return (
    <div className="bg-white rounded-lg shadow p-6">
      <div className="flex justify-between items-center mb-4">
        <h2 className="text-xl font-semibold">Fund Balance</h2>
        <button
          onClick={fetchBalance}
          disabled={refreshing}
          className="text-blue-600 hover:text-blue-800 text-sm font-medium disabled:opacity-50"
        >
          {refreshing ? 'Refreshing...' : 'Refresh'}
        </button>
      </div>

      {/* Main Balance Display */}
      <div className="text-center py-6 mb-6">
        <div className="text-4xl font-bold text-green-600 mb-2">
          ${remaining.toFixed(2)}
        </div>
        <p className="text-gray-600">Available Balance</p>
      </div>

      {/* Balance Breakdown */}
      <div className="space-y-4">
        <div className="flex justify-between items-center">
          <span className="text-gray-600">Total Allocated:</span>
          <span className="font-semibold text-lg">${allocated.toFixed(2)}</span>
        </div>
        
        <div className="flex justify-between items-center">
          <span className="text-gray-600">Total Spent:</span>
          <span className="font-semibold text-lg text-red-600">${spent.toFixed(2)}</span>
        </div>
        
        <div className="flex justify-between items-center pt-2 border-t">
          <span className="text-gray-800 font-medium">Remaining:</span>
          <span className="font-bold text-xl text-green-600">${remaining.toFixed(2)}</span>
        </div>

        {/* Progress Bar */}
        {allocated > 0 && (
          <div className="mt-4">
            <div className="flex justify-between text-sm text-gray-600 mb-1">
              <span>Spending Progress</span>
              <span>{spentPercentage.toFixed(1)}%</span>
            </div>
            <div className="w-full bg-gray-200 rounded-full h-2">
              <div
                className="bg-blue-600 h-2 rounded-full transition-all duration-300"
                style={{ width: `${Math.min(spentPercentage, 100)}%` }}
              ></div>
            </div>
          </div>
        )}

        {/* Spending by Category */}
        {balance?.spendingByCategory && Object.keys(balance.spendingByCategory).length > 0 && (
          <div className="mt-6">
            <h3 className="text-sm font-medium text-gray-700 mb-3">Spending by Category</h3>
            <div className="space-y-2">
              {Object.entries(balance.spendingByCategory).map(([category, amount]) => (
                <div key={category} className="flex justify-between text-sm">
                  <span className="capitalize text-gray-600">{category}:</span>
                  <span className="font-medium">${amount.toFixed(2)}</span>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Status Messages */}
      {remaining <= 0 && allocated > 0 && (
        <div className="mt-4 p-3 bg-yellow-50 border border-yellow-200 rounded-lg">
          <p className="text-yellow-800 text-sm">
            ⚠️ You have spent your entire allocation. Contact support if you need additional funds.
          </p>
        </div>
      )}

      {allocated === 0 && (
        <div className="mt-4 p-3 bg-blue-50 border border-blue-200 rounded-lg">
          <p className="text-blue-800 text-sm">
            ℹ️ No funds allocated yet. Your application may still be under review.
          </p>
        </div>
      )}
    </div>
  );
};

export default FundBalance;