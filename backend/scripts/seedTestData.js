import mongoose from 'mongoose';
import dotenv from 'dotenv';
import { ethers } from 'ethers';
import User from '../models/User.js';
import Transaction from '../models/Transaction.js';
import Application from '../models/Application.js';

// Load environment variables
dotenv.config();

const seedTestData = async () => {
  try {
    console.log('🌱 Starting database seeding...');
    
    // Connect to MongoDB
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('✅ Connected to MongoDB');

    // Clear existing data
    await User.deleteMany({});
    await Transaction.deleteMany({});
    await Application.deleteMany({});
    console.log('🧹 Cleared existing data');

    // Create test wallets
    const adminWallet = ethers.Wallet.createRandom();
    const donorWallet1 = ethers.Wallet.createRandom();
    const donorWallet2 = ethers.Wallet.createRandom();
    const beneficiaryWallet1 = ethers.Wallet.createRandom();
    const beneficiaryWallet2 = ethers.Wallet.createRandom();
    const verifierWallet = ethers.Wallet.createRandom();
    const vendorWallet = ethers.Wallet.createRandom();

    // Create test users
    const users = [
      {
        address: adminWallet.address.toLowerCase(),
        role: 'admin',
        profile: {
          name: 'System Administrator',
          email: 'admin@disasterrelief.org',
          verificationStatus: 'verified'
        },
        totalDonated: '0',
        donationCount: 0,
        lastLogin: new Date(),
        loginCount: 15
      },
      {
        address: donorWallet1.address.toLowerCase(),
        role: 'user',
        profile: {
          name: 'Alice Johnson',
          email: 'alice@example.com',
          verificationStatus: 'verified'
        },
        totalDonated: '5750000000000000000', // 5.75 ETH in wei
        donationCount: 3,
        lastLogin: new Date(),
        loginCount: 8,
        lastDonation: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000) // 2 days ago
      },
      {
        address: donorWallet2.address.toLowerCase(),
        role: 'user',
        profile: {
          name: 'Bob Smith',
          email: 'bob@example.com',
          verificationStatus: 'verified'
        },
        totalDonated: '12300000000000000000', // 12.3 ETH in wei
        donationCount: 5,
        lastLogin: new Date(),
        loginCount: 12,
        lastDonation: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000) // 1 day ago
      },
      {
        address: beneficiaryWallet1.address.toLowerCase(),
        role: 'beneficiary',
        profile: {
          name: 'Maria Garcia',
          email: 'maria@example.com',
          verificationStatus: 'verified'
        },
        totalDonated: '0',
        donationCount: 0,
        lastLogin: new Date(),
        loginCount: 5
      },
      {
        address: beneficiaryWallet2.address.toLowerCase(),
        role: 'beneficiary',
        profile: {
          name: 'Ahmed Hassan',
          email: 'ahmed@example.com',
          verificationStatus: 'pending'
        },
        totalDonated: '0',
        donationCount: 0,
        lastLogin: new Date(),
        loginCount: 2
      },
      {
        address: verifierWallet.address.toLowerCase(),
        role: 'verifier',
        profile: {
          name: 'Dr. Sarah Wilson',
          email: 'sarah@relieforg.org',
          verificationStatus: 'verified'
        },
        totalDonated: '0',
        donationCount: 0,
        lastLogin: new Date(),
        loginCount: 25
      },
      {
        address: vendorWallet.address.toLowerCase(),
        role: 'vendor',
        profile: {
          name: 'Emergency Supplies Co.',
          email: 'contact@emergencysupplies.com',
          verificationStatus: 'verified'
        },
        totalDonated: '0',
        donationCount: 0,
        lastLogin: new Date(),
        loginCount: 10
      }
    ];

    const createdUsers = await User.insertMany(users);
    console.log(`✅ Created ${createdUsers.length} test users`);

    // Create test transactions (donations)
    const donations = [
      {
        type: 'donation',
        from: donorWallet1.address.toLowerCase(),
        to: '0x0000000000000000000000000000000000000000', // Contract address placeholder
        amount: '2500000000000000000', // 2.5 ETH in wei
        txHash: '0x' + '1'.repeat(64),
        status: 'confirmed',
        blockNumber: 12345,
        metadata: {
          description: 'Emergency relief donation',
          purpose: 'Disaster relief fund'
        },
        createdAt: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000)
      },
      {
        type: 'donation',
        from: donorWallet1.address.toLowerCase(),
        to: '0x0000000000000000000000000000000000000000',
        amount: '1250000000000000000', // 1.25 ETH in wei
        txHash: '0x' + '2'.repeat(64),
        status: 'confirmed',
        blockNumber: 12346,
        metadata: {
          description: 'Follow-up donation',
          purpose: 'Disaster relief fund'
        },
        createdAt: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000)
      },
      {
        type: 'donation',
        from: donorWallet1.address.toLowerCase(),
        to: '0x0000000000000000000000000000000000000000',
        amount: '2000000000000000000', // 2.0 ETH in wei
        txHash: '0x' + '3'.repeat(64),
        status: 'confirmed',
        blockNumber: 12347,
        metadata: {
          description: 'Additional support donation',
          purpose: 'Disaster relief fund'
        },
        createdAt: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000)
      },
      {
        type: 'donation',
        from: donorWallet2.address.toLowerCase(),
        to: '0x0000000000000000000000000000000000000000',
        amount: '5000000000000000000', // 5.0 ETH in wei
        txHash: '0x' + '4'.repeat(64),
        status: 'confirmed',
        blockNumber: 12348,
        metadata: {
          description: 'Large donation for emergency relief',
          purpose: 'Disaster relief fund'
        },
        createdAt: new Date(Date.now() - 6 * 24 * 60 * 60 * 1000)
      },
      {
        type: 'donation',
        from: donorWallet2.address.toLowerCase(),
        to: '0x0000000000000000000000000000000000000000',
        amount: '3300000000000000000', // 3.3 ETH in wei
        txHash: '0x' + '5'.repeat(64),
        status: 'confirmed',
        blockNumber: 12349,
        metadata: {
          description: 'Community support donation',
          purpose: 'Disaster relief fund'
        },
        createdAt: new Date(Date.now() - 4 * 24 * 60 * 60 * 1000)
      },
      {
        type: 'donation',
        from: donorWallet2.address.toLowerCase(),
        to: '0x0000000000000000000000000000000000000000',
        amount: '4000000000000000000', // 4.0 ETH in wei
        txHash: '0x' + '6'.repeat(64),
        status: 'confirmed',
        blockNumber: 12350,
        metadata: {
          description: 'Recent donation for ongoing relief',
          purpose: 'Disaster relief fund'
        },
        createdAt: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000)
      }
    ];

    // Create spending transactions
    const spendings = [
      {
        type: 'spending',
        from: beneficiaryWallet1.address.toLowerCase(),
        to: vendorWallet.address.toLowerCase(),
        amount: '150000000000000000000', // 150 tokens in wei
        txHash: '0x' + 'a'.repeat(64),
        status: 'confirmed',
        category: 'food',
        blockNumber: 12351,
        metadata: {
          description: 'Emergency food supplies for family',
          purpose: 'Food assistance',
          vendorName: 'Emergency Supplies Co.',
          beneficiaryName: 'Maria Garcia'
        },
        createdAt: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000)
      },
      {
        type: 'spending',
        from: beneficiaryWallet1.address.toLowerCase(),
        to: vendorWallet.address.toLowerCase(),
        amount: '75000000000000000000', // 75 tokens in wei
        txHash: '0x' + 'b'.repeat(64),
        status: 'confirmed',
        category: 'medical',
        blockNumber: 12352,
        metadata: {
          description: 'Basic medical supplies',
          purpose: 'Medical assistance',
          vendorName: 'Emergency Supplies Co.',
          beneficiaryName: 'Maria Garcia'
        },
        createdAt: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000)
      }
    ];

    const allTransactions = [...donations, ...spendings];
    const createdTransactions = await Transaction.insertMany(allTransactions);
    console.log(`✅ Created ${createdTransactions.length} test transactions`);

    // Create test applications
    const applications = [
      {
        applicantAddress: beneficiaryWallet1.address.toLowerCase(),
        disasterType: 'earthquake',
        location: '123 Emergency St, Disaster City, DC 12345',
        requestedAmount: '2000000000000000000000', // 2000 tokens in wei
        description: 'Lost home and belongings in recent earthquake. Family of 4 needs immediate assistance for food, shelter, and basic necessities.',
        documents: [
          {
            filename: 'earthquake_damage_report.pdf',
            originalName: 'Earthquake Damage Assessment Report.pdf',
            mimetype: 'application/pdf',
            size: 1024000,
            verified: true
          },
          {
            filename: 'family_id_documents.pdf',
            originalName: 'Family ID Documents.pdf',
            mimetype: 'application/pdf',
            size: 512000,
            verified: true
          }
        ],
        status: 'approved',
        verifierAddress: verifierWallet.address.toLowerCase(),
        reviewNotes: 'Application verified. Family situation confirmed through local authorities. Approved for emergency assistance.',
        reviewedAt: new Date(Date.now() - 8 * 24 * 60 * 60 * 1000),
        approvedAmount: '1500000000000000000000', // 1500 tokens in wei
        priority: 'high',
        metadata: {
          familySize: 4,
          hasChildren: true,
          hasElderly: false,
          hasDisabled: false,
          previouslyReceived: false,
          emergencyContact: {
            name: 'Carlos Garcia',
            phone: '+1234567891',
            relationship: 'Brother'
          }
        }
      },
      {
        applicantAddress: beneficiaryWallet2.address.toLowerCase(),
        disasterType: 'flood',
        location: '456 Relief Ave, Crisis Town, CT 54321',
        requestedAmount: '3000000000000000000000', // 3000 tokens in wei
        description: 'Displaced family due to regional flooding. Seeking assistance for temporary shelter and basic needs for 6 family members including 3 children.',
        documents: [
          {
            filename: 'displacement_certificate.pdf',
            originalName: 'Official Displacement Certificate.pdf',
            mimetype: 'application/pdf',
            size: 768000,
            verified: false
          },
          {
            filename: 'family_documents.pdf',
            originalName: 'Family Registration Documents.pdf',
            mimetype: 'application/pdf',
            size: 640000,
            verified: false
          }
        ],
        status: 'pending',
        priority: 'urgent',
        metadata: {
          familySize: 6,
          hasChildren: true,
          hasElderly: true,
          hasDisabled: false,
          previouslyReceived: false,
          emergencyContact: {
            name: 'Fatima Hassan',
            phone: '+1987654322',
            relationship: 'Sister'
          }
        }
      },
      {
        applicantAddress: ethers.Wallet.createRandom().address.toLowerCase(),
        disasterType: 'wildfire',
        location: '789 Hope Street, Recovery City, RC 98765',
        requestedAmount: '1200000000000000000000', // 1200 tokens in wei
        description: 'Home destroyed in wildfire. Lost job due to evacuation and need assistance with temporary housing and basic living expenses.',
        documents: [
          {
            filename: 'fire_damage_report.pdf',
            originalName: 'Fire Damage Assessment.pdf',
            mimetype: 'application/pdf',
            size: 896000,
            verified: true
          }
        ],
        status: 'rejected',
        verifierAddress: verifierWallet.address.toLowerCase(),
        reviewNotes: 'Insufficient documentation provided. Property ownership records do not match the claimed address. Please resubmit with proper documentation.',
        reviewedAt: new Date(Date.now() - 18 * 24 * 60 * 60 * 1000),
        priority: 'medium',
        metadata: {
          familySize: 2,
          hasChildren: false,
          hasElderly: false,
          hasDisabled: false,
          previouslyReceived: true,
          emergencyContact: {
            name: 'Michael Lee',
            phone: '+1456789124',
            relationship: 'Spouse'
          }
        }
      }
    ];

    const createdApplications = await Application.insertMany(applications);
    console.log(`✅ Created ${createdApplications.length} test applications`);

    // Print summary
    console.log('\n🎉 Test data seeding completed successfully!');
    console.log('\n📊 Summary:');
    console.log(`👥 Users: ${createdUsers.length}`);
    console.log(`💰 Transactions: ${createdTransactions.length}`);
    console.log(`📋 Applications: ${createdApplications.length}`);
    
    console.log('\n🔑 Test Wallet Addresses:');
    console.log(`Admin: ${adminWallet.address}`);
    console.log(`Donor 1: ${donorWallet1.address}`);
    console.log(`Donor 2: ${donorWallet2.address}`);
    console.log(`Beneficiary 1: ${beneficiaryWallet1.address}`);
    console.log(`Beneficiary 2: ${beneficiaryWallet2.address}`);
    console.log(`Verifier: ${verifierWallet.address}`);
    console.log(`Vendor: ${vendorWallet.address}`);

    console.log('\n💡 You can now test the API endpoints with these addresses!');

  } catch (error) {
    console.error('❌ Error seeding test data:', error);
  } finally {
    await mongoose.disconnect();
    console.log('🔌 Disconnected from MongoDB');
    process.exit(0);
  }
};

// Run the seeding script
seedTestData();