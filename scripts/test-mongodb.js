#!/usr/bin/env node

const mongoose = require('mongoose');

// ANSI color codes
const colors = {
  reset: '\x1b[0m',
  green: '\x1b[32m',
  red: '\x1b[31m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  cyan: '\x1b[36m'
};

const log = (message, color = 'reset') => {
  console.log(`${colors[color]}${message}${colors.reset}`);
};

async function testMongoDB() {
  const mongoUri = 'mongodb+srv://parthnagar:parth123@eib.ttjeoal.mongodb.net/?appName=eib';
  
  log('🔍 Testing MongoDB Atlas Connection...', 'cyan');
  log(`📍 URI: ${mongoUri.replace(/:[^:@]*@/, ':****@')}`, 'blue');
  
  try {
    log('\n⏳ Connecting to MongoDB Atlas...', 'yellow');
    
    // Set connection timeout
    const connection = await mongoose.connect(mongoUri, {
      serverSelectionTimeoutMS: 10000, // 10 seconds timeout
      connectTimeoutMS: 10000,
      socketTimeoutMS: 10000,
    });
    
    log('✅ Successfully connected to MongoDB Atlas!', 'green');
    
    // Test database operations
    log('\n🧪 Testing database operations...', 'cyan');
    
    // Get database info
    const db = mongoose.connection.db;
    const admin = db.admin();
    const dbStats = await admin.ping();
    
    log('✅ Database ping successful!', 'green');
    
    // List databases
    const databases = await admin.listDatabases();
    log(`📊 Available databases: ${databases.databases.length}`, 'blue');
    
    // Test creating a collection
    const testCollection = db.collection('connection_test');
    await testCollection.insertOne({ 
      test: true, 
      timestamp: new Date(),
      message: 'Connection test successful' 
    });
    
    log('✅ Test document inserted successfully!', 'green');
    
    // Clean up test document
    await testCollection.deleteOne({ test: true });
    log('✅ Test document cleaned up!', 'green');
    
    log('\n🎉 MongoDB Atlas connection is working perfectly!', 'green');
    log('💡 You can use this connection in your application.', 'blue');
    
    await mongoose.disconnect();
    log('✅ Disconnected from MongoDB Atlas', 'green');
    
    return true;
    
  } catch (error) {
    log('\n❌ MongoDB connection failed!', 'red');
    log(`📝 Error: ${error.message}`, 'red');
    
    if (error.message.includes('IP')) {
      log('\n💡 Possible solutions:', 'yellow');
      log('   1. Add your IP address to MongoDB Atlas whitelist', 'blue');
      log('   2. Use 0.0.0.0/0 to allow all IPs (for development)', 'blue');
      log('   3. Check your network/firewall settings', 'blue');
    } else if (error.message.includes('authentication')) {
      log('\n💡 Possible solutions:', 'yellow');
      log('   1. Check username and password', 'blue');
      log('   2. Verify database user permissions', 'blue');
    } else if (error.message.includes('timeout')) {
      log('\n💡 Possible solutions:', 'yellow');
      log('   1. Check your internet connection', 'blue');
      log('   2. Try again in a few moments', 'blue');
      log('   3. Check if MongoDB Atlas is accessible', 'blue');
    }
    
    await mongoose.disconnect().catch(() => {});
    return false;
  }
}

// Run the test
testMongoDB()
  .then((success) => {
    process.exit(success ? 0 : 1);
  })
  .catch((error) => {
    log(`💥 Unexpected error: ${error.message}`, 'red');
    process.exit(1);
  });