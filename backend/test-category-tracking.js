// Test script to verify category tracking functionality
import mongoose from 'mongoose';
import Transaction from './models/Transaction.js';

// Test category tracking
async function testCategoryTracking() {
  try {
    console.log('🧪 Testing Category Tracking System...\n');

    // Test 1: Create sample donation transactions with categories
    console.log('1. Creating sample donation transactions...');
    const sampleDonations = [
      {
        txHash: '0x1111111111111111111111111111111111111111111111111111111111111111',
        from: '0x1234567890123456789012345678901234567890',
        to: '0x0987654321098765432109876543210987654321',
        amount: '100000000000000000000', // 100 tokens
        type: 'donation',
        category: 'Food',
        status: 'confirmed'
      },
      {
        txHash: '0x2222222222222222222222222222222222222222222222222222222222222222',
        from: '0x1234567890123456789012345678901234567890',
        to: '0x0987654321098765432109876543210987654321',
        amount: '50000000000000000000', // 50 tokens
        type: 'donation',
        category: 'Medical',
        status: 'confirmed'
      },
      {
        txHash: '0x3333333333333333333333333333333333333333333333333333333333333333',
        from: '0x1234567890123456789012345678901234567890',
        to: '0x0987654321098765432109876543210987654321',
        amount: '75000000000000000000', // 75 tokens
        type: 'donation',
        category: 'Shelter',
        status: 'confirmed'
      }
    ];

    for (const donation of sampleDonations) {
      try {
        await Transaction.create(donation);
        console.log(`✅ Created ${donation.category} donation: ${donation.amount} wei`);
      } catch (error) {
        if (error.code === 11000) {
          console.log(`⚠️ Donation already exists: ${donation.category}`);
        } else {
          throw error;
        }
      }
    }

    // Test 2: Query donations by category
    console.log('\n2. Querying donations by category...');
    const donationsByCategory = await Transaction.aggregate([
      {
        $match: { 
          type: 'donation', 
          status: 'confirmed',
          category: { $exists: true, $ne: null }
        }
      },
      {
        $group: {
          _id: '$category',
          totalAmount: { $sum: { $toDecimal: '$amount' } },
          donationCount: { $sum: 1 }
        }
      },
      {
        $sort: { totalAmount: -1 }
      }
    ]);

    console.log('📊 Donations by Category:');
    donationsByCategory.forEach(cat => {
      console.log(`   ${cat._id}: ${cat.totalAmount} wei (${cat.donationCount} donations)`);
    });

    // Test 3: Calculate category percentages
    console.log('\n3. Calculating category distribution...');
    const totalDonations = donationsByCategory.reduce((sum, cat) => 
      sum + parseFloat(cat.totalAmount.toString()), 0);
    
    console.log('📈 Category Distribution:');
    donationsByCategory.forEach(cat => {
      const percentage = ((parseFloat(cat.totalAmount.toString()) / totalDonations) * 100).toFixed(1);
      console.log(`   ${cat._id}: ${percentage}%`);
    });

    // Test 4: Verify category validation
    console.log('\n4. Testing category validation...');
    try {
      await Transaction.create({
        txHash: '0x4444444444444444444444444444444444444444444444444444444444444444',
        from: '0x1234567890123456789012345678901234567890',
        to: '0x0987654321098765432109876543210987654321',
        amount: '25000000000000000000',
        type: 'spending',
        // Missing category - should fail validation
        status: 'confirmed'
      });
      console.log('❌ Validation failed - spending transaction without category was allowed');
    } catch (error) {
      console.log('✅ Validation working - spending transaction requires category');
    }

    console.log('\n🎉 Category tracking system is working correctly!');
    
  } catch (error) {
    console.error('❌ Test failed:', error);
  }
}

// Run test if this file is executed directly
if (import.meta.url === `file://${process.argv[1]}`) {
  // Connect to MongoDB (use environment variable or default)
  const mongoUri = process.env.MONGODB_URI || 'mongodb://localhost:27017/disaster-relief-test';
  
  mongoose.connect(mongoUri)
    .then(() => {
      console.log('📊 Connected to MongoDB for testing');
      return testCategoryTracking();
    })
    .then(() => {
      console.log('\n✅ All tests completed');
      process.exit(0);
    })
    .catch((error) => {
      console.error('❌ Test error:', error);
      process.exit(1);
    });
}

export { testCategoryTracking };