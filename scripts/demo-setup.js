#!/usr/bin/env node

const { ethers } = require("hardhat");
const fs = require("fs");
const path = require("path");

/**
 * Demo Setup Script
 * 
 * This script sets up demo data and scenarios for hackathon presentation.
 * It creates realistic test data that showcases all system features.
 */

async function main() {
  console.log("🎭 Setting up demo data for hackathon presentation...");
  
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
    // Demo scenario data
    const demoData = {
      // Demo user accounts (these would be provided by the presentation team)
      accounts: {
        admin: deployer.address,
        donors: [
          "0x742d35Cc6634C0532925a3b8D0C9e3e4C4c4c4c4", // Demo donor 1
          "0x8ba1f109551bD432803012645Hac136c22C177ec", // Demo donor 2
          "0x1234567890123456789012345678901234567890"  // Demo donor 3
        ],
        beneficiaries: [
          "0xabcdefabcdefabcdefabcdefabcdefabcdefabcd", // Demo beneficiary 1
          "0x1111111111111111111111111111111111111111", // Demo beneficiary 2
          "0x2222222222222222222222222222222222222222"  // Demo beneficiary 3
        ],
        vendors: [
          "0x3333333333333333333333333333333333333333", // Demo vendor 1
          "0x4444444444444444444444444444444444444444", // Demo vendor 2
        ],
        verifiers: [
          "0x5555555555555555555555555555555555555555", // Demo verifier 1
          "0x6666666666666666666666666666666666666666"  // Demo verifier 2
        ]
      },
      
      // Demo disaster scenarios
      disasters: [
        {
          name: "Hurricane Maria Relief",
          location: "Puerto Rico",
          type: "hurricane",
          severity: "critical",
          affectedFamilies: 15000,
          estimatedNeed: "2500000" // $2.5M
        },
        {
          name: "California Wildfire Aid",
          location: "California, USA",
          type: "wildfire",
          severity: "high",
          affectedFamilies: 8000,
          estimatedNeed: "1200000" // $1.2M
        },
        {
          name: "Turkey Earthquake Response",
          location: "Turkey",
          type: "earthquake",
          severity: "critical",
          affectedFamilies: 25000,
          estimatedNeed: "5000000" // $5M
        }
      ],

      // Demo donations
      donations: [
        { amount: "50000", donor: 0, disaster: 0, message: "Helping families affected by Hurricane Maria" },
        { amount: "25000", donor: 1, disaster: 0, message: "Emergency relief for hurricane victims" },
        { amount: "75000", donor: 2, disaster: 1, message: "Support for wildfire evacuees" },
        { amount: "100000", donor: 0, disaster: 2, message: "Earthquake emergency response" },
        { amount: "30000", donor: 1, disaster: 2, message: "Medical supplies for earthquake victims" }
      ],

      // Demo beneficiary applications
      applications: [
        {
          beneficiary: 0,
          disaster: 0,
          requestedAmount: "2500",
          priority: "critical",
          description: "Family of 6 lost home and all belongings in Hurricane Maria",
          status: "approved"
        },
        {
          beneficiary: 1,
          disaster: 1,
          requestedAmount: "1800",
          priority: "high",
          description: "Elderly couple evacuated from wildfire, need temporary housing",
          status: "approved"
        },
        {
          beneficiary: 2,
          disaster: 2,
          requestedAmount: "3000",
          priority: "critical",
          description: "Single mother with 3 children, home destroyed in earthquake",
          status: "pending"
        }
      ],

      // Demo vendor registrations
      vendors: [
        {
          address: 0,
          businessName: "Emergency Supplies Co.",
          businessType: "retail",
          categories: ["food", "water", "medical"],
          location: "Puerto Rico",
          status: "verified"
        },
        {
          address: 1,
          businessName: "Disaster Relief Grocers",
          businessType: "grocery",
          categories: ["food", "water", "shelter"],
          location: "California",
          status: "verified"
        }
      ],

      // Demo transactions
      transactions: [
        {
          type: "spending",
          beneficiary: 0,
          vendor: 0,
          amount: "150",
          category: "food",
          description: "Emergency food supplies for family"
        },
        {
          type: "spending",
          beneficiary: 1,
          vendor: 1,
          amount: "200",
          category: "shelter",
          description: "Temporary housing materials"
        }
      ]
    };

    // 1. Set up demo roles
    console.log("\n👑 Setting up demo user roles...");
    
    const ADMIN_ROLE = await accessControl.ADMIN_ROLE();
    const VERIFIER_ROLE = await accessControl.VERIFIER_ROLE();
    const BENEFICIARY_ROLE = await accessControl.BENEFICIARY_ROLE();
    const VENDOR_ROLE = await accessControl.VENDOR_ROLE();

    // Grant verifier roles
    for (const verifier of demoData.accounts.verifiers) {
      try {
        await accessControl.grantRole(VERIFIER_ROLE, verifier);
        console.log(`✅ Granted verifier role to: ${verifier}`);
      } catch (error) {
        console.log(`ℹ️ Verifier role already granted: ${verifier}`);
      }
    }

    // Grant beneficiary roles
    for (const beneficiary of demoData.accounts.beneficiaries) {
      try {
        await accessControl.grantRole(BENEFICIARY_ROLE, beneficiary);
        console.log(`✅ Granted beneficiary role to: ${beneficiary}`);
      } catch (error) {
        console.log(`ℹ️ Beneficiary role already granted: ${beneficiary}`);
      }
    }

    // Grant vendor roles
    for (const vendor of demoData.accounts.vendors) {
      try {
        await accessControl.grantRole(VENDOR_ROLE, vendor);
        console.log(`✅ Granted vendor role to: ${vendor}`);
      } catch (error) {
        console.log(`ℹ️ Vendor role already granted: ${vendor}`);
      }
    }

    // 2. Mint demo tokens
    console.log("\n🪙 Minting demo tokens...");
    
    const totalDemoAmount = demoData.donations.reduce((sum, donation) => 
      sum + parseInt(donation.amount), 0
    );
    
    const mintAmount = ethers.parseEther(totalDemoAmount.toString());
    await reliefToken.mint(deployer.address, mintAmount);
    console.log(`✅ Minted ${totalDemoAmount} demo tokens`);

    // 3. Simulate demo donations
    console.log("\n💰 Processing demo donations...");
    
    for (let i = 0; i < demoData.donations.length; i++) {
      const donation = demoData.donations[i];
      const amount = ethers.parseEther(donation.amount);
      
      try {
        // Transfer tokens to donor first (in real scenario, donors would have their own tokens)
        const donorAddress = demoData.accounts.donors[donation.donor];
        await reliefToken.transfer(donorAddress, amount);
        
        // Approve distribution contract
        await reliefToken.approve(reliefDistribution.address, amount);
        
        // Process donation
        await reliefDistribution.donate(amount, donation.message);
        
        console.log(`✅ Processed donation: ${donation.amount} tokens from donor ${donation.donor + 1}`);
      } catch (error) {
        console.log(`⚠️ Demo donation ${i + 1} simulation skipped:`, error.message);
      }
    }

    // 4. Simulate beneficiary approvals
    console.log("\n🏠 Processing demo beneficiary approvals...");
    
    for (let i = 0; i < demoData.applications.length; i++) {
      const application = demoData.applications[i];
      
      if (application.status === 'approved') {
        try {
          const beneficiaryAddress = demoData.accounts.beneficiaries[application.beneficiary];
          const amount = ethers.parseEther(application.requestedAmount);
          
          await reliefDistribution.approveBeneficiary(beneficiaryAddress, amount);
          console.log(`✅ Approved beneficiary ${i + 1}: ${application.requestedAmount} tokens`);
        } catch (error) {
          console.log(`⚠️ Beneficiary approval ${i + 1} simulation skipped:`, error.message);
        }
      }
    }

    // 5. Create demo data file for frontend
    console.log("\n📊 Creating demo data file for frontend...");
    
    const frontendDemoData = {
      ...demoData,
      contracts: {
        accessControl: deploymentInfo.contracts.accessControl.address,
        reliefToken: deploymentInfo.contracts.reliefToken.address,
        reliefDistribution: deploymentInfo.contracts.reliefDistribution.address
      },
      network: networkName,
      setupTimestamp: new Date().toISOString(),
      statistics: {
        totalDonations: totalDemoAmount,
        totalBeneficiaries: demoData.applications.filter(a => a.status === 'approved').length,
        totalVendors: demoData.vendors.length,
        totalTransactions: demoData.transactions.length,
        averageDonation: Math.round(totalDemoAmount / demoData.donations.length),
        disasterTypes: [...new Set(demoData.disasters.map(d => d.type))]
      }
    };

    const demoDataPath = path.join(__dirname, "..", "demo-data.json");
    fs.writeFileSync(demoDataPath, JSON.stringify(frontendDemoData, null, 2));
    console.log(`💾 Demo data saved to demo-data.json`);

    // 6. Create presentation guide
    console.log("\n📋 Creating presentation guide...");
    
    const presentationGuide = `
# 🎭 Hackathon Presentation Guide

## Demo Setup Complete! 

Your blockchain disaster relief system is now loaded with realistic demo data.

### 📊 Demo Statistics
- **Total Donations**: $${totalDemoAmount.toLocaleString()}
- **Active Disasters**: ${demoData.disasters.length}
- **Approved Beneficiaries**: ${demoData.applications.filter(a => a.status === 'approved').length}
- **Verified Vendors**: ${demoData.vendors.length}
- **Completed Transactions**: ${demoData.transactions.length}

### 🎯 Presentation Flow

#### 1. Problem Statement (2 minutes)
- Show current disaster relief challenges
- Highlight lack of transparency and efficiency
- Introduce blockchain solution benefits

#### 2. System Overview (3 minutes)
- Navigate to landing page: http://localhost:5173
- Show "How It Works" page
- Explain multi-role system (donors, beneficiaries, vendors, verifiers, admins)

#### 3. Live Demo - Donor Journey (4 minutes)
- Connect MetaMask with donor account: ${demoData.accounts.donors[0]}
- Navigate to Donor Dashboard
- Show donation interface and make a small donation
- Demonstrate real-time transaction tracking
- Show impact visualization with existing donations

#### 4. Live Demo - Beneficiary Journey (3 minutes)
- Switch to beneficiary account: ${demoData.accounts.beneficiaries[0]}
- Show Beneficiary Dashboard with allocated funds
- Demonstrate spending interface
- Show spending history and remaining balance

#### 5. Live Demo - Transparency Features (3 minutes)
- Navigate to Public Transparency Dashboard (no wallet needed)
- Show aggregate statistics
- Demonstrate transaction search and filtering
- Show fund flow visualization
- Highlight privacy-preserving features

#### 6. Live Demo - Admin/Verifier Features (2 minutes)
- Switch to admin account: ${deployer.address}
- Show Admin Panel with system statistics
- Demonstrate verifier management
- Show fraud monitoring capabilities
- Display real-time WebSocket notifications

#### 7. Technical Highlights (2 minutes)
- Smart contract architecture
- Real-time WebSocket updates
- Fraud detection system
- Role-based access control
- API completeness

#### 8. Q&A and Wrap-up (1 minute)

### 🔧 Demo Accounts

**Admin Account**: ${deployer.address}
**Donor Accounts**: 
${demoData.accounts.donors.map((addr, i) => `  - Donor ${i + 1}: ${addr}`).join('\n')}

**Beneficiary Accounts**:
${demoData.accounts.beneficiaries.map((addr, i) => `  - Beneficiary ${i + 1}: ${addr}`).join('\n')}

**Vendor Accounts**:
${demoData.accounts.vendors.map((addr, i) => `  - Vendor ${i + 1}: ${addr}`).join('\n')}

### 💡 Demo Tips

1. **Keep MetaMask Ready**: Have all demo accounts imported
2. **Show Real-time Features**: Highlight WebSocket notifications
3. **Emphasize Transparency**: Use public dashboard to show openness
4. **Demonstrate Security**: Show role-based access controls
5. **Highlight Innovation**: Point out unique features like fraud detection

### 🚨 Troubleshooting

- If transactions fail, check MetaMask network (should be localhost:8545)
- If balances don't update, refresh the page
- If WebSocket disconnects, check backend server is running
- For any issues, check browser console for errors

### 📱 URLs for Quick Access

- **Frontend**: http://localhost:5173
- **Backend API**: http://localhost:3001
- **API Docs**: http://localhost:3001/api-docs (if available)
- **Blockchain**: http://localhost:8545

Good luck with your presentation! 🚀
`;

    const guideePath = path.join(__dirname, "..", "PRESENTATION_GUIDE.md");
    fs.writeFileSync(guideePath, presentationGuide);
    console.log(`📋 Presentation guide saved to PRESENTATION_GUIDE.md`);

    console.log("\n🎉 Demo setup completed successfully!");
    console.log("📋 Demo Summary:");
    console.log(`├── Disasters: ${demoData.disasters.length} scenarios`);
    console.log(`├── Donations: $${totalDemoAmount.toLocaleString()} in ${demoData.donations.length} donations`);
    console.log(`├── Beneficiaries: ${demoData.applications.length} applications (${demoData.applications.filter(a => a.status === 'approved').length} approved)`);
    console.log(`├── Vendors: ${demoData.vendors.length} registered vendors`);
    console.log(`└── Transactions: ${demoData.transactions.length} completed transactions`);
    
    console.log("\n📝 Next Steps:");
    console.log("1. Review PRESENTATION_GUIDE.md for demo flow");
    console.log("2. Import demo accounts into MetaMask");
    console.log("3. Start frontend and backend servers");
    console.log("4. Practice the demo flow");
    console.log("5. Prepare for questions about technical implementation");

  } catch (error) {
    console.error("❌ Demo setup failed:", error);
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