#!/usr/bin/env node

const fs = require('fs');
const path = require('path');

// ANSI color codes
const colors = {
  reset: '\x1b[0m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  cyan: '\x1b[36m',
  bright: '\x1b[1m'
};

const log = (message, color = 'reset') => {
  console.log(`${colors[color]}${message}${colors.reset}`);
};

function main() {
  log('🔍 Startup Verification - Blockchain Disaster Relief System', 'bright');
  log('='.repeat(60), 'blue');

  // Check if all required files exist for startup
  const startupChecks = [
    {
      name: 'Start Script',
      file: 'start.js',
      required: true
    },
    {
      name: 'Backend Server',
      file: 'backend/server.js',
      required: true
    },
    {
      name: 'Frontend Package',
      file: 'frontend/package.json',
      required: true
    },
    {
      name: 'Smart Contracts',
      file: 'contracts/AccessControl.sol',
      required: true
    },
    {
      name: 'Environment Templates',
      file: '.env.example',
      required: true
    },
    {
      name: 'WebSocket Service',
      file: 'backend/services/websocket.js',
      required: true
    },
    {
      name: 'Deployment Scripts',
      file: 'scripts/deploy.js',
      required: true
    }
  ];

  let allGood = true;

  log('\n🔧 Checking startup requirements...', 'cyan');
  log('-'.repeat(40), 'blue');

  startupChecks.forEach(check => {
    const exists = fs.existsSync(check.file);
    const status = exists ? '✅' : (check.required ? '❌' : '⚠️');
    log(`${check.name}: ${status}`);
    
    if (!exists && check.required) {
      allGood = false;
    }
  });

  log('\n📋 Startup Instructions:', 'cyan');
  log('-'.repeat(40), 'blue');

  if (allGood) {
    log('🎉 System is ready to start!', 'green');
    log('\n🚀 To start the complete system:', 'cyan');
    log('   npm start', 'blue');
    log('\n📝 This will:', 'cyan');
    log('   • Check system requirements', 'blue');
    log('   • Install dependencies (if needed)', 'blue');
    log('   • Start local blockchain', 'blue');
    log('   • Deploy smart contracts', 'blue');
    log('   • Start backend server', 'blue');
    log('   • Start frontend development server', 'blue');
    
    log('\n🌐 Access points:', 'cyan');
    log('   • Frontend: http://localhost:5173', 'blue');
    log('   • Backend API: http://localhost:3001', 'blue');
    log('   • Blockchain: http://localhost:8545', 'blue');
    
    log('\n🎭 For demo presentation:', 'cyan');
    log('   npm run demo-setup    # Set up demo data', 'blue');
    log('   npm run quick-check   # Verify system health', 'blue');
    
  } else {
    log('❌ System has missing required files', 'yellow');
    log('   Please ensure all files are present before starting', 'yellow');
  }

  log('\n💡 Troubleshooting:', 'cyan');
  log('   • If ports are busy, stop other services', 'blue');
  log('   • If MetaMask issues, check network settings', 'blue');
  log('   • If database issues, ensure MongoDB is running', 'blue');
  log('   • Check README.md for detailed instructions', 'blue');

  log('\n📚 Documentation:', 'cyan');
  log('   • README.md - Complete setup guide', 'blue');
  log('   • API.md - API documentation', 'blue');
  log('   • PRESENTATION_GUIDE.md - Demo instructions (after demo-setup)', 'blue');

  return allGood;
}

if (require.main === module) {
  const success = main();
  process.exit(success ? 0 : 1);
}

module.exports = { main };