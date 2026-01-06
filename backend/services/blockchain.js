import { ethers } from 'ethers';
import fs from 'fs';
import path from 'path';
import websocketService from './websocket.js';

class BlockchainService {
  constructor() {
    this.provider = null;
    this.signer = null;
    this.contracts = {};
    this.initialized = false;
  }

  /**
   * Initialize blockchain connection and contracts
   */
  async initialize() {
    try {
      // Set up provider
      const rpcUrl = process.env.RPC_URL || 'http://localhost:8545';
      this.provider = new ethers.JsonRpcProvider(rpcUrl);

      // Set up signer (for server operations)
      if (process.env.PRIVATE_KEY) {
        this.signer = new ethers.Wallet(process.env.PRIVATE_KEY, this.provider);
      }

      // Load contract ABIs and addresses
      await this.loadContracts();

      this.initialized = true;
      console.log('✅ Blockchain service initialized');
    } catch (error) {
      console.error('❌ Failed to initialize blockchain service:', error);
      throw error;
    }
  }

  /**
   * Load contract ABIs and create contract instances
   */
  async loadContracts() {
    try {
      const contractsDir = path.join(process.cwd(), '../artifacts/contracts');
      
      // Load AccessControl contract
      const accessControlABI = JSON.parse(
        fs.readFileSync(path.join(contractsDir, 'AccessControl.sol/DisasterReliefAccessControl.json'), 'utf8')
      ).abi;
      
      // Load ReliefToken contract
      const reliefTokenABI = JSON.parse(
        fs.readFileSync(path.join(contractsDir, 'ReliefToken.sol/ReliefToken.json'), 'utf8')
      ).abi;
      
      // Load ReliefDistribution contract
      const reliefDistributionABI = JSON.parse(
        fs.readFileSync(path.join(contractsDir, 'ReliefDistribution.sol/ReliefDistribution.json'), 'utf8')
      ).abi;

      // Create contract instances
      this.contracts.accessControl = new ethers.Contract(
        process.env.ACCESS_CONTROL_ADDRESS,
        accessControlABI,
        this.provider
      );

      this.contracts.reliefToken = new ethers.Contract(
        process.env.RELIEF_TOKEN_ADDRESS,
        reliefTokenABI,
        this.provider
      );

      this.contracts.reliefDistribution = new ethers.Contract(
        process.env.RELIEF_DISTRIBUTION_ADDRESS,
        reliefDistributionABI,
        this.provider
      );

      console.log('✅ Smart contracts loaded');
    } catch (error) {
      console.error('❌ Failed to load contracts:', error);
      // Don't throw error if contracts aren't deployed yet
      console.log('⚠️ Contracts not found - they may not be deployed yet');
    }
  }

  /**
   * Get user role from smart contract
   */
  async getUserRole(address) {
    try {
      if (!this.contracts.accessControl) {
        return 'user'; // Default role if contract not available
      }

      const isAdmin = await this.contracts.accessControl.hasRole(
        await this.contracts.accessControl.ADMIN_ROLE(),
        address
      );
      if (isAdmin) return 'admin';

      const isVerifier = await this.contracts.accessControl.hasRole(
        await this.contracts.accessControl.VERIFIER_ROLE(),
        address
      );
      if (isVerifier) return 'verifier';

      const isBeneficiary = await this.contracts.accessControl.hasRole(
        await this.contracts.accessControl.BENEFICIARY_ROLE(),
        address
      );
      if (isBeneficiary) return 'beneficiary';

      const isVendor = await this.contracts.accessControl.hasRole(
        await this.contracts.accessControl.VENDOR_ROLE(),
        address
      );
      if (isVendor) return 'vendor';

      return 'user';
    } catch (error) {
      console.error('Error getting user role:', error);
      return 'user'; // Default role on error
    }
  }

  /**
   * Get token balance for an address
   */
  async getTokenBalance(address) {
    try {
      if (!this.contracts.reliefToken) {
        return '0';
      }

      const balance = await this.contracts.reliefToken.balanceOf(address);
      return ethers.formatEther(balance);
    } catch (error) {
      console.error('Error getting token balance:', error);
      return '0';
    }
  }

