#!/usr/bin/env node

const { spawn } = require('child_process');
const fs = require('fs');

// ANSI color codes
const colors = {
  reset: '\x1b[0m',
  bright: '\x1b[1m',
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  cyan: '\x1b[36m'
};

const log = (message, color = 'reset') => {
  console.log(`${colors[color]}${message}${colors.reset}`);
};

// Check if port is in use
const isPortInUse = (port) => {
  return new Promise((resolve) => {
    const net = require('net');
    const server = net.createServer();
    
    server.listen(port, () => {
      server.once('close', () => resolve(false));
      server.close();
    });
    
    server.on('error', () => resolve(true));
  });
};

async function main() {
  log('🚀 Simple Start - Frontend & Backend Only', 'bright');
  log('='.repeat(50), 'blue');

  try {
    // Create .env files if they don't exist
    const envFiles = [
      { src: '.env.example', dest: '.env' },
      { src: 'backend/.env.example', dest: 'backend/.env' },
      { src: 'frontend/.env.example', dest: 'frontend/.env' }
    ];

    envFiles.forEach(({ src, dest }) => {
      if (fs.existsSync(src) && !fs.existsSync(dest)) {
        fs.copyFileSync(src, dest);
        log(`✅ Created ${dest}`, 'green');
      }
    });

    // Check ports
    const backendPortBusy = await isPortInUse(3001);
    const frontendPortBusy = await isPortInUse(5173);

    if (backendPortBusy) {
      log('❌ Port 3001 is busy. Please stop the service using it.', 'red');
      process.exit(1);
    }

    if (frontendPortBusy) {
      log('❌ Port 5173 is busy. Please stop the service using it.', 'red');
      process.exit(1);
    }

    log('\n🖥️ Starting backend server...', 'cyan');
    const backendProcess = spawn('npm', ['run', 'dev'], {
      cwd: 'backend',
      stdio: 'inherit',
      shell: true
    });

    // Wait a moment for backend to start
    await new Promise(resolve => setTimeout(resolve, 3000));

    log('\n🌐 Starting frontend server...', 'cyan');
    const frontendProcess = spawn('npm', ['run', 'dev'], {
      cwd: 'frontend',
      stdio: 'inherit',
      shell: true
    });

    // Wait a moment for frontend to start
    await new Promise(resolve => setTimeout(resolve, 3000));

    log('\n🎉 Servers started!', 'green');
    log('='.repeat(50), 'blue');
    log('📱 Frontend: http://localhost:5173', 'cyan');
    log('🖥️ Backend: http://localhost:3001', 'cyan');
    log('='.repeat(50), 'blue');
    log('\n💡 Note: This starts without blockchain. For full features:', 'yellow');
    log('   1. Start a blockchain (npx hardhat node)', 'blue');
    log('   2. Deploy contracts (npm run deploy:local)', 'blue');
    log('   3. Connect MetaMask to localhost:8545', 'blue');
    log('\n🛑 Press Ctrl+C to stop servers', 'yellow');

    // Handle graceful shutdown
    const cleanup = () => {
      log('\n🛑 Stopping servers...', 'yellow');
      backendProcess.kill();
      frontendProcess.kill();
      log('✅ Servers stopped', 'green');
      process.exit(0);
    };

    process.on('SIGINT', cleanup);
    process.on('SIGTERM', cleanup);

    // Keep running
    await new Promise(() => {});

  } catch (error) {
    log(`❌ Error: ${error.message}`, 'red');
    process.exit(1);
  }
}

main().catch(console.error);