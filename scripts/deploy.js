const { ethers } = require("hardhat");
const fs = require("fs");
const path = require("path");

async function main() {
  console.log("🚀 Starting deployment process...");
  
  const [deployer] = await ethers.getSigners();
  console.log("📝 Deploying contracts with account:", deployer.address);
  console.log("💰 Account balance:", ethers.formatEther(await deployer.provider.getBalance(deployer.address)));

  const deploymentInfo = {
    network: await deployer.provider.getNetwork(),
    deployer: deployer.address,
    timestamp: new Date().toISOString(),
    contracts: {}
  };

  try {
    // 1. Deploy AccessControl contract
    console.log("\n📋 Deploying AccessControl contract...");
    const AccessControl = await ethers.getContractFactory("DisasterReliefAccessControl");
    const accessControl = await AccessControl.deploy(deployer.address); // Pass deployer as admin
    await accessControl.waitForDeployment();
    
    const accessControlAddress = await accessControl.getAddress();
    console.log("✅ AccessControl deployed to:", accessControlAddress);
    
    deploymentInfo.contracts.accessControl = {
      address: accessControlAddress,
      transactionHash: accessControl.deploymentTransaction().hash
    };

    // 2. Deploy ReliefToken contract
    console.log("\n🪙 Deploying ReliefToken contract...");
    const ReliefToken = await ethers.getContractFactory("ReliefToken");
    const reliefToken = await ReliefToken.deploy(
      "Relief USDC", // name
      "RUSDC",       // symbol
      6,             // decimals (USDC standard)
      accessControlAddress // access control address
    );
    await reliefToken.waitForDeployment();
    
    const reliefTokenAddress = await reliefToken.getAddress();
    console.log("✅ ReliefToken deployed to:", reliefTokenAddress);
    
    deploymentInfo.contracts.reliefToken = {
      address: reliefTokenAddress,
      transactionHash: reliefToken.deploymentTransaction().hash
    };

    // 3. Deploy ReliefDistribution contract
    console.log("\n🏦 Deploying ReliefDistribution contract...");
    const ReliefDistribution = await ethers.getContractFactory("ReliefDistribution");
    const reliefDistribution = await ReliefDistribution.deploy(
      accessControlAddress, // access control address
      reliefTokenAddress    // token address
    );
    await reliefDistribution.waitForDeployment();
    
    const reliefDistributionAddress = await reliefDistribution.getAddress();
    console.log("✅ ReliefDistribution deployed to:", reliefDistributionAddress);
    
    deploymentInfo.contracts.reliefDistribution = {
      address: reliefDistributionAddress,
      transactionHash: reliefDistribution.deploymentTransaction().hash
    };

    // 4. Set up initial permissions
    console.log("\n🔐 Setting up initial permissions...");
    
    // Grant MINTER_ROLE to ReliefDistribution contract
    const MINTER_ROLE = await accessControl.MINTER_ROLE();
    await accessControl.grantRole(MINTER_ROLE, reliefDistributionAddress);
    console.log("✅ Granted MINTER_ROLE to ReliefDistribution");

    // Grant ADMIN_ROLE to deployer (if not already granted)
    const ADMIN_ROLE = await accessControl.ADMIN_ROLE();
    const hasAdminRole = await accessControl.hasRole(ADMIN_ROLE, deployer.address);
    if (!hasAdminRole) {
      await accessControl.grantRole(ADMIN_ROLE, deployer.address);
      console.log("✅ Granted ADMIN_ROLE to deployer");
    }

    // 5. Configure ReliefDistribution with token contract
    console.log("\n⚙️ Configuring contracts...");
    
    // Set the distribution contract in the token (if needed)
    try {
      await reliefToken.setDistributionContract(reliefDistributionAddress);
      console.log("✅ Set distribution contract in token");
    } catch (error) {
      console.log("ℹ️ Distribution contract setting not needed or already set");
    }

    // 6. Verify deployment
    console.log("\n🔍 Verifying deployment...");
    
    // Check if contracts are properly linked
    const tokenInDistribution = await reliefDistribution.reliefToken();
    const accessControlInDistribution = await reliefDistribution.accessControl();
    const accessControlInToken = await reliefToken.accessControl();
    
    console.log("Token address in distribution:", tokenInDistribution);
    console.log("AccessControl in distribution:", accessControlInDistribution);
    console.log("AccessControl in token:", accessControlInToken);
    
    if (tokenInDistribution !== reliefTokenAddress) {
      throw new Error("Token address mismatch in distribution contract");
    }
    if (accessControlInDistribution !== accessControlAddress) {
      throw new Error("AccessControl address mismatch in distribution contract");
    }
    if (accessControlInToken !== accessControlAddress) {
      throw new Error("AccessControl address mismatch in token contract");
    }

    console.log("✅ All contracts properly linked");

    // 7. Save deployment information
    const networkName = deploymentInfo.network.name;
    const deploymentFileName = `deployment-${networkName}.json`;
    const deploymentPath = path.join(__dirname, "..", deploymentFileName);
    
    fs.writeFileSync(deploymentPath, JSON.stringify(deploymentInfo, null, 2));
    console.log(`\n💾 Deployment info saved to ${deploymentFileName}`);

    // 8. Create environment variables template
    const envTemplate = `
# Smart Contract Addresses (${networkName})
ACCESS_CONTROL_ADDRESS=${accessControlAddress}
RELIEF_TOKEN_ADDRESS=${reliefTokenAddress}
RELIEF_DISTRIBUTION_ADDRESS=${reliefDistributionAddress}

# Network Configuration
NETWORK=${networkName}
RPC_URL=${process.env.RPC_URL || 'http://localhost:8545'}

# Deployer Information
DEPLOYER_ADDRESS=${deployer.address}
`;

    const envPath = path.join(__dirname, "..", `.env.${networkName}`);
    fs.writeFileSync(envPath, envTemplate.trim());
    console.log(`💾 Environment template saved to .env.${networkName}`);

    // 9. Display summary
    console.log("\n🎉 Deployment completed successfully!");
    console.log("📋 Contract Summary:");
    console.log("├── AccessControl:", accessControlAddress);
    console.log("├── ReliefToken:", reliefTokenAddress);
    console.log("└── ReliefDistribution:", reliefDistributionAddress);
    
    console.log("\n📝 Next Steps:");
    console.log("1. Update your .env files with the new contract addresses");
    console.log("2. Verify contracts on block explorer (if on public network)");
    console.log("3. Set up initial admin and verifier accounts");
    console.log("4. Fund the system with initial tokens for testing");

    return deploymentInfo;

  } catch (error) {
    console.error("❌ Deployment failed:", error);
    throw error;
  }
}

// Handle script execution
if (require.main === module) {
  main()
    .then(() => process.exit(0))
    .catch((error) => {
      console.error(error);
      process.exit(1);
    });
}

module.exports = { main };