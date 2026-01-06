#!/usr/bin/env node

const { spawn } = require('child_process');
const fs = require('fs');
const path = require('path');

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

// Helper function to run a command and capture output
const runCommand = (command, args, options = {}) => {
  return new Promise((resolve, reject) => {
    const child = spawn(command, args, {
      stdio: 'pipe',
      shell: true,
      ...options
    });

    let stdout = '';
    let stderr = '';

    child.stdout.on('data', (data) => {
      stdout += data.toString();
    });

    child.stderr.on('data', (data) => {
      stderr += data.toString();
    });

    child.on('close', (code) => {
      resolve({
        code,
        stdout,
        stderr,
        success: code === 0
      });
    });

    child.on('error', (error) => {
      reject(error);
    });
  });
};

// Test suite configurations
const testSuites = [
  {
    name: 'Smart Contract Tests',
    command: 'npx',
    args: ['hardhat', 'test'],
    cwd: '.',
    timeout: 120000, // 2 minutes
    required: true
  },
  {
    name: 'Backend Unit Tests',
    command: 'npm',
    args: ['test'],
    cwd: 'backend',
    timeout: 60000, // 1 minute
    required: true
  },
  {
    name: 'Backend Integration Tests',
    command: 'npm',
    args: ['run', 'test:integration'],
    cwd: 'backend',
    timeout: 180000, // 3 minutes
    required: false // Optional if not implemented
  },
  {
    name: 'Frontend Unit Tests',
    command: 'npm',
    args: ['test'],
    cwd: 'frontend',
    timeout: 30000, // Reduced to 30 seconds
    required: true
  },
  {
    name: 'Frontend Property Tests',
    command: 'npm',
    args: ['run', 'test:properties'],
    cwd: 'frontend',
    timeout: 45000, // 45 seconds
    required: false // Optional if not implemented
  },
  {
    name: 'End-to-End Integration Tests',
    command: 'npm',
    args: ['test'],
    cwd: 'test',
    timeout: 120000, // 2 minutes
    required: false // Optional - requires full system setup
  }
];

// Linting configurations
const lintSuites = [
  {
    name: 'Smart Contract Linting',
    command: 'npx',
    args: ['solhint', 'contracts/**/*.sol'],
    cwd: '.',
    required: false
  },
  {
    name: 'Backend Linting',
    command: 'npm',
    args: ['run', 'lint'],
    cwd: 'backend',
    required: false
  },
  {
    name: 'Frontend Linting',
    command: 'npm',
    args: ['run', 'lint'],
    cwd: 'frontend',
    required: false
  }
];

// System checks
const systemChecks = [
  {
    name: 'Node.js Version',
    check: async () => {
      const version = process.version;
      const majorVersion = parseInt(version.slice(1).split('.')[0]);
      return {
        success: majorVersion >= 18,
        message: `Node.js ${version} ${majorVersion >= 18 ? '✅' : '❌ (requires 18+)'}`
      };
    }
  },
  {
    name: 'Package Files',
    check: async () => {
      const requiredFiles = [
        'package.json',
        'backend/package.json',
        'frontend/package.json'
      ];
      
      const missing = requiredFiles.filter(file => !fs.existsSync(file));
      return {
        success: missing.length === 0,
        message: missing.length === 0 ? 'All package.json files present ✅' : `Missing: ${missing.join(', ')} ❌`
      };
    }
  },
  {
    name: 'Environment Files',
    check: async () => {
      const envFiles = ['.env.example', 'backend/.env.example', 'frontend/.env.example'];
      const existing = envFiles.filter(file => fs.existsSync(file));
      return {
        success: existing.length >= 2, // At least 2 out of 3
        message: `Environment templates: ${existing.length}/${envFiles.length} present ${existing.length >= 2 ? '✅' : '⚠️'}`
      };
    }
  },
  {
    name: 'Smart Contracts',
    check: async () => {
      const contractsDir = 'contracts';
      if (!fs.existsSync(contractsDir)) {
        return { success: false, message: 'Contracts directory missing ❌' };
      }
      
      const contracts = fs.readdirSync(contractsDir).filter(f => f.endsWith('.sol'));
      const requiredContracts = ['AccessControl.sol', 'ReliefToken.sol', 'ReliefDistribution.sol'];
      const hasRequired = requiredContracts.every(contract => contracts.includes(contract));
      
      return {
        success: hasRequired,
        message: `Smart contracts: ${contracts.length} found, required contracts ${hasRequired ? 'present' : 'missing'} ${hasRequired ? '✅' : '❌'}`
      };
    }
  },
  {
    name: 'Documentation',
    check: async () => {
      const docs = ['README.md', 'API.md', 'CONTRIBUTING.md'];
      const existing = docs.filter(doc => fs.existsSync(doc));
      return {
        success: existing.includes('README.md'),
        message: `Documentation: ${existing.length}/${docs.length} files present ${existing.includes('README.md') ? '✅' : '❌'}`
      };
    }
  }
];

