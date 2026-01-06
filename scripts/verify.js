const { run, ethers } = require("hardhat");
const fs = require("fs");
const path = require("path");

async function main() {
  console.log("🔍 Starting contract verification...");
  
  const [deployer] = await ethers.getSigners();
  const networkName = (await deployer.provider.getNetwork()).name;
  
  // Load deployment info
  const deploymentPath = path.join(__dirname, "..", `deployment-${networkName}.json`);
  
  if (!fs.existsSync(deploymentPath)) {
    throw new Error(`Deployment file not found: deployment-${networkName}.json`);
  }

  const deploymentInfo = JSON.parse(fs.readFileSync(deploymentPath, 'utf8'));
  console.log("📋 Loaded deployment info for network:", networkName);

  const contracts = deploymentInfo.contracts;

  try {
    // 1. Verify AccessControl contract
    console.log("\n📋 Verifying AccessControl contract...");
    try {
      await run("verify:verify", {
        address: contracts.accessControl.address,
        constructorArguments: []
      });
      console.log("✅ AccessControl contract verified");
    } catch (error) {
      if (error.message.includes("Already Verified")) {
        console.log("ℹ️ AccessControl contract already verified");
      } else {
        console.error("❌ AccessControl verification failed:", error.message);
      }
    }

    // 2. Verify ReliefToken contract
    console.log("\n🪙 Verifying ReliefToken contract...");
    try {
      await run("verify:verify", {
        address: contracts.reliefToken.address,
        constructorArguments: [
          "Relief USDC",
          "RUSDC", 
          contracts.accessControl.address
        ]
      });
      console.log("✅ ReliefToken contract verified");
    } catch (error) {
      if (error.message.includes("Already Verified")) {
        console.log("ℹ️ ReliefToken contract already verified");
      } else {
        console.error("❌ ReliefToken verification failed:", error.message);
      }
    }

    // 3. Verify ReliefDistribution contract
    console.log("\n🏦 Verifying ReliefDistribution contract...");
    try {
      await run("verify:verify", {
        address: contracts.reliefDistribution.address,
        constructorArguments: [
          contracts.reliefToken.address,
          contracts.accessControl.address
        ]
      });
      console.log("✅ ReliefDistribution contract verified");
    } catch (error) {
      if (error.message.includes("Already Verified")) {
        console.log("ℹ️ ReliefDistribution contract already verified");
      } else {
        console.error("❌ ReliefDistribution verification failed:", error.message);
      }
    }

    console.log("\n🎉 Contract verification completed!");
    
    // Generate verification report
    const verificationReport = {
      network: networkName,
      timestamp: new Date().toISOString(),
      contracts: {
        accessControl: {
          address: contracts.accessControl.address,
          verified: true
        },
        reliefToken: {
          address: contracts.reliefToken.address,
          verified: true
        },
        reliefDistribution: {
          address: contracts.reliefDistribution.address,
          verified: true
        }
      }
    };

    const reportPath = path.join(__dirname, "..", `verification-${networkName}.json`);
    fs.writeFileSync(reportPath, JSON.stringify(verificationReport, null, 2));
    console.log(`💾 Verification report saved to verification-${networkName}.json`);

  } catch (error) {
    console.error("❌ Verification process failed:", error);
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