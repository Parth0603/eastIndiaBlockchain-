#!/usr/bin/env node

const { spawn } = require('child_process');
const fs = require('fs');
const path = require('path');
const net = require('net');

// ANSI color codes for console output
const colors = {
  reset: '\x1b[0m',
  bright: '\x1b[1m',
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  magenta: '\x1b[35m',
  cyan: '\x1b[36m'
};

// Helper function to log with colors
const log = (message, color = 'reset') => {
  console.log(`${colors[color]}${message}${colors.reset}`);
};

// Helper function to check if a file exists
const fileExists = (filePath) => {
  return fs.existsSync(filePath);
};

// Helper function to check if a directory exists
const dirExists = (dirPath) => {
  return fs.existsSync(dirPath) && fs.statSync(dirPath).isDirectory();
};

// Helper function to check if a port is in use
const isPortInUse = (port) => {
  return new Promise((resolve) => {
    const net = require('net');
    const server = net.createServer();
    
    server.listen(port, () => {
      server.once('close', () => {
        resolve(false); // Port is available
      });
      server.close();
    });
    
    server.on('error', () => {
      resolve(true); // Port is in use
    });
  });
};

// Helper function to run a command with timeout
const runCommandWithTimeout = (command, args, options = {}, timeoutMs = 30000) => {
  return new Promise((resolve, reject) => {
    const child = spawn(command, args, {
      stdio: 'inherit',
      shell: true,
      ...options
    });

    const timeout = setTimeout(() => {
      child.kill();
      reject(new Error(`Command timed out after ${timeoutMs}ms`));
    }, timeoutMs);

    child.on('close', (code) => {
      clearTimeout(timeout);
      if (code === 0) {
        resolve();
      } else {
        reject(new Error(`Command failed with exit code ${code}`));
      }
    });

    child.on('error', (error) => {
      clearTimeout(timeout);
      reject(error);
    });
  });
};

// Check system requirements
const checkRequirements = () => {
  log('\n🔍 Checking system requirements...', 'cyan');

  // Check Node.js version
  const nodeVersion = process.version;
  const majorVersion = parseInt(nodeVersion.slice(1).split('.')[0]);
  
  if (majorVersion < 18) {
    log(`❌ Node.js version ${nodeVersion} is not supported. Please use Node.js 18 or higher.`, 'red');
    process.exit(1);
  }
  log(`✅ Node.js version: ${nodeVersion}`, 'green');

  // Check if npm is available
  try {
    require('child_process').execSync('npm --version', { stdio: 'ignore' });
    log('✅ npm is available', 'green');
  } catch (error) {
    log('❌ npm is not available', 'red');
    process.exit(1);
  }

  // Check if required directories exist
  const requiredDirs = ['backend', 'frontend', 'contracts', 'scripts'];
  for (const dir of requiredDirs) {
    if (!dirExists(dir)) {
      log(`❌ Required directory missing: ${dir}`, 'red');
      process.exit(1);
    }
  }
  log('✅ All required directories found', 'green');

  // Check if package.json files exist
  const packageFiles = ['package.json', 'backend/package.json', 'frontend/package.json'];
  for (const file of packageFiles) {
    if (!fileExists(file)) {
      log(`❌ Required file missing: ${file}`, 'red');
      process.exit(1);
    }
  }
  log('✅ All package.json files found', 'green');
};

// Install dependencies
const installDependencies = async () => {
  log('\n📦 Installing dependencies...', 'cyan');

  try {
    // Install root dependencies
    log('Installing root dependencies...', 'yellow');
    await runCommandWithTimeout('npm', ['install'], {}, 60000);

    // Install backend dependencies
    log('Installing backend dependencies...', 'yellow');
    await runCommandWithTimeout('npm', ['install'], { cwd: 'backend' }, 60000);

    // Install frontend dependencies
    log('Installing frontend dependencies...', 'yellow');
    await runCommandWithTimeout('npm', ['install'], { cwd: 'frontend' }, 60000);

    log('✅ All dependencies installed successfully', 'green');
  } catch (error) {
    log(`❌ Failed to install dependencies: ${error.message}`, 'red');
    process.exit(1);
  }
};

