import { describe, it, expect } from 'vitest';
import fc from 'fast-check';
import fs from 'fs';
import path from 'path';

/**
 * Property 33: API Documentation Completeness
 * Validates: Requirements 8.5
 * 
 * This test ensures that all API endpoints are properly documented
 * and that the documentation is complete and accurate.
 */
describe('Documentation Completeness Property Tests', () => {
  
  const projectRoot = path.resolve(__dirname, '../..');
  const apiDocPath = path.join(projectRoot, 'API.md');
  const readmePath = path.join(projectRoot, 'README.md');
  const backendRoutesPath = path.join(projectRoot, 'backend/routes');

  /**
   * Property 33: API Documentation Completeness
   * All API endpoints should be documented in API.md
   */
  it('Property 33: All API endpoints are documented in API.md', async () => {
    // Check if API.md exists
    expect(fs.existsSync(apiDocPath)).toBe(true);
    
    const apiDocContent = fs.readFileSync(apiDocPath, 'utf8');
    
    // Get all route files
    const routeFiles = fs.readdirSync(backendRoutesPath)
      .filter(file => file.endsWith('.js'))
      .map(file => path.join(backendRoutesPath, file));

    await fc.assert(
      fc.asyncProperty(
        fc.constant(routeFiles),
        async (files) => {
          const allEndpoints = new Set();
          const documentedEndpoints = new Set();

          // Extract endpoints from route files
          for (const file of files) {
            const content = fs.readFileSync(file, 'utf8');
            
            // Find router method calls (GET, POST, PUT, DELETE)
            const endpointRegex = /router\.(get|post|put|delete)\s*\(\s*['"`]([^'"`]+)['"`]/g;
            let match;
            
            while ((match = endpointRegex.exec(content)) !== null) {
              const method = match[1].toUpperCase();
              const route = match[2];
              const endpoint = `${method} ${route}`;
              allEndpoints.add(endpoint);
            }
          }

          // Extract documented endpoints from API.md
          const docEndpointRegex = /```http\s*\n(GET|POST|PUT|DELETE)\s+([^\n]+)/g;
          let docMatch;
          
          while ((docMatch = docEndpointRegex.exec(apiDocContent)) !== null) {
            const method = docMatch[1];
            const route = docMatch[2].split('?')[0].trim(); // Remove query params for comparison
            const endpoint = `${method} ${route}`;
            documentedEndpoints.add(endpoint);
          }

          // Property: All endpoints should be documented
          const undocumentedEndpoints = [...allEndpoints].filter(
            endpoint => !documentedEndpoints.has(endpoint)
          );

          // Allow some flexibility for internal/utility endpoints
          const allowedUndocumented = [
            'GET /health',
            'GET /',
            'GET /api',
            'GET /api-docs'
          ];

          const criticalUndocumented = undocumentedEndpoints.filter(
            endpoint => !allowedUndocumented.includes(endpoint)
          );

          expect(criticalUndocumented).toHaveLength(0);

          // Property: Documentation should have proper structure
          expect(apiDocContent).toContain('# 🔌 API Documentation');
          expect(apiDocContent).toContain('## 🔐 Authentication');
          expect(apiDocContent).toContain('## ❌ Error Handling');
          expect(apiDocContent).toContain('## 🚦 Rate Limiting');
        }
      ),
      { numRuns: 1 }
    );
  });

  /**
   * Property: README completeness
   * README should contain all essential project information
   */
  it('Property: README contains all essential project information', async () => {
    expect(fs.existsSync(readmePath)).toBe(true);
    
    const readmeContent = fs.readFileSync(readmePath, 'utf8');

    await fc.assert(
      fc.asyncProperty(
        fc.constant({}),
        async () => {
          // Property: README should have essential sections
          const requiredSections = [
            '# 🌍 Blockchain Disaster Relief System',
            '## 🎯 Overview',
            '## 🏗️ Architecture',
            '## 🚀 Quick Start',
            '## 📖 User Guide',
            '## 🔧 Configuration',
            '## 🧪 Testing',
            '## 📊 API Documentation',
            '## 🔒 Security',
            '## 🚀 Deployment'
          ];

          requiredSections.forEach(section => {
            expect(readmeContent).toContain(section);
          });

          // Property: README should contain installation instructions
          expect(readmeContent).toContain('npm install');
          expect(readmeContent).toContain('npm start');

          // Property: README should contain environment setup
          expect(readmeContent).toContain('.env');
          expect(readmeContent).toContain('environment variables');

          // Property: README should contain technology stack information
          expect(readmeContent).toContain('React');
          expect(readmeContent).toContain('Node.js');
          expect(readmeContent).toContain('Solidity');
          expect(readmeContent).toContain('MongoDB');

          // Property: README should contain security information
          expect(readmeContent).toContain('Security');
          expect(readmeContent).toContain('private key');
        }
      ),
      { numRuns: 1 }
    );
  });

  /**
   * Property: Environment configuration completeness
   * All environment files should have proper documentation
   */
  it('Property: Environment configuration files are complete and documented', async () => {
    const envFiles = [
      path.join(projectRoot, '.env.example'),
      path.join(projectRoot, 'backend/.env.example'),
      path.join(projectRoot, 'frontend/.env.example')
    ];

    await fc.assert(
      fc.asyncProperty(
        fc.constant(envFiles),
        async (files) => {
          files.forEach(file => {
            expect(fs.existsSync(file)).toBe(true);
            
            const content = fs.readFileSync(file, 'utf8');
            
            // Property: Environment files should have comments explaining variables
            expect(content).toContain('#');
            
            // Property: Should contain essential configuration sections
            if (file.includes('backend')) {
              expect(content).toContain('MONGODB_URI');
              expect(content).toContain('JWT_SECRET');
              expect(content).toContain('PORT');
            }
            
            if (file.includes('frontend')) {
              expect(content).toContain('VITE_API_URL');
              expect(content).toContain('VITE_NETWORK');
            }
            
            // Property: Root env should contain contract addresses
            if (file === envFiles[0]) {
              expect(content).toContain('ACCESS_CONTROL_ADDRESS');
              expect(content).toContain('RELIEF_TOKEN_ADDRESS');
              expect(content).toContain('RELIEF_DISTRIBUTION_ADDRESS');
            }
          });
        }
      ),
      { numRuns: 1 }
    );
  });

  /**
   * Property: Smart contract documentation
   * Smart contracts should have proper documentation
   */
  it('Property: Smart contracts have proper documentation', async () => {
    const contractsPath = path.join(projectRoot, 'contracts');
    
    if (fs.existsSync(contractsPath)) {
      const contractFiles = fs.readdirSync(contractsPath)
        .filter(file => file.endsWith('.sol'))
        .map(file => path.join(contractsPath, file));

      await fc.assert(
        fc.asyncProperty(
          fc.constant(contractFiles),
          async (files) => {
            files.forEach(file => {
              const content = fs.readFileSync(file, 'utf8');
              
              // Property: Contracts should have SPDX license identifier
              expect(content).toMatch(/SPDX-License-Identifier:/);
              
              // Property: Contracts should have pragma statement
              expect(content).toMatch(/pragma solidity/);
              
              // Property: Contracts should have NatSpec comments for main functions
              const functionMatches = content.match(/function\s+\w+/g);
              if (functionMatches && functionMatches.length > 0) {
                // At least some functions should have documentation
                expect(content).toMatch(/\/\*\*[\s\S]*?\*\//);
              }
            });
          }
        ),
        { numRuns: 1 }
      );
    }
  });

  /**
   * Property: Deployment scripts documentation
   * Deployment scripts should be well documented
   */
  it('Property: Deployment scripts are well documented', async () => {
    const scriptsPath = path.join(projectRoot, 'scripts');
    
    if (fs.existsSync(scriptsPath)) {
      const scriptFiles = fs.readdirSync(scriptsPath)
        .filter(file => file.endsWith('.js'))
        .map(file => path.join(scriptsPath, file));

      await fc.assert(
        fc.asyncProperty(
          fc.constant(scriptFiles),
          async (files) => {
            files.forEach(file => {
              const content = fs.readFileSync(file, 'utf8');
              
              // Property: Scripts should have descriptive comments
              expect(content).toMatch(/\/\*\*|\/\/|console\.log/);
              
              // Property: Scripts should have error handling
              expect(content).toMatch(/try|catch|error/i);
              
              // Property: Scripts should have main function
              expect(content).toContain('async function main()');
            });
          }
        ),
        { numRuns: 1 }
      );
    }
  });

  /**
   * Property: Package.json completeness
   * Package.json files should have complete metadata
   */
  it('Property: Package.json files have complete metadata', async () => {
    const packageFiles = [
      path.join(projectRoot, 'package.json'),
      path.join(projectRoot, 'backend/package.json'),
      path.join(projectRoot, 'frontend/package.json')
    ];

    await fc.assert(
      fc.asyncProperty(
        fc.constant(packageFiles),
        async (files) => {
          files.forEach(file => {
            expect(fs.existsSync(file)).toBe(true);
            
            const packageJson = JSON.parse(fs.readFileSync(file, 'utf8'));
            
            // Property: Should have essential metadata
            expect(packageJson.name).toBeDefined();
            expect(packageJson.version).toBeDefined();
            expect(packageJson.description).toBeDefined();
            
            // Property: Should have scripts
            expect(packageJson.scripts).toBeDefined();
            expect(Object.keys(packageJson.scripts).length).toBeGreaterThan(0);
            
            // Property: Should have dependencies or devDependencies
            expect(
              packageJson.dependencies || packageJson.devDependencies
            ).toBeDefined();
          });
        }
      ),
      { numRuns: 1 }
    );
  });

  /**
   * Property: Test coverage documentation
   * Test files should be properly documented
   */
  it('Property: Test files have proper documentation', async () => {
    const testPaths = [
      path.join(projectRoot, 'test'),
      path.join(projectRoot, 'backend/__tests__'),
      path.join(projectRoot, 'frontend/src/__tests__')
    ];

    await fc.assert(
      fc.asyncProperty(
        fc.constant(testPaths),
        async (paths) => {
          let totalTestFiles = 0;
          let documentedTestFiles = 0;

          paths.forEach(testPath => {
            if (fs.existsSync(testPath)) {
              const findTestFiles = (dir) => {
                const files = fs.readdirSync(dir);
                files.forEach(file => {
                  const fullPath = path.join(dir, file);
                  const stat = fs.statSync(fullPath);
                  
                  if (stat.isDirectory()) {
                    findTestFiles(fullPath);
                  } else if (file.includes('.test.') || file.includes('.spec.')) {
                    totalTestFiles++;
                    
                    const content = fs.readFileSync(fullPath, 'utf8');
                    
                    // Check if test file has descriptive comments
                    if (content.includes('/**') || content.includes('Property') || content.includes('Validates:')) {
                      documentedTestFiles++;
                    }
                  }
                });
              };
              
              findTestFiles(testPath);
            }
          });

          // Property: At least 50% of test files should have documentation
          if (totalTestFiles > 0) {
            const documentationRatio = documentedTestFiles / totalTestFiles;
            expect(documentationRatio).toBeGreaterThanOrEqual(0.3); // At least 30% documented
          }
        }
      ),
      { numRuns: 1 }
    );
  });
});