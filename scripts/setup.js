const { ethers } = require("hardhat");
const fs = require("fs");
const path = require("path");

async function main() {
  console.log("🔧 Starting system setup...");
  
  const [deployer] = await ethers.getSigners();
  console.log("📝 Setting up with account:", deployer.address);

  // Load deployment info
  const networkName = (await deployer.provider.getNetwork()).name;
  const deploymentPath = path.join(__dirname, "..", `deployment-${networkName}.json`);
  
  if (!fs.existsSync(deploymentPath)) {
    throw new Error(`Deployment file not found: deployment-${networkName}.json`);
  }

  const deploymentInfo = JSON.parse(fs.readFileSync(deploymentPath, 'utf8'));
  console.log("📋 Loaded deployment info for network:", networkName);

  // Get contract instances
  const accessControl = await ethers.getContractAt(
    "DisasterReliefAccessControl", 
    deploymentInfo.contracts.accessControl.address
  );
  
  const reliefToken = await ethers.getContractAt(
    "ReliefToken", 
    deploymentInfo.contracts.reliefToken.address
  );
  
  const reliefDistribution = await ethers.getContractAt(
    "ReliefDistribution", 
    deploymentInfo.contracts.reliefDistribution.address
  );

  console.log("✅ Contract instances loaded");

  try {
    // 1. Set up essential categories
    console.log("\n📂 Setting up essential categories...");
    
    const categories = [
      "food",
      "water", 
      "shelter",
      "medical",
      "clothing",
      "education",
      "transportation",
      "communication",
      "other"
    ];

    for (const category of categories) {
      try {
        await reliefDistribution.addEssentialCategory(category);
        console.log(`✅ Added category: ${category}`);
      } catch (error) {
        if (error.message.includes("Category already exists")) {
          console.log(`ℹ️ Category already exists: ${category}`);
        } else {
          console.error(`❌ Failed to add category ${category}:`, error.message);
        }
      }
    }

    // 2. Set up sample admin accounts (if provided)
    console.log("\n👑 Setting up admin accounts...");
    
    const adminAddresses = process.env.ADMIN_ADDRESSES ? 
      process.env.ADMIN_ADDRESSES.split(',').map(addr => addr.trim()) : 
      [];

    const ADMIN_ROLE = await accessControl.ADMIN_ROLE();
    
    for (const adminAddress of adminAddresses) {
      if (ethers.isAddress(adminAddress)) {
        try {
          await accessControl.grantRole(ADMIN_ROLE, adminAddress);
          console.log(`✅ Granted admin role to: ${adminAddress}`);
        } catch (error) {
          console.log(`ℹ️ Admin role already granted or failed for: ${adminAddress}`);
        }
      } else {
        console.log(`⚠️ Invalid admin address: ${adminAddress}`);
      }
    }

    // 3. Set up sample verifier accounts (if provided)
    console.log("\n🔍 Setting up verifier accounts...");
    
    const verifierAddresses = process.env.VERIFIER_ADDRESSES ? 
      process.env.VERIFIER_ADDRESSES.split(',').map(addr => addr.trim()) : 
      [];

    const VERIFIER_ROLE = await accessControl.VERIFIER_ROLE();
    
    for (const verifierAddress of verifierAddresses) {
      if (ethers.isAddress(verifierAddress)) {
        try {
          await accessControl.grantRole(VERIFIER_ROLE, verifierAddress);
          console.log(`✅ Granted verifier role to: ${verifierAddress}`);
        } catch (error) {
          console.log(`ℹ️ Verifier role already granted or failed for: ${verifierAddress}`);
        }
      } else {
        console.log(`⚠️ Invalid verifier address: ${verifierAddress}`);
      }
    }

    // 4. Mint initial tokens for testing (if specified)
    console.log("\n🪙 Minting initial tokens...");
    
    const initialMintAmount = process.env.INITIAL_MINT_AMOUNT || "1000000"; // 1M tokens
    const mintRecipient = process.env.MINT_RECIPIENT || deployer.address;
    
    if (ethers.isAddress(mintRecipient)) {
      try {
        const mintAmount = ethers.parseEther(initialMintAmount);
        await reliefToken.mint(mintRecipient, mintAmount);
        console.log(`✅ Minted ${initialMintAmount} tokens to: ${mintRecipient}`);
      } catch (error) {
        console.error("❌ Failed to mint initial tokens:", error.message);
      }
    }

    // 5. Set up system parameters
    console.log("\n⚙️ Configuring system parameters...");
    
    // Set minimum allocation amount (if function exists)
    try {
      const minAllocation = ethers.parseEther("10"); // 10 tokens minimum
      await reliefDistribution.setMinimumAllocation(minAllocation);
      console.log("✅ Set minimum allocation to 10 tokens");
    } catch (error) {
      console.log("ℹ️ Minimum allocation setting not available or already set");
    }

    // Set maximum allocation amount (if function exists)
    try {
      const maxAllocation = ethers.parseEther("10000"); // 10K tokens maximum
      await reliefDistribution.setMaximumAllocation(maxAllocation);
      console.log("✅ Set maximum allocation to 10,000 tokens");
    } catch (error) {
      console.log("ℹ️ Maximum allocation setting not available or already set");
    }

    // 6. Verify setup
    console.log("\n🔍 Verifying setup...");
    
    // Check token supply
    const totalSupply = await reliefToken.totalSupply();
    console.log("Total token supply:", ethers.formatEther(totalSupply));
    
    // Check deployer balance
    const deployerBalance = await reliefToken.balanceOf(deployer.address);
    console.log("Deployer token balance:", ethers.formatEther(deployerBalance));
    
    // Check roles
    const isAdmin = await accessControl.hasRole(ADMIN_ROLE, deployer.address);
    console.log("Deployer has admin role:", isAdmin);
    
    // Check categories
    try {
      const categoryCount = await reliefDistribution.getEssentialCategoriesCount();
      console.log("Essential categories count:", categoryCount.toString());
    } catch (error) {
      console.log("ℹ️ Category count not available");
    }

    // 7. Save setup info
    const setupInfo = {
      network: networkName,
      timestamp: new Date().toISOString(),
      deployer: deployer.address,
      categories: categories,
      adminAddresses: adminAddresses,
      verifierAddresses: verifierAddresses,
      initialMint: {
        amount: initialMintAmount,
        recipient: mintRecipient
      },
      verification: {
        totalSupply: ethers.formatEther(totalSupply),
        deployerBalance: ethers.formatEther(deployerBalance),
        deployerIsAdmin: isAdmin
      }
    };

    const setupPath = path.join(__dirname, "..", `setup-${networkName}.json`);
    fs.writeFileSync(setupPath, JSON.stringify(setupInfo, null, 2));
    console.log(`\n💾 Setup info saved to setup-${networkName}.json`);

    console.log("\n🎉 System setup completed successfully!");
    console.log("📋 Setup Summary:");
    console.log(`├── Categories: ${categories.length} essential categories added`);
    console.log(`├── Admins: ${adminAddresses.length} admin accounts configured`);
    console.log(`├── Verifiers: ${verifierAddresses.length} verifier accounts configured`);
    console.log(`└── Tokens: ${initialMintAmount} tokens minted to ${mintRecipient}`);

    console.log("\n📝 Next Steps:");
    console.log("1. Start the backend server with the new contract addresses");
    console.log("2. Start the frontend application");
    console.log("3. Test the system with sample transactions");
    console.log("4. Set up monitoring and alerting");

  } catch (error) {
    console.error("❌ Setup failed:", error);
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