// Check environment configuration
const checkEnvironment = () => {
  log('\n⚙️ Checking environment configuration...', 'cyan');

  // Check if .env files exist
  const envFiles = ['.env', 'backend/.env', 'frontend/.env'];
  const missingEnvFiles = envFiles.filter(file => !fileExists(file));

  if (missingEnvFiles.length > 0) {
    log('⚠️ Missing environment files:', 'yellow');
    missingEnvFiles.forEach(file => {
      log(`   - ${file}`, 'yellow');
    });
    log('\n💡 Creating environment files from templates...', 'blue');

    // Copy .env.example files
    envFiles.forEach(envFile => {
      const exampleFile = `${envFile}.example`;
      if (fileExists(exampleFile) && !fileExists(envFile)) {
        fs.copyFileSync(exampleFile, envFile);
        log(`✅ Created ${envFile} from ${exampleFile}`, 'green');
      }
    });

    log('\n📝 Please edit the .env files with your configuration before continuing.', 'yellow');
    log('   Especially important:', 'yellow');
    log('   - MongoDB connection string', 'yellow');
    log('   - JWT secret', 'yellow');
    log('   - Smart contract addresses (after deployment)', 'yellow');
  } else {
    log('✅ All environment files found', 'green');
  }
};

// Start local blockchain
const startBlockchain = async () => {
  log('\n⛓️ Starting local blockchain...', 'cyan');
  
  try {
    // Check if port 8545 is already in use
    const port8545InUse = await isPortInUse(8545);
    if (port8545InUse) {
      log('⚠️ Port 8545 is already in use. Checking if it\'s a blockchain...', 'yellow');
      
      // Try to connect to existing blockchain
      try {
        const { ethers } = require('ethers');
        const provider = new ethers.JsonRpcProvider('http://localhost:8545');
        await provider.getNetwork();
        log('✅ Found existing blockchain on port 8545, using it', 'green');
        return null; // No process to return, using existing blockchain
      } catch (error) {
        log('❌ Port 8545 is busy but not a blockchain. Please free the port.', 'red');
        throw new Error('Port 8545 is occupied by another service');
      }
    }

    log('Starting Hardhat node...', 'yellow');
    const hardhatProcess = spawn('npx', ['hardhat', 'node'], {
      stdio: 'pipe',
      shell: true
    });

    // Wait for blockchain to start with shorter timeout
    await new Promise((resolve, reject) => {
      let output = '';
      const timeout = setTimeout(() => {
        hardhatProcess.kill();
        reject(new Error('Blockchain startup timeout (15s)'));
      }, 15000); // Reduced timeout

      hardhatProcess.stdout.on('data', (data) => {
        const dataStr = data.toString();
        output += dataStr;
        
        // More flexible detection
        if (dataStr.includes('Started HTTP') || 
            dataStr.includes('Listening on') || 
            dataStr.includes('127.0.0.1:8545')) {
          clearTimeout(timeout);
          resolve();
        }
      });

      hardhatProcess.stderr.on('data', (data) => {
        const errorStr = data.toString();
        if (errorStr.includes('EADDRINUSE') || errorStr.includes('address already in use')) {
          clearTimeout(timeout);
          reject(new Error('Port 8545 is already in use'));
        }
      });

      hardhatProcess.on('error', (error) => {
        clearTimeout(timeout);
        reject(error);
      });

      hardhatProcess.on('exit', (code) => {
        if (code !== 0) {
          clearTimeout(timeout);
          reject(new Error(`Hardhat node exited with code ${code}`));
        }
      });
    });

    log('✅ Local blockchain started successfully', 'green');
    return hardhatProcess;
  } catch (error) {
    log(`⚠️ Blockchain startup issue: ${error.message}`, 'yellow');
    log('💡 Continuing without local blockchain - you can use an external one', 'blue');
    return null; // Continue without blockchain
  }
};

// Deploy smart contracts
const deployContracts = async () => {
  log('\n📋 Deploying smart contracts...', 'cyan');

  try {
    log('Deploying contracts to local network...', 'yellow');
    await runCommandWithTimeout('npx', ['hardhat', 'run', 'scripts/deploy.js', '--network', 'localhost'], {}, 60000);

    log('Setting up initial configuration...', 'yellow');
    await runCommandWithTimeout('npx', ['hardhat', 'run', 'scripts/setup.js', '--network', 'localhost'], {}, 30000);

    log('✅ Smart contracts deployed and configured', 'green');
  } catch (error) {
    log(`⚠️ Contract deployment issue: ${error.message}`, 'yellow');
    log('💡 Continuing without contract deployment - you can deploy manually later', 'blue');
    // Don't throw error, continue without contracts
  }
};

