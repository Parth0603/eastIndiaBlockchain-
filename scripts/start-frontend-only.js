#!/usr/bin/env node

const { spawn } = require('child_process');
const fs = require('fs');

// ANSI color codes
const colors = {
  reset: '\x1b[0m',
  bright: '\x1b[1m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  cyan: '\x1b[36m'
};

const log = (message, color = 'reset') => {
  console.log(`${colors[color]}${message}${colors.reset}`);
};

async function main() {
  log('🌐 Frontend Only Start - Quick Demo', 'bright');
  log('='.repeat(50), 'blue');

  try {
    // Create frontend .env if it doesn't exist
    if (fs.existsSync('frontend/.env.example') && !fs.existsSync('frontend/.env')) {
      fs.copyFileSync('frontend/.env.example', 'frontend/.env');
      log('✅ Created frontend/.env', 'green');
    }

    log('\n🌐 Starting frontend server...', 'cyan');
    const frontendProcess = spawn('npm', ['run', 'dev'], {
      cwd: 'frontend',
      stdio: 'inherit',
      shell: true
    });

    log('\n🎉 Frontend started!', 'green');
    log('='.repeat(50), 'blue');
    log('📱 Frontend: http://localhost:5173', 'cyan');
    log('='.repeat(50), 'blue');
    log('\n💡 This is frontend-only mode:', 'yellow');
    log('   - You can see the UI and design', 'blue');
    log('   - Backend features won\'t work', 'blue');
    log('   - Perfect for UI/UX demonstration', 'blue');
    log('\n🛑 Press Ctrl+C to stop', 'yellow');

    // Handle graceful shutdown
    const cleanup = () => {
      log('\n🛑 Stopping frontend...', 'yellow');
      frontendProcess.kill();
      log('✅ Frontend stopped', 'green');
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