require("@nomicfoundation/hardhat-toolbox");
require("dotenv").config();

// Default private key for development (never use in production)
const DEFAULT_PRIVATE_KEY = "0xac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff80";

// Function to get valid private key
function getPrivateKey() {
  const envKey = process.env.PRIVATE_KEY;
  if (!envKey || envKey === "your_private_key_here" || envKey.length < 64) {
    return DEFAULT_PRIVATE_KEY;
  }
  return envKey.startsWith('0x') ? envKey : `0x${envKey}`;
}

/** @type import('hardhat/config').HardhatUserConfig */
module.exports = {
  solidity: {
    version: "0.8.20",
    settings: {
      optimizer: {
        enabled: true,
        runs: 200,
      },
    },
  },
  networks: {
    localhost: {
      url: "http://127.0.0.1:8545",
      chainId: 31337,
    },
    sepolia: {
      url: process.env.SEPOLIA_RPC_URL || "https://sepolia.infura.io/v3/be40a16531a4446dad8d3ce44fcc94a7",
      accounts: [getPrivateKey()],
      chainId: 11155111,
    },
    goerli: {
      url: process.env.GOERLI_RPC_URL || "https://goerli.infura.io/v3/be40a16531a4446dad8d3ce44fcc94a7",
      accounts: [getPrivateKey()],
      chainId: 5,
    },
  },
  etherscan: {
    apiKey: process.env.ETHERSCAN_API_KEY || "dummy-key",
  },
  gasReporter: {
    enabled: process.env.REPORT_GAS !== undefined,
    currency: "USD",
  },
  paths: {
    sources: "./contracts",
    tests: "./test/contracts",
    cache: "./cache",
    artifacts: "./artifacts",
  },
};