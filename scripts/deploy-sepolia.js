const hre = require("hardhat");
const fs = require("fs");
const path = require("path");

async function main() {
  console.log("🚀 Deploying to Sepolia testnet...\n");

  // Get the deployer account
  const [deployer] = await hre.ethers.getSigners();
  console.log("📝 Deploying contracts with account:", deployer.address);
  
  // Check balance
  const balance = await hre.ethers.provider.getBalance(deployer.address);
  console.log("💰 Account balance:", hre.ethers.formatEther(balance), "ETH\n");

  if (balance < hre.ethers.parseEther("0.01")) {
    console.log("⚠️ WARNING: Low balance! You need at least 0.01 ETH for deployment");
    console.log("💡 Get Sepolia ETH from: https://sepoliafaucet.com/");
    console.log("💡 Or: https://faucets.chain.link/sepolia\n");
  }

  try {
    // Deploy AccessControl
    console.log("📦 Deploying AccessControl...");
    const AccessControl = await hre.ethers.getContractFactory("DisasterReliefAccessControl");
    const accessControl = await AccessControl.deploy(deployer.address); // Pass deployer as admin
    await accessControl.waitForDeployment();
    const accessControlAddress = await accessControl.getAddress();
    console.log("✅ AccessControl deployed to:", accessControlAddress);

    // Deploy ReliefToken
    console.log("📦 Deploying ReliefToken...");
    const ReliefToken = await hre.ethers.getContractFactory("ReliefToken");
    const reliefToken = await ReliefToken.deploy(
      "Disaster Relief Token",  // name
      "DRT",                   // symbol
      18,                      // decimals
      accessControlAddress     // access control address
    );
    await reliefToken.waitForDeployment();
    const reliefTokenAddress = await reliefToken.getAddress();
    console.log("✅ ReliefToken deployed to:", reliefTokenAddress);

    // Deploy ReliefDistribution
    console.log("📦 Deploying ReliefDistribution...");
    const ReliefDistribution = await hre.ethers.getContractFactory("ReliefDistribution");
    const reliefDistribution = await ReliefDistribution.deploy(
      accessControlAddress,    // access control address (first parameter)
      reliefTokenAddress       // relief token address (second parameter)
    );
    await reliefDistribution.waitForDeployment();
    const reliefDistributionAddress = await reliefDistribution.getAddress();
    console.log("✅ ReliefDistribution deployed to:", reliefDistributionAddress);

    // Update contract addresses in environment files
    console.log("\n📝 Updating environment files...");
    
    // Update root .env
    updateEnvFile(".env", {
      RELIEF_TOKEN_ADDRESS: reliefTokenAddress,
      RELIEF_DISTRIBUTION_ADDRESS: reliefDistributionAddress,
      ACCESS_CONTROL_ADDRESS: accessControlAddress
    });

    // Update backend .env
    updateEnvFile("backend/.env", {
      RELIEF_TOKEN_ADDRESS: reliefTokenAddress,
      RELIEF_DISTRIBUTION_ADDRESS: reliefDistributionAddress,
      ACCESS_CONTROL_ADDRESS: accessControlAddress
    });

    // Update frontend .env
    updateEnvFile("frontend/.env", {
      VITE_RELIEF_TOKEN_ADDRESS: reliefTokenAddress,
      VITE_RELIEF_DISTRIBUTION_ADDRESS: reliefDistributionAddress,
      VITE_ACCESS_CONTROL_ADDRESS: accessControlAddress,
      VITE_NETWORK_ID: "11155111",
      VITE_NETWORK_NAME: "sepolia",
      VITE_INFURA_API_KEY: "be40a16531a4446dad8d3ce44fcc94a7"
    });

    // Save deployment info
    const deploymentInfo = {
      network: "sepolia",
      chainId: 11155111,
      deployer: deployer.address,
      timestamp: new Date().toISOString(),
      contracts: {
        AccessControl: accessControlAddress,
        ReliefToken: reliefTokenAddress,
        ReliefDistribution: reliefDistributionAddress
      },
      transactionHashes: {
        AccessControl: accessControl.deploymentTransaction()?.hash,
        ReliefToken: reliefToken.deploymentTransaction()?.hash,
        ReliefDistribution: reliefDistribution.deploymentTransaction()?.hash
      }
    };

    fs.writeFileSync(
      "deployment-sepolia.json",
      JSON.stringify(deploymentInfo, null, 2)
    );

    console.log("\n🎉 Deployment completed successfully!");
    console.log("📄 Deployment info saved to: deployment-sepolia.json");
    console.log("\n📋 Contract Addresses:");
    console.log("   AccessControl:", accessControlAddress);
    console.log("   ReliefToken:", reliefTokenAddress);
    console.log("   ReliefDistribution:", reliefDistributionAddress);
    console.log("\n🔗 View on Etherscan:");
    console.log(`   https://sepolia.etherscan.io/address/${accessControlAddress}`);
    console.log(`   https://sepolia.etherscan.io/address/${reliefTokenAddress}`);
    console.log(`   https://sepolia.etherscan.io/address/${reliefDistributionAddress}`);
    console.log("\n💡 MetaMask Setup:");
    console.log("   Network Name: Sepolia Test Network");
    console.log("   RPC URL: https://sepolia.infura.io/v3/be40a16531a4446dad8d3ce44fcc94a7");
    console.log("   Chain ID: 11155111");
    console.log("   Currency Symbol: ETH");
    console.log("   Block Explorer: https://sepolia.etherscan.io");

  } catch (error) {
    console.error("❌ Deployment failed:", error.message);
    process.exit(1);
  }
}

function updateEnvFile(filePath, updates) {
  try {
    let content = fs.readFileSync(filePath, 'utf8');
    
    Object.entries(updates).forEach(([key, value]) => {
      const regex = new RegExp(`^${key}=.*$`, 'm');
      if (content.match(regex)) {
        content = content.replace(regex, `${key}=${value}`);
      } else {
        content += `\n${key}=${value}`;
      }
    });
    
    fs.writeFileSync(filePath, content);
    console.log(`✅ Updated ${filePath}`);
  } catch (error) {
    console.log(`⚠️ Could not update ${filePath}:`, error.message);
  }
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });