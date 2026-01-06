import { useState, useCallback } from 'react';
import { useWallet } from './useWallet';

export const useTransactionStatus = () => {
  const { web3 } = useWallet();
  const [transactions, setTransactions] = useState({});

  // Add a new transaction to track
  const addTransaction = useCallback((txHash, description) => {
    setTransactions(prev => ({
      ...prev,
      [txHash]: {
        hash: txHash,
        description,
        status: 'pending',
        timestamp: new Date(),
        confirmations: 0,
      },
    }));
  }, []);

  // Update transaction status
  const updateTransaction = useCallback((txHash, updates) => {
    setTransactions(prev => ({
      ...prev,
      [txHash]: {
        ...prev[txHash],
        ...updates,
      },
    }));
  }, []);

  // Track transaction until confirmed
  const trackTransaction = useCallback(async (txHash, description, requiredConfirmations = 1) => {
    if (!web3) return;

    addTransaction(txHash, description);

    try {
      // Wait for transaction receipt
      const receipt = await web3.eth.getTransactionReceipt(txHash);
      
      if (receipt) {
        const currentBlock = await web3.eth.getBlockNumber();
        const confirmations = currentBlock - receipt.blockNumber;

        updateTransaction(txHash, {
          status: receipt.status ? 'confirmed' : 'failed',
          blockNumber: receipt.blockNumber,
          gasUsed: receipt.gasUsed,
          confirmations,
          receipt,
        });

        // Continue tracking for additional confirmations if needed
        if (receipt.status && confirmations < requiredConfirmations) {
          const interval = setInterval(async () => {
            try {
              const currentBlock = await web3.eth.getBlockNumber();
              const newConfirmations = currentBlock - receipt.blockNumber;

              updateTransaction(txHash, {
                confirmations: newConfirmations,
              });

              if (newConfirmations >= requiredConfirmations) {
                clearInterval(interval);
                updateTransaction(txHash, {
                  status: 'finalized',
                });
              }
            } catch (error) {
              console.error('Error tracking confirmations:', error);
              clearInterval(interval);
            }
          }, 15000); // Check every 15 seconds

          // Cleanup after 10 minutes
          setTimeout(() => {
            clearInterval(interval);
          }, 600000);
        }
      } else {
        // Transaction not yet mined, wait and retry
        setTimeout(() => {
          trackTransaction(txHash, description, requiredConfirmations);
        }, 5000);
      }
    } catch (error) {
      console.error('Error tracking transaction:', error);
      updateTransaction(txHash, {
        status: 'error',
        error: error.message,
      });
    }
  }, [web3, addTransaction, updateTransaction]);

  // Get transaction by hash
  const getTransaction = useCallback((txHash) => {
    return transactions[txHash];
  }, [transactions]);

  // Get all transactions
  const getAllTransactions = useCallback(() => {
    return Object.values(transactions).sort((a, b) => b.timestamp - a.timestamp);
  }, [transactions]);

  // Get transactions by status
  const getTransactionsByStatus = useCallback((status) => {
    return Object.values(transactions)
      .filter(tx => tx.status === status)
      .sort((a, b) => b.timestamp - a.timestamp);
  }, [transactions]);

  // Remove old transactions
  const clearOldTransactions = useCallback((olderThanHours = 24) => {
    const cutoff = new Date(Date.now() - olderThanHours * 60 * 60 * 1000);
    
    setTransactions(prev => {
      const filtered = {};
      Object.entries(prev).forEach(([hash, tx]) => {
        if (tx.timestamp > cutoff) {
          filtered[hash] = tx;
        }
      });
      return filtered;
    });
  }, []);

  // Remove specific transaction
  const removeTransaction = useCallback((txHash) => {
    setTransactions(prev => {
      const { [txHash]: removed, ...rest } = prev;
      return rest;
    });
  }, []);

  // Get transaction counts by status
  const getTransactionCounts = useCallback(() => {
    const counts = {
      pending: 0,
      confirmed: 0,
      failed: 0,
      finalized: 0,
      error: 0,
    };

    Object.values(transactions).forEach(tx => {
      counts[tx.status] = (counts[tx.status] || 0) + 1;
    });

    return counts;
  }, [transactions]);

  return {
    transactions: getAllTransactions(),
    trackTransaction,
    getTransaction,
    getAllTransactions,
    getTransactionsByStatus,
    clearOldTransactions,
    removeTransaction,
    getTransactionCounts,
    
    // Convenience getters
    pendingTransactions: getTransactionsByStatus('pending'),
    confirmedTransactions: getTransactionsByStatus('confirmed'),
    failedTransactions: getTransactionsByStatus('failed'),
    
    // Stats
    totalTransactions: Object.keys(transactions).length,
    transactionCounts: getTransactionCounts(),
  };
};