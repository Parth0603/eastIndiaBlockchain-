const { ethers } = require("hardhat");

async function main() {
  console.log("🚀 Starting deployment...");
  
  // Get the deployer account
  const [deployer] = await ethers.getSigners();
  console.log("📝 Deploying contracts with account:", deployer.address);
  
  // Get account balance
  const balance = await ethers.provider.getBalance(deployer.address);
  console.log("💰 Account balance:", ethers.formatEther(balance), "ETH");
  
  // Deploy ReliefToken
  console.log("\n📄 Deploying ReliefToken...");
  const ReliefToken = await ethers.getContractFactory("ReliefToken");
  const reliefToken = await ReliefToken.deploy(
    "Disaster Relief Token",  // name
    "DRT",                   // symbol
    18,                      // decimals
    deployer.address         // admin
  );
  
  await reliefToken.waitForDeployment();
  const reliefTokenAddress = await reliefToken.getAddress();
  console.log("✅ ReliefToken deployed to:", reliefTokenAddress);
  
  // Deploy ReliefDistribution
  console.log("\n📄 Deploying ReliefDistribution...");
  const ReliefDistribution = await ethers.getContractFactory("ReliefDistribution");
  const reliefDistribution = await ReliefDistribution.deploy(
    reliefTokenAddress,      // relief token address
    deployer.address         // admin
  );
  
  await reliefDistribution.waitForDeployment();
  const reliefDistributionAddress = await reliefDistribution.getAddress();
  console.log("✅ ReliefDistribution deployed to:", reliefDistributionAddress);
  
  // Grant minter role to distribution contract
  console.log("\n🔐 Setting up permissions...");
  const MINTER_ROLE = await reliefToken.MINTER_ROLE();
  await reliefToken.grantRole(MINTER_ROLE, reliefDistributionAddress);
  console.log("✅ Granted MINTER_ROLE to ReliefDistribution contract");
  
  // Grant verifier role to deployer (for testing)
  const VERIFIER_ROLE = await reliefDistribution.VERIFIER_ROLE();
  await reliefDistribution.grantRole(VERIFIER_ROLE, deployer.address);
  console.log("✅ Granted VERIFIER_ROLE to deployer");
  
  // Display deployment summary
  console.log("\n📋 Deployment Summary:");
  console.log("========================");
  console.log("ReliefToken:", reliefTokenAddress);
  console.log("ReliefDistribution:", reliefDistributionAddress);
  console.log("Deployer:", deployer.address);
  console.log("Network:", (await ethers.provider.getNetwork()).name);
  
  // Save deployment addresses to file
  const fs = require('fs');
  const deploymentInfo = {
    network: (await ethers.provider.getNetwork()).name,
    chainId: (await ethers.provider.getNetwork()).chainId,
    deployer: deployer.address,
    contracts: {
      ReliefToken: reliefTokenAddress,
      ReliefDistribution: reliefDistributionAddress
    },
    timestamp: new Date().toISOString()
  };
  
  fs.writeFileSync(
    'deployment-info.json', 
    JSON.stringify(deploymentInfo, null, 2)
  );
  console.log("\n💾 Deployment info saved to deployment-info.json");
  
  // Verify contracts on Etherscan (if not localhost)
  const network = await ethers.provider.getNetwork();
  if (network.chainId !== 31337n) {
    console.log("\n🔍 Verifying contracts on Etherscan...");
    console.log("Please run the following commands to verify:");
    console.log(`npx hardhat verify --network ${network.name} ${reliefTokenAddress} "Disaster Relief Token" "DRT" 18 ${deployer.address}`);
    console.log(`npx hardhat verify --network ${network.name} ${reliefDistributionAddress} ${reliefTokenAddress} ${deployer.address}`);
  }
  
  console.log("\n🎉 Deployment completed successfully!");
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error("❌ Deployment failed:", error);
    process.exit(1);
  });