  /**
   * Get beneficiary allocation
   */
  async getBeneficiaryAllocation(address) {
    try {
      if (!this.contracts.reliefDistribution) {
        return { allocated: '0', spent: '0', remaining: '0' };
      }

      const allocation = await this.contracts.reliefDistribution.getBeneficiaryAllocation(address);
      return {
        allocated: ethers.formatEther(allocation.allocated),
        spent: ethers.formatEther(allocation.spent),
        remaining: ethers.formatEther(allocation.remaining)
      };
    } catch (error) {
      console.error('Error getting beneficiary allocation:', error);
      return { allocated: '0', spent: '0', remaining: '0' };
    }
  }

  /**
   * Get donation statistics
   */
  async getDonationStats() {
    try {
      if (!this.contracts.reliefDistribution) {
        return { totalDonations: '0', totalBeneficiaries: 0, totalVendors: 0 };
      }

      const stats = await this.contracts.reliefDistribution.getSystemStats();
      return {
        totalDonations: ethers.formatEther(stats.totalDonations),
        totalBeneficiaries: stats.totalBeneficiaries.toString(),
        totalVendors: stats.totalVendors.toString()
      };
    } catch (error) {
      console.error('Error getting donation stats:', error);
      return { totalDonations: '0', totalBeneficiaries: 0, totalVendors: 0 };
    }
  }

  /**
   * Listen for contract events
   */
  setupEventListeners() {
    if (!this.contracts.reliefDistribution) return;

    // Listen for donation events
    this.contracts.reliefDistribution.on('DonationReceived', (donor, amount, event) => {
      const donation = {
        donor,
        amount: ethers.formatEther(amount),
        transactionHash: event.transactionHash,
        blockNumber: event.blockNumber
      };
      
      websocketService.notifyDonationReceived(donation);
      websocketService.notifyTransactionUpdate(event.transactionHash, 'confirmed', {
        type: 'donation',
        ...donation
      });
    });

    // Listen for beneficiary approval events
    this.contracts.reliefDistribution.on('BeneficiaryApproved', (beneficiary, amount, event) => {
      const beneficiaryData = {
        address: beneficiary,
        allocatedAmount: ethers.formatEther(amount),
        transactionHash: event.transactionHash,
        blockNumber: event.blockNumber
      };
      
      websocketService.notifyBeneficiaryApproved(beneficiaryData);
      websocketService.notifyTransactionUpdate(event.transactionHash, 'confirmed', {
        type: 'beneficiary-approval',
        ...beneficiaryData
      });
    });

    // Listen for vendor approval events
    this.contracts.reliefDistribution.on('VendorApproved', (vendor, event) => {
      const vendorData = {
        address: vendor,
        transactionHash: event.transactionHash,
        blockNumber: event.blockNumber
      };
      
      websocketService.notifyVendorApproved(vendorData);
      websocketService.notifyTransactionUpdate(event.transactionHash, 'confirmed', {
        type: 'vendor-approval',
        ...vendorData
      });
    });

    // Listen for purchase events
    this.contracts.reliefDistribution.on('PurchaseProcessed', (beneficiary, vendor, amount, category, event) => {
      const purchase = {
        beneficiary,
        vendor,
        amount: ethers.formatEther(amount),
        category,
        transactionHash: event.transactionHash,
        blockNumber: event.blockNumber
      };
      
      websocketService.notifyPurchaseProcessed(purchase);
      websocketService.notifyTransactionUpdate(event.transactionHash, 'confirmed', {
        type: 'purchase',
        ...purchase
      });
    });

    // Listen for emergency pause events
    this.contracts.reliefDistribution.on('EmergencyPause', (paused, event) => {
      websocketService.notifySystemAlert({
        type: 'emergency-pause',
        message: paused ? 'System has been paused' : 'System has been unpaused',
        paused,
        transactionHash: event.transactionHash
      });
    });

    // Listen for role assignment events
    this.contracts.accessControl.on('RoleGranted', (role, account, sender, event) => {
      websocketService.broadcastToRole('admin', 'role-granted', {
        role,
        account,
        sender,
        transactionHash: event.transactionHash
      });
    });

    this.contracts.accessControl.on('RoleRevoked', (role, account, sender, event) => {
      websocketService.broadcastToRole('admin', 'role-revoked', {
        role,
        account,
        sender,
        transactionHash: event.transactionHash
      });
    });

    console.log('✅ Event listeners set up with WebSocket integration');
  }

  /**
   * Check if service is ready
   */
  isReady() {
    return this.initialized && this.provider !== null;
  }
}

// Create singleton instance
const blockchainService = new BlockchainService();

export default blockchainService;