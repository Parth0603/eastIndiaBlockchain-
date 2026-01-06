import { useState, useEffect } from 'react';
import Web3 from 'web3';

export const useWallet = () => {
  const [isConnected, setIsConnected] = useState(false);
  const [account, setAccount] = useState(null);
  const [web3, setWeb3] = useState(null);
  const [balance, setBalance] = useState('0');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);
  const [network, setNetwork] = useState(null);

  // Check if MetaMask is available
  const isMetaMaskAvailable = () => {
    return typeof window !== 'undefined' && typeof window.ethereum !== 'undefined';
  };

  // Connect to MetaMask - ALWAYS shows permission dialog, then persists for session
  const connectWallet = async () => {
    if (!isMetaMaskAvailable()) {
      setError('MetaMask is not installed. Please install MetaMask to continue.');
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      console.log('Requesting wallet connection with user permission...');
      
      // FORCE MetaMask permission dialog to show
      // Use wallet_requestPermissions to ensure the dialog appears
      try {
        await window.ethereum.request({
          method: 'wallet_requestPermissions',
          params: [{ eth_accounts: {} }]
        });
        console.log('Permission granted by user');
      } catch (permError) {
        if (permError.code === 4001) {
          throw new Error('User rejected the connection request');
        }
        // If wallet_requestPermissions is not supported, continue with eth_requestAccounts
        console.log('wallet_requestPermissions not supported, using eth_requestAccounts');
      }

      // Now get the accounts
      const accounts = await window.ethereum.request({
        method: 'eth_requestAccounts',
      });

      if (accounts && accounts.length > 0) {
        const web3Instance = new Web3(window.ethereum);
        
        setWeb3(web3Instance);
        setAccount(accounts[0]);
        setIsConnected(true);

        // Store connection state for session persistence (not localStorage for security)
        sessionStorage.setItem('walletConnected', 'true');
        sessionStorage.setItem('walletAccount', accounts[0]);

        // Get balance
        const balanceWei = await web3Instance.eth.getBalance(accounts[0]);
        const balanceEth = web3Instance.utils.fromWei(balanceWei, 'ether');
        setBalance(balanceEth);

        // Get network info
        const chainId = await web3Instance.eth.getChainId();
        setNetwork({
          chainId: Number(chainId),
          name: getNetworkName(Number(chainId))
        });

        console.log('Successfully connected to MetaMask:', accounts[0]);
        return accounts[0];
      } else {
        throw new Error('No accounts returned from MetaMask');
      }
    } catch (error) {
      console.error('Error connecting to MetaMask:', error);
      if (error.code === 4001) {
        setError('Connection rejected. Please approve the connection in MetaMask.');
      } else if (error.code === -32002) {
        setError('Connection request pending. Please check MetaMask.');
      } else if (error.message.includes('User rejected')) {
        setError('Connection rejected. Please approve the connection in MetaMask.');
      } else {
        setError('Failed to connect to MetaMask. Please try again.');
      }
      throw error;
    } finally {
      setIsLoading(false);
    }
  };

  // Disconnect wallet - clear session data
  const disconnectWallet = () => {
    // Clear all wallet state
    setIsConnected(false);
    setAccount(null);
    setWeb3(null);
    setBalance('0');
    setNetwork(null);
    setError(null);
    
    // Clear session storage
    sessionStorage.removeItem('walletConnected');
    sessionStorage.removeItem('walletAccount');
    
    console.log('Wallet disconnected from app');
  };

  // Get network name from chain ID
  const getNetworkName = (chainId) => {
    const networks = {
      1: 'Ethereum Mainnet',
      3: 'Ropsten Testnet',
      4: 'Rinkeby Testnet',
      5: 'Goerli Testnet',
      11155111: 'Sepolia Testnet',
      31337: 'Localhost',
      1337: 'Localhost'
    };
    return networks[chainId] || `Chain ${chainId}`;
  };

  // Check for existing session connection on mount
  useEffect(() => {
    const checkExistingConnection = async () => {
      if (!isMetaMaskAvailable()) return;

      const wasConnected = sessionStorage.getItem('walletConnected');
      const sessionAccount = sessionStorage.getItem('walletAccount');

      if (wasConnected && sessionAccount) {
        try {
          // Check if MetaMask still has this account connected
          const accounts = await window.ethereum.request({
            method: 'eth_accounts',
          });

          if (accounts && accounts.includes(sessionAccount)) {
            // Restore connection without showing permission dialog
            const web3Instance = new Web3(window.ethereum);
            
            setWeb3(web3Instance);
            setAccount(sessionAccount);
            setIsConnected(true);

            // Get balance
            const balanceWei = await web3Instance.eth.getBalance(sessionAccount);
            const balanceEth = web3Instance.utils.fromWei(balanceWei, 'ether');
            setBalance(balanceEth);

            // Get network info
            const chainId = await web3Instance.eth.getChainId();
            setNetwork({
              chainId: Number(chainId),
              name: getNetworkName(Number(chainId))
            });

            console.log('Restored wallet connection from session:', sessionAccount);
          } else {
            // Account no longer available, clear session
            sessionStorage.removeItem('walletConnected');
            sessionStorage.removeItem('walletAccount');
          }
        } catch (error) {
          console.error('Error restoring wallet connection:', error);
          // Clear invalid session data
          sessionStorage.removeItem('walletConnected');
          sessionStorage.removeItem('walletAccount');
        }
      }
    };

    checkExistingConnection();
  }, []);

  // Listen for account changes
  useEffect(() => {
    if (isMetaMaskAvailable() && isConnected) {
      const handleAccountsChanged = (accounts) => {
        if (accounts.length === 0) {
          // User disconnected from MetaMask
          disconnectWallet();
        } else if (accounts[0] !== account) {
          // User switched accounts
          setAccount(accounts[0]);
          sessionStorage.setItem('walletAccount', accounts[0]);
          
          // Update balance for new account
          if (web3) {
            web3.eth.getBalance(accounts[0]).then((balanceWei) => {
              const balanceEth = web3.utils.fromWei(balanceWei, 'ether');
              setBalance(balanceEth);
            });
          }
        }
      };

      const handleChainChanged = (chainId) => {
        const numericChainId = parseInt(chainId, 16);
        setNetwork({
          chainId: numericChainId,
          name: getNetworkName(numericChainId)
        });
        console.log('Chain changed to:', numericChainId);
      };

      const handleDisconnect = () => {
        console.log('MetaMask disconnected');
        disconnectWallet();
      };

      window.ethereum.on('accountsChanged', handleAccountsChanged);
      window.ethereum.on('chainChanged', handleChainChanged);
      window.ethereum.on('disconnect', handleDisconnect);

      return () => {
        window.ethereum.removeListener('accountsChanged', handleAccountsChanged);
        window.ethereum.removeListener('chainChanged', handleChainChanged);
        window.ethereum.removeListener('disconnect', handleDisconnect);
      };
    }
  }, [web3, isConnected, account]);

  // Get current network info
  const getNetworkInfo = async () => {
    if (web3) {
      try {
        const chainId = await web3.eth.getChainId();
        return {
          chainId: Number(chainId),
          name: getNetworkName(Number(chainId)),
          isLocalhost: Number(chainId) === 31337 || Number(chainId) === 1337,
          isSepolia: Number(chainId) === 11155111,
        };
      } catch (error) {
        console.error('Error getting network info:', error);
        return null;
      }
    }
    return null;
  };

  // Switch to Sepolia network
  const switchToSepolia = async () => {
    if (isMetaMaskAvailable()) {
      try {
        await window.ethereum.request({
          method: 'wallet_switchEthereumChain',
          params: [{ chainId: '0xaa36a7' }], // Sepolia chain ID
        });
      } catch (switchError) {
        // This error code indicates that the chain has not been added to MetaMask
        if (switchError.code === 4902) {
          try {
            await window.ethereum.request({
              method: 'wallet_addEthereumChain',
              params: [
                {
                  chainId: '0xaa36a7',
                  chainName: 'Sepolia Test Network',
                  nativeCurrency: {
                    name: 'ETH',
                    symbol: 'ETH',
                    decimals: 18,
                  },
                  rpcUrls: ['https://sepolia.infura.io/v3/be40a16531a4446dad8d3ce44fcc94a7'],
                  blockExplorerUrls: ['https://sepolia.etherscan.io/'],
                },
              ],
            });
          } catch (addError) {
            console.error('Error adding Sepolia network:', addError);
            setError('Failed to add Sepolia network to MetaMask');
          }
        } else {
          console.error('Error switching to Sepolia:', switchError);
          setError('Failed to switch to Sepolia network');
        }
      }
    }
  };

  // Switch to localhost network
  const switchToLocalhost = async () => {
    if (isMetaMaskAvailable()) {
      try {
        await window.ethereum.request({
          method: 'wallet_switchEthereumChain',
          params: [{ chainId: '0x7a69' }], // 31337 in hex
        });
      } catch (switchError) {
        if (switchError.code === 4902) {
          try {
            await window.ethereum.request({
              method: 'wallet_addEthereumChain',
              params: [
                {
                  chainId: '0x7a69',
                  chainName: 'Localhost 8545',
                  nativeCurrency: {
                    name: 'ETH',
                    symbol: 'ETH',
                    decimals: 18,
                  },
                  rpcUrls: ['http://localhost:8545'],
                  blockExplorerUrls: null,
                },
              ],
            });
          } catch (addError) {
            console.error('Error adding localhost network:', addError);
            setError('Failed to add localhost network to MetaMask');
          }
        } else {
          console.error('Error switching to localhost:', switchError);
          setError('Failed to switch to localhost network');
        }
      }
    }
  };

  return {
    isConnected,
    account,
    web3,
    balance,
    network,
    isLoading,
    error,
    connectWallet,
    disconnectWallet,
    getNetworkInfo,
    switchToSepolia,
    switchToLocalhost,
    isMetaMaskAvailable: isMetaMaskAvailable(),
  };
};