// Test MongoDB connection
const testMongoDB = async () => {
  log('\n🗄️ Testing MongoDB connection...', 'cyan');
  
  try {
    const { spawn } = require('child_process');
    await new Promise((resolve, reject) => {
      const testProcess = spawn('node', ['scripts/test-mongodb.js'], {
        stdio: 'pipe',
        shell: true
      });

      let output = '';
      testProcess.stdout.on('data', (data) => {
        output += data.toString();
      });

      testProcess.on('close', (code) => {
        if (code === 0) {
          log('✅ MongoDB connection test passed', 'green');
          resolve();
        } else {
          reject(new Error('MongoDB connection test failed'));
        }
      });

      testProcess.on('error', (error) => {
        reject(error);
      });
    });
  } catch (error) {
    log(`⚠️ MongoDB connection issue: ${error.message}`, 'yellow');
    log('💡 Backend will start in degraded mode without database', 'blue');
    // Don't throw error, continue without MongoDB
  }
};

// Start backend server
const startBackend = async () => {
  log('\n🖥️ Starting backend server...', 'cyan');

  // Check if port 3001 is in use
  const port3001InUse = await isPortInUse(3001);
  if (port3001InUse) {
    log('⚠️ Port 3001 is already in use. Please stop the service using it.', 'yellow');
    throw new Error('Port 3001 is occupied');
  }

  const backendProcess = spawn('npm', ['run', 'dev'], {
    cwd: 'backend',
    stdio: 'pipe',
    shell: true
  });

  // Wait for backend to start with better detection
  await new Promise((resolve, reject) => {
    let output = '';
    const timeout = setTimeout(() => {
      backendProcess.kill();
      reject(new Error('Backend startup timeout (20s)'));
    }, 20000);

    backendProcess.stdout.on('data', (data) => {
      const dataStr = data.toString();
      output += dataStr;
      
      // More flexible detection
      if (dataStr.includes('Server running') || 
          dataStr.includes('listening on') || 
          dataStr.includes('3001')) {
        clearTimeout(timeout);
        resolve();
      }
    });

    backendProcess.stderr.on('data', (data) => {
      const errorOutput = data.toString();
      if (errorOutput.includes('EADDRINUSE')) {
        clearTimeout(timeout);
        reject(new Error('Port 3001 is already in use'));
      }
    });

    backendProcess.on('error', (error) => {
      clearTimeout(timeout);
      reject(error);
    });
  });

  log('✅ Backend server started successfully', 'green');
  return backendProcess;
};

// Start frontend server
const startFrontend = async () => {
  log('\n🌐 Starting frontend server...', 'cyan');

  // Check if port 5173 is in use
  const port5173InUse = await isPortInUse(5173);
  if (port5173InUse) {
    log('⚠️ Port 5173 is already in use. Please stop the service using it.', 'yellow');
    throw new Error('Port 5173 is occupied');
  }

  const frontendProcess = spawn('npm', ['run', 'dev'], {
    cwd: 'frontend',
    stdio: 'pipe',
    shell: true
  });

  // Wait for frontend to start with better detection
  await new Promise((resolve, reject) => {
    let output = '';
    const timeout = setTimeout(() => {
      frontendProcess.kill();
      reject(new Error('Frontend startup timeout (20s)'));
    }, 20000);

    frontendProcess.stdout.on('data', (data) => {
      const dataStr = data.toString();
      output += dataStr;
      
      // More flexible detection
      if (dataStr.includes('Local:') || 
          dataStr.includes('localhost:5173') || 
          dataStr.includes('ready in')) {
        clearTimeout(timeout);
        resolve();
      }
    });

    frontendProcess.stderr.on('data', (data) => {
      const errorOutput = data.toString();
      if (errorOutput.includes('EADDRINUSE')) {
        clearTimeout(timeout);
        reject(new Error('Port 5173 is already in use'));
      }
    });

    frontendProcess.on('error', (error) => {
      clearTimeout(timeout);
      reject(error);
    });
  });

  log('✅ Frontend server started successfully', 'green');
  return frontendProcess;
};

