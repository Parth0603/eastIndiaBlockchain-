import { useState, useEffect, useCallback } from 'react';
import { useWallet } from './useWallet';

// Contract ABIs (simplified for key functions)
const RELIEF_TOKEN_ABI = [
  {
    "inputs": [{"name": "to", "type": "address"}, {"name": "amount", "type": "uint256"}, {"name": "purpose", "type": "string"}],
    "name": "mint",
    "outputs": [],
    "stateMutability": "nonpayable",
    "type": "function"
  },
  {
    "inputs": [{"name": "account", "type": "address"}],
    "name": "balanceOf",
    "outputs": [{"name": "", "type": "uint256"}],
    "stateMutability": "view",
    "type": "function"
  },
  {
    "inputs": [],
    "name": "totalSupply",
    "outputs": [{"name": "", "type": "uint256"}],
    "stateMutability": "view",
    "type": "function"
  }
];

const RELIEF_DISTRIBUTION_ABI = [
  {
    "inputs": [{"name": "amount", "type": "uint256"}],
    "name": "donate",
    "outputs": [],
    "stateMutability": "payable",
    "type": "function"
  },
  {
    "inputs": [{"name": "name", "type": "string"}, {"name": "location", "type": "string"}, {"name": "requestedAmount", "type": "uint256"}],
    "name": "registerBeneficiary",
    "outputs": [],
    "stateMutability": "nonpayable",
    "type": "function"
  },
  {
    "inputs": [],
    "name": "getSystemStats",
    "outputs": [{"name": "totalDonations", "type": "uint256"}, {"name": "totalBeneficiaries", "type": "uint256"}, {"name": "totalVendors", "type": "uint256"}],
    "stateMutability": "view",
    "type": "function"
  }
];

const ACCESS_CONTROL_ABI = [
  {
    "inputs": [{"name": "role", "type": "bytes32"}, {"name": "account", "type": "address"}],
    "name": "hasRole",
    "outputs": [{"name": "", "type": "bool"}],
    "stateMutability": "view",
    "type": "function"
  }
];

export const useContract = () => {
  const { web3, account, isConnected } = useWallet();
  const [contracts, setContracts] = useState({});
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);
  const [transactionStatus, setTransactionStatus] = useState(null);

  // Contract addresses from environment
  const contractAddresses = {
    reliefToken: import.meta.env.VITE_RELIEF_TOKEN_ADDRESS,
    reliefDistribution: import.meta.env.VITE_RELIEF_DISTRIBUTION_ADDRESS,
    accessControl: import.meta.env.VITE_ACCESS_CONTROL_ADDRESS,
  };

  // Initialize contracts when web3 is available
  useEffect(() => {
    if (web3 && isConnected) {
      try {
        const reliefToken = new web3.eth.Contract(RELIEF_TOKEN_ABI, contractAddresses.reliefToken);
        const reliefDistribution = new web3.eth.Contract(RELIEF_DISTRIBUTION_ABI, contractAddresses.reliefDistribution);
        const accessControl = new web3.eth.Contract(ACCESS_CONTROL_ABI, contractAddresses.accessControl);

        setContracts({
          reliefToken,
          reliefDistribution,
          accessControl,
        });
        setError(null);
      } catch (err) {
        console.error('Error initializing contracts:', err);
        setError('Failed to initialize smart contracts');
      }
    } else {
      setContracts({});
    }
  }, [web3, isConnected, contractAddresses.reliefToken, contractAddresses.reliefDistribution, contractAddresses.accessControl]);

  // Generic contract call function
  const callContract = useCallback(async (contractName, methodName, params = [], options = {}) => {
    if (!contracts[contractName] || !account) {
      throw new Error(`Contract ${contractName} not available or wallet not connected`);
    }

    setIsLoading(true);
    setError(null);
    setTransactionStatus('pending');

    try {
      const contract = contracts[contractName];
      const method = contract.methods[methodName](...params);

      let result;
      if (options.send) {
        // Send transaction
        const gasEstimate = await method.estimateGas({ from: account, ...options });
        result = await method.send({
          from: account,
          gas: Math.floor(gasEstimate * 1.2), // Add 20% buffer
          ...options,
        });
        setTransactionStatus('confirmed');
      } else {
        // Call (read-only)
        result = await method.call({ from: account });
        setTransactionStatus('completed');
      }

      setIsLoading(false);
      return result;
    } catch (err) {
      console.error(`Error calling ${contractName}.${methodName}:`, err);
      setError(err.message || 'Transaction failed');
      setTransactionStatus('failed');
      setIsLoading(false);
      throw err;
    }
  }, [contracts, account]);

  // Specific contract methods
  const donateETH = useCallback(async (amount) => {
    return callContract('reliefDistribution', 'donate', [web3.utils.toWei(amount, 'ether')], {
      send: true,
      value: web3.utils.toWei(amount, 'ether'),
    });
  }, [callContract, web3]);

  const getTokenBalance = useCallback(async (address = account) => {
    if (!address) return '0';
    const balance = await callContract('reliefToken', 'balanceOf', [address]);
    return web3.utils.fromWei(balance, 'ether');
  }, [callContract, account, web3]);

  const getTotalSupply = useCallback(async () => {
    const supply = await callContract('reliefToken', 'totalSupply', []);
    return web3.utils.fromWei(supply, 'ether');
  }, [callContract, web3]);

  const getSystemStats = useCallback(async () => {
    const stats = await callContract('reliefDistribution', 'getSystemStats', []);
    return {
      totalDonations: web3.utils.fromWei(stats.totalDonations, 'ether'),
      totalBeneficiaries: stats.totalBeneficiaries,
      totalVendors: stats.totalVendors,
    };
  }, [callContract, web3]);

  const registerBeneficiary = useCallback(async (name, location, requestedAmount) => {
    return callContract('reliefDistribution', 'registerBeneficiary', [
      name,
      location,
      web3.utils.toWei(requestedAmount, 'ether'),
    ], { send: true });
  }, [callContract, web3]);

  const hasRole = useCallback(async (role, address = account) => {
    if (!address) return false;
    return callContract('accessControl', 'hasRole', [role, address]);
  }, [callContract, account]);

  // Event listening
  const subscribeToEvents = useCallback((contractName, eventName, callback) => {
    if (!contracts[contractName]) return null;

    const contract = contracts[contractName];
    const subscription = contract.events[eventName]()
      .on('data', callback)
      .on('error', (error) => {
        console.error(`Error in ${contractName}.${eventName} event:`, error);
        setError(`Event subscription error: ${error.message}`);
      });

    return subscription;
  }, [contracts]);

  // Cleanup transaction status
  const clearTransactionStatus = useCallback(() => {
    setTransactionStatus(null);
    setError(null);
  }, []);

  return {
    // Contract instances
    contracts,
    
    // State
    isLoading,
    error,
    transactionStatus,
    
    // Generic methods
    callContract,
    subscribeToEvents,
    clearTransactionStatus,
    
    // Specific methods
    donateETH,
    getTokenBalance,
    getTotalSupply,
    getSystemStats,
    registerBeneficiary,
    hasRole,
    
    // Contract addresses
    contractAddresses,
  };
};