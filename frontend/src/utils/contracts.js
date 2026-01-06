// Contract ABIs and addresses
export const CONTRACT_ADDRESSES = {
  RELIEF_TOKEN: import.meta.env.VITE_RELIEF_TOKEN_ADDRESS || '',
  RELIEF_DISTRIBUTION: import.meta.env.VITE_RELIEF_DISTRIBUTION_ADDRESS || '',
  ACCESS_CONTROL: import.meta.env.VITE_ACCESS_CONTROL_ADDRESS || '',
};

// Contract ABIs (will be populated after contract compilation)
export const CONTRACT_ABIS = {
  RELIEF_TOKEN: [
    // ERC20 standard functions
    {
      "inputs": [{"name": "spender", "type": "address"}, {"name": "amount", "type": "uint256"}],
      "name": "approve",
      "outputs": [{"name": "", "type": "bool"}],
      "type": "function"
    },
    {
      "inputs": [{"name": "account", "type": "address"}],
      "name": "balanceOf",
      "outputs": [{"name": "", "type": "uint256"}],
      "type": "function"
    },
    {
      "inputs": [],
      "name": "totalSupply",
      "outputs": [{"name": "", "type": "uint256"}],
      "type": "function"
    },
    {
      "inputs": [{"name": "to", "type": "address"}, {"name": "amount", "type": "uint256"}],
      "name": "transfer",
      "outputs": [{"name": "", "type": "bool"}],
      "type": "function"
    },
    // Custom ReliefToken functions
    {
      "inputs": [
        {"name": "to", "type": "address"}, 
        {"name": "amount", "type": "uint256"}, 
        {"name": "purpose", "type": "string"}
      ],
      "name": "mint",
      "outputs": [],
      "type": "function"
    }
  ],
  
  RELIEF_DISTRIBUTION: [
    // Beneficiary functions
    {
      "inputs": [{"name": "disasterType", "type": "string"}, {"name": "location", "type": "string"}],
      "name": "registerBeneficiary",
      "outputs": [],
      "type": "function"
    },
    {
      "inputs": [{"name": "beneficiary", "type": "address"}, {"name": "amount", "type": "uint256"}],
      "name": "approveBeneficiary",
      "outputs": [],
      "type": "function"
    },
    // Vendor functions
    {
      "inputs": [{"name": "businessName", "type": "string"}],
      "name": "registerVendor",
      "outputs": [],
      "type": "function"
    },
    {
      "inputs": [{"name": "vendor", "type": "address"}, {"name": "categories", "type": "string[]"}],
      "name": "approveVendor",
      "outputs": [],
      "type": "function"
    },
    // Purchase functions
    {
      "inputs": [
        {"name": "vendor", "type": "address"},
        {"name": "amount", "type": "uint256"},
        {"name": "category", "type": "string"},
        {"name": "description", "type": "string"}
      ],
      "name": "processPurchase",
      "outputs": [],
      "type": "function"
    },
    // View functions
    {
      "inputs": [{"name": "", "type": "address"}],
      "name": "beneficiaries",
      "outputs": [
        {"name": "isApproved", "type": "bool"},
        {"name": "allocatedAmount", "type": "uint256"},
        {"name": "spentAmount", "type": "uint256"},
        {"name": "disasterType", "type": "string"},
        {"name": "location", "type": "string"}
      ],
      "type": "function"
    },
    {
      "inputs": [{"name": "", "type": "address"}],
      "name": "vendors",
      "outputs": [
        {"name": "isApproved", "type": "bool"},
        {"name": "businessName", "type": "string"},
        {"name": "totalReceived", "type": "uint256"}
      ],
      "type": "function"
    }
  ]
};

// Network configurations
export const NETWORKS = {
  31337: {
    name: 'Localhost',
    rpcUrl: 'http://localhost:8545',
    blockExplorer: null,
  },
  11155111: {
    name: 'Sepolia',
    rpcUrl: 'https://sepolia.infura.io/v3/',
    blockExplorer: 'https://sepolia.etherscan.io',
  },
  5: {
    name: 'Goerli',
    rpcUrl: 'https://goerli.infura.io/v3/',
    blockExplorer: 'https://goerli.etherscan.io',
  },
};

// Essential spending categories
export const ESSENTIAL_CATEGORIES = [
  'food',
  'medicine',
  'shelter',
  'clothing',
  'water'
];

// Transaction types
export const TRANSACTION_TYPES = {
  DONATION: 'donation',
  ALLOCATION: 'allocation',
  SPENDING: 'spending',
  VENDOR_PAYMENT: 'vendor_payment'
};

// User roles
export const USER_ROLES = {
  ADMIN: 'admin',
  VERIFIER: 'verifier',
  BENEFICIARY: 'beneficiary',
  VENDOR: 'vendor',
  DONOR: 'donor'
};