// Main function
const main = async () => {
  log('🌍 Blockchain Disaster Relief System Startup', 'bright');
  log('='.repeat(50), 'blue');

  const args = process.argv.slice(2);
  const skipInstall = args.includes('--skip-install');
  const skipBlockchain = args.includes('--skip-blockchain');
  const skipDeploy = args.includes('--skip-deploy');

  try {
    // Check system requirements
    checkRequirements();

    // Install dependencies (unless skipped)
    if (!skipInstall) {
      await installDependencies();
    } else {
      log('\n⏭️ Skipping dependency installation', 'yellow');
    }

    // Check environment configuration
    checkEnvironment();

    // Test MongoDB connection
    await testMongoDB();

    let blockchainProcess, backendProcess, frontendProcess;

    // Start local blockchain (unless skipped)
    if (!skipBlockchain) {
      blockchainProcess = await startBlockchain();
      
      // Deploy contracts (unless skipped)
      if (!skipDeploy) {
        await deployContracts();
      } else {
        log('\n⏭️ Skipping contract deployment', 'yellow');
      }
    } else {
      log('\n⏭️ Skipping blockchain startup', 'yellow');
    }

    // Start backend server
    backendProcess = await startBackend();

    // Start frontend server
    frontendProcess = await startFrontend();

    // Success message
    log('\n🎉 System started successfully!', 'green');
    log('='.repeat(50), 'blue');
    log('📱 Frontend: http://localhost:5173', 'cyan');
    log('🖥️ Backend API: http://localhost:3001', 'cyan');
    if (!skipBlockchain) {
      log('⛓️ Blockchain: http://localhost:8545', 'cyan');
    }
    log('='.repeat(50), 'blue');
    log('\n💡 Tips:', 'yellow');
    log('   - Connect MetaMask to localhost:8545', 'blue');
    log('   - Import test accounts from Hardhat node', 'blue');
    log('   - Check the README.md for detailed usage instructions', 'blue');
    log('\n🛑 Press Ctrl+C to stop all services', 'yellow');

    // Handle graceful shutdown
    const cleanup = () => {
      log('\n🛑 Shutting down services...', 'yellow');
      
      if (frontendProcess) {
        frontendProcess.kill();
        log('✅ Frontend server stopped', 'green');
      }
      
      if (backendProcess) {
        backendProcess.kill();
        log('✅ Backend server stopped', 'green');
      }
      
      if (blockchainProcess) {
        blockchainProcess.kill();
        log('✅ Blockchain stopped', 'green');
      }
      
      log('👋 Goodbye!', 'cyan');
      process.exit(0);
    };

    process.on('SIGINT', cleanup);
    process.on('SIGTERM', cleanup);

    // Keep the process running
    await new Promise(() => {});

  } catch (error) {
    log(`\n❌ Startup failed: ${error.message}`, 'red');
    log('\n💡 Troubleshooting tips:', 'yellow');
    log('   - Make sure MongoDB is running', 'blue');
    log('   - Check that ports 3001, 5173, and 8545 are available', 'blue');
    log('   - Verify all dependencies are installed', 'blue');
    log('   - Check the logs above for specific error details', 'blue');
    process.exit(1);
  }
};

// Show help
const showHelp = () => {
  log('🌍 Blockchain Disaster Relief System Startup Script', 'bright');
  log('\nUsage: node start.js [options]', 'cyan');
  log('\nOptions:', 'yellow');
  log('  --skip-install     Skip dependency installation', 'blue');
  log('  --skip-blockchain  Skip local blockchain startup', 'blue');
  log('  --skip-deploy      Skip smart contract deployment', 'blue');
  log('  --help            Show this help message', 'blue');
  log('\nExamples:', 'yellow');
  log('  node start.js                    # Full startup', 'blue');
  log('  node start.js --skip-install    # Skip npm install', 'blue');
  log('  node start.js --skip-blockchain # Use external blockchain', 'blue');
};

// Handle command line arguments
if (process.argv.includes('--help') || process.argv.includes('-h')) {
  showHelp();
  process.exit(0);
}

// Run the main function
main().catch((error) => {
  log(`\n💥 Unexpected error: ${error.message}`, 'red');
  process.exit(1);
});