async function main() {
  log('🔍 Final Checkpoint - Comprehensive System Validation', 'bright');
  log('='.repeat(60), 'blue');

  const results = {
    systemChecks: [],
    tests: [],
    linting: [],
    summary: {
      totalTests: 0,
      passedTests: 0,
      failedTests: 0,
      skippedTests: 0,
      systemIssues: 0,
      lintIssues: 0
    }
  };

  try {
    // 1. System Checks
    log('\n🔧 Running System Checks...', 'cyan');
    log('-'.repeat(40), 'blue');

    for (const check of systemChecks) {
      try {
        const result = await check.check();
        results.systemChecks.push({
          name: check.name,
          ...result
        });
        
        log(`${check.name}: ${result.message}`);
        if (!result.success) {
          results.summary.systemIssues++;
        }
      } catch (error) {
        log(`${check.name}: Error - ${error.message} ❌`, 'red');
        results.systemChecks.push({
          name: check.name,
          success: false,
          message: `Error: ${error.message}`
        });
        results.summary.systemIssues++;
      }
    }

    // 2. Run Tests
    log('\n🧪 Running Test Suites...', 'cyan');
    log('-'.repeat(40), 'blue');

    for (const suite of testSuites) {
      log(`\nRunning ${suite.name}...`, 'yellow');
      results.summary.totalTests++;

      try {
        // Check if the test command exists
        const packageJsonPath = path.join(suite.cwd, 'package.json');
        if (fs.existsSync(packageJsonPath)) {
          const packageJson = JSON.parse(fs.readFileSync(packageJsonPath, 'utf8'));
          const scriptName = suite.args[suite.args.length - 1];
          
          if (suite.command === 'npm' && !packageJson.scripts?.[scriptName]) {
            log(`  ⏭️ Skipped - script '${scriptName}' not found`, 'yellow');
            results.tests.push({
              name: suite.name,
              success: null,
              skipped: true,
              reason: `Script '${scriptName}' not found`
            });
            results.summary.skippedTests++;
            continue;
          }
        }

        const result = await Promise.race([
          runCommand(suite.command, suite.args, { cwd: suite.cwd }),
          new Promise((_, reject) => 
            setTimeout(() => reject(new Error('Timeout')), suite.timeout)
          )
        ]);

        if (result.success) {
          log(`  ✅ ${suite.name} passed`, 'green');
          results.tests.push({
            name: suite.name,
            success: true,
            output: result.stdout
          });
          results.summary.passedTests++;
        } else {
          const message = `${suite.name} failed`;
          if (suite.required) {
            log(`  ❌ ${message}`, 'red');
            if (result.stderr) {
              log(`     Error: ${result.stderr.slice(0, 200)}...`, 'red');
            }
          } else {
            log(`  ⚠️ ${message} (optional)`, 'yellow');
          }
          
          results.tests.push({
            name: suite.name,
            success: false,
            required: suite.required,
            error: result.stderr,
            output: result.stdout
          });
          results.summary.failedTests++;
        }
      } catch (error) {
        const message = error.message === 'Timeout' ? 'Test timeout' : error.message;
        if (suite.required) {
          log(`  ❌ ${suite.name} error: ${message}`, 'red');
        } else {
          log(`  ⚠️ ${suite.name} error: ${message} (optional)`, 'yellow');
        }
        
        results.tests.push({
          name: suite.name,
          success: false,
          required: suite.required,
          error: message
        });
        results.summary.failedTests++;
      }
    }

    // 3. Run Linting (Optional)
    log('\n🎨 Running Code Quality Checks...', 'cyan');
    log('-'.repeat(40), 'blue');

    for (const suite of lintSuites) {
      try {
        const result = await runCommand(suite.command, suite.args, { cwd: suite.cwd });
        
        if (result.success) {
          log(`  ✅ ${suite.name} passed`, 'green');
        } else {
          log(`  ⚠️ ${suite.name} has issues`, 'yellow');
          results.summary.lintIssues++;
        }
        
        results.linting.push({
          name: suite.name,
          success: result.success,
          output: result.stdout,
          error: result.stderr
        });
      } catch (error) {
        log(`  ⚠️ ${suite.name} error: ${error.message}`, 'yellow');
        results.linting.push({
          name: suite.name,
          success: false,
          error: error.message
        });
        results.summary.lintIssues++;
      }
    }

    // 4. Generate Report
    log('\n📊 Final Report', 'cyan');
    log('='.repeat(60), 'blue');

    // System Health
    const systemHealthy = results.summary.systemIssues === 0;
    log(`🔧 System Health: ${systemHealthy ? 'HEALTHY' : 'ISSUES DETECTED'} ${systemHealthy ? '✅' : '❌'}`, 
        systemHealthy ? 'green' : 'red');

    // Test Results
    const requiredTestsFailed = results.tests.filter(t => !t.success && t.required).length;
    const testsPassed = requiredTestsFailed === 0;
    log(`🧪 Required Tests: ${results.summary.passedTests}/${results.summary.totalTests - results.summary.skippedTests} passed ${testsPassed ? '✅' : '❌'}`, 
        testsPassed ? 'green' : 'red');

    if (results.summary.skippedTests > 0) {
      log(`   Skipped: ${results.summary.skippedTests} optional tests`, 'yellow');
    }

    // Code Quality
    const codeQuality = results.summary.lintIssues === 0;
    log(`🎨 Code Quality: ${codeQuality ? 'CLEAN' : 'ISSUES FOUND'} ${codeQuality ? '✅' : '⚠️'}`, 
        codeQuality ? 'green' : 'yellow');

    // Overall Status
    const overallSuccess = systemHealthy && testsPassed;
    log('\n' + '='.repeat(60), 'blue');
    log(`🎯 OVERALL STATUS: ${overallSuccess ? 'READY FOR DEPLOYMENT' : 'NEEDS ATTENTION'} ${overallSuccess ? '🚀' : '⚠️'}`, 
        overallSuccess ? 'green' : 'yellow');

    // Save detailed report
    const reportPath = path.join(__dirname, '..', 'final-checkpoint-report.json');
    fs.writeFileSync(reportPath, JSON.stringify({
      timestamp: new Date().toISOString(),
      overallSuccess,
      ...results
    }, null, 2));
    
    log(`\n📄 Detailed report saved to: final-checkpoint-report.json`, 'blue');

    // Recommendations
    if (!overallSuccess) {
      log('\n💡 Recommendations:', 'yellow');
      
      if (results.summary.systemIssues > 0) {
        log('   • Fix system configuration issues before deployment', 'yellow');
      }
      
      if (requiredTestsFailed > 0) {
        log('   • Address failing required tests', 'yellow');
        results.tests.filter(t => !t.success && t.required).forEach(test => {
          log(`     - ${test.name}`, 'yellow');
        });
      }
      
      if (results.summary.lintIssues > 0) {
        log('   • Consider fixing code quality issues', 'yellow');
      }
    } else {
      log('\n🎉 Congratulations! Your system is ready for deployment and presentation!', 'green');
      log('\n📝 Next Steps:', 'cyan');
      log('   • Run deployment scripts for your target network', 'blue');
      log('   • Set up demo data using scripts/demo-setup.js', 'blue');
      log('   • Review PRESENTATION_GUIDE.md for demo flow', 'blue');
      log('   • Test the complete system end-to-end', 'blue');
    }

    // Exit with appropriate code
    process.exit(overallSuccess ? 0 : 1);

  } catch (error) {
    log(`\n💥 Checkpoint failed with error: ${error.message}`, 'red');
    console.error(error);
    process.exit(1);
  }
}

// Handle script execution
if (require.main === module) {
  main().catch((error) => {
    console.error('Unexpected error:', error);
    process.exit(1);
  });
}

module.exports = { main };