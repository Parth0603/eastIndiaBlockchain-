import Web3 from 'web3';

// Web3 configuration and utilities
class Web3Service {
  constructor() {
    this.web3 = null;
    this.account = null;
    this.networkId = null;
  }

  // Initialize Web3 connection
  async init() {
    if (typeof window !== 'undefined' && typeof window.ethereum !== 'undefined') {
      try {
        this.web3 = new Web3(window.ethereum);
        
        // Get network ID
        this.networkId = await this.web3.eth.net.getId();
        
        // Get accounts if already connected
        const accounts = await window.ethereum.request({ method: 'eth_accounts' });
        if (accounts.length > 0) {
          this.account = accounts[0];
        }
        
        return true;
      } catch (error) {
        console.error('Failed to initialize Web3:', error);
        return false;
      }
    } else {
      console.warn('MetaMask not detected');
      return false;
    }
  }

  // Connect to MetaMask
  async connect() {
    if (!this.web3) {
      const initialized = await this.init();
      if (!initialized) return null;
    }

    try {
      const accounts = await window.ethereum.request({
        method: 'eth_requestAccounts',
      });
      
      if (accounts.length > 0) {
        this.account = accounts[0];
        return this.account;
      }
      return null;
    } catch (error) {
      console.error('Failed to connect to MetaMask:', error);
      return null;
    }
  }

  // Get account balance
  async getBalance(address = null) {
    if (!this.web3) return '0';
    
    const account = address || this.account;
    if (!account) return '0';

    try {
      const balance = await this.web3.eth.getBalance(account);
      return this.web3.utils.fromWei(balance, 'ether');
    } catch (error) {
      console.error('Failed to get balance:', error);
      return '0';
    }
  }

  // Check if connected to correct network
  async checkNetwork() {
    if (!this.web3) return false;

    try {
      const networkId = await this.web3.eth.net.getId();
      const expectedNetworkId = import.meta.env.VITE_NETWORK_ID || '31337';
      
      return networkId.toString() === expectedNetworkId;
    } catch (error) {
      console.error('Failed to check network:', error);
      return false;
    }
  }

  // Switch to correct network
  async switchNetwork() {
    if (!window.ethereum) return false;

    const networkId = import.meta.env.VITE_NETWORK_ID || '31337';
    const networkName = import.meta.env.VITE_NETWORK_NAME || 'localhost';

    try {
      await window.ethereum.request({
        method: 'wallet_switchEthereumChain',
        params: [{ chainId: this.web3.utils.toHex(networkId) }],
      });
      return true;
    } catch (error) {
      console.error('Failed to switch network:', error);
      return false;
    }
  }

  // Format address for display
  formatAddress(address) {
    if (!address) return '';
    return `${address.slice(0, 6)}...${address.slice(-4)}`;
  }

  // Convert Wei to Ether
  fromWei(value, unit = 'ether') {
    if (!this.web3) return '0';
    return this.web3.utils.fromWei(value.toString(), unit);
  }

  // Convert Ether to Wei
  toWei(value, unit = 'ether') {
    if (!this.web3) return '0';
    return this.web3.utils.toWei(value.toString(), unit);
  }

  // Get current account
  getCurrentAccount() {
    return this.account;
  }

  // Get Web3 instance
  getWeb3() {
    return this.web3;
  }

  // Check if MetaMask is installed
  isMetaMaskInstalled() {
    return typeof window !== 'undefined' && typeof window.ethereum !== 'undefined';
  }
}

// Create singleton instance
const web3Service = new Web3Service();

export default web3Service;