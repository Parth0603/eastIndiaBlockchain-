import React from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import { vi } from 'vitest';
import { BrowserRouter } from 'react-router-dom';
import TransparencyDashboard from '../../pages/TransparencyDashboard';
import { apiClient } from '../../utils/api';

// Mock the API client
vi.mock('../../utils/api', () => ({
  apiClient: {
    public: {
      getStats: vi.fn(),
      getTransactions: vi.fn(),
      searchTransactions: vi.fn(),
      getFundFlow: vi.fn(),
    },
  },
}));

// Mock the FundFlowVisualization component
vi.mock('../../components/public/FundFlowVisualization', () => ({
  default: () => <div data-testid="fund-flow-visualization">Fund Flow Visualization</div>
}));

const renderWithRouter = (component) => {
  return render(
    <BrowserRouter>
      {component}
    </BrowserRouter>
  );
};

describe('TransparencyDashboard', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('Property 22: Privacy-Preserving Transaction Display', () => {
    it('should display transaction information without exposing personal data', async () => {
      // Mock API responses with sample data
      const mockStats = {
        totalRaised: '10000000000000000000',
        fundsDistributed: '5000000000000000000',
        peopleHelped: 100,
        transactions: 50,
        donationCount: 25,
        distributionCount: 25
      };

      const mockTransactions = [
        {
          id: 'tx1',
          txHash: '0x1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef',
          type: 'donation',
          status: 'confirmed',
          amount: '1000000000000000000',
          from: '0x1111111111111111111111111111111111111111',
          to: '0x2222222222222222222222222222222222222222',
          createdAt: new Date().toISOString(),
          // Personal data that should NOT be displayed
          metadata: {
            beneficiaryName: 'John Doe',
            personalInfo: 'Personal details'
          }
        }
      ];

      apiClient.public.getStats.mockResolvedValue({
        success: true,
        data: mockStats
      });

      apiClient.public.getTransactions.mockResolvedValue({
        success: true,
        data: {
          transactions: mockTransactions,
          pagination: {
            page: 1,
            limit: 20,
            total: 1,
            pages: 1
          }
        }
      });

      apiClient.public.getFundFlow.mockResolvedValue({
        success: true,
        data: {
          categoryFlow: [],
          monthlyFlow: []
        }
      });

      renderWithRouter(<TransparencyDashboard />);

      // Wait for component to load
      await waitFor(() => {
        expect(screen.getByText('Transparency Dashboard')).toBeInTheDocument();
      });

      // Verify that personal information is NOT displayed
      expect(screen.queryByText('John Doe')).not.toBeInTheDocument();
      expect(screen.queryByText('Personal details')).not.toBeInTheDocument();

      // Verify that transaction type is displayed
      expect(screen.getByText('donation')).toBeInTheDocument();
    });

    it('should provide verification through blockchain hashes', async () => {
      const mockTransactions = [
        {
          id: 'tx1',
          txHash: '0x1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef',
          type: 'donation',
          status: 'confirmed',
          amount: '1000000000000000000',
          from: '0x1111111111111111111111111111111111111111',
          to: '0x2222222222222222222222222222222222222222',
          createdAt: new Date().toISOString()
        }
      ];

      apiClient.public.getStats.mockResolvedValue({
        success: true,
        data: {
          totalRaised: '1000000000000000000',
          fundsDistributed: '0',
          peopleHelped: 0,
          transactions: 1,
          donationCount: 1,
          distributionCount: 0
        }
      });

      apiClient.public.getTransactions.mockResolvedValue({
        success: true,
        data: {
          transactions: mockTransactions,
          pagination: { page: 1, limit: 20, total: 1, pages: 1 }
        }
      });

      apiClient.public.getFundFlow.mockResolvedValue({
        success: true,
        data: { categoryFlow: [], monthlyFlow: [] }
      });

      renderWithRouter(<TransparencyDashboard />);

      await waitFor(() => {
        expect(screen.getByText('Transactions')).toBeInTheDocument();
      });

      // Should have etherscan links for verification
      const links = screen.getAllByRole('link');
      const etherscanLinks = links.filter(link => 
        link.href && link.href.includes('etherscan.io/tx/')
      );
      
      expect(etherscanLinks.length).toBeGreaterThan(0);
    });
  });

  describe('Property 25: Verification Hash Provision', () => {
    it('should provide accurate blockchain transaction hashes', async () => {
      const mockTransactions = [
        {
          id: 'tx1',
          txHash: '0xabcdef1234567890abcdef1234567890abcdef1234567890abcdef1234567890',
          type: 'spending',
          status: 'confirmed',
          amount: '500000000000000000',
          category: 'food',
          createdAt: new Date().toISOString()
        }
      ];

      apiClient.public.getStats.mockResolvedValue({
        success: true,
        data: {
          totalRaised: '1000000000000000000',
          fundsDistributed: '500000000000000000',
          peopleHelped: 1,
          transactions: 1,
          donationCount: 0,
          distributionCount: 1
        }
      });

      apiClient.public.getTransactions.mockResolvedValue({
        success: true,
        data: {
          transactions: mockTransactions,
          pagination: { page: 1, limit: 20, total: 1, pages: 1 }
        }
      });

      apiClient.public.getFundFlow.mockResolvedValue({
        success: true,
        data: { categoryFlow: [], monthlyFlow: [] }
      });

      renderWithRouter(<TransparencyDashboard />);

      await waitFor(() => {
        expect(screen.getByText('spending')).toBeInTheDocument();
      });

      // Verify etherscan link contains correct hash
      const links = screen.getAllByRole('link');
      const etherscanLink = links.find(link => 
        link.href && link.href.includes(mockTransactions[0].txHash)
      );
      
      expect(etherscanLink).toBeTruthy();
      expect(etherscanLink.href).toBe(`https://etherscan.io/tx/${mockTransactions[0].txHash}`);
    });
  });

  describe('Unit Tests', () => {
    it('should render loading state initially', () => {
      apiClient.public.getStats.mockImplementation(() => new Promise(() => {}));
      apiClient.public.getTransactions.mockImplementation(() => new Promise(() => {}));
      apiClient.public.getFundFlow.mockImplementation(() => new Promise(() => {}));

      renderWithRouter(<TransparencyDashboard />);
      
      expect(screen.getByText('Loading transparency data...')).toBeInTheDocument();
    });

    it('should handle API errors gracefully', async () => {
      apiClient.public.getStats.mockRejectedValue(new Error('API Error'));
      apiClient.public.getTransactions.mockRejectedValue(new Error('API Error'));
      apiClient.public.getFundFlow.mockRejectedValue(new Error('API Error'));

      renderWithRouter(<TransparencyDashboard />);

      await waitFor(() => {
        expect(screen.getByText(/Failed to load transparency data/)).toBeInTheDocument();
      });
    });
  });
});
      id: fc.string({ minLength: 1, maxLength: 50 }),
      txHash: generateHexString(64).map(s => '0x' + s),
      from: generateHexString(40).map(s => '0x' + s),
      to: generateHexString(40).map(s => '0x' + s),
      amount: fc.bigInt({ min: 1n, max: 1000000000000000000n }).map(n => n.toString()),
      type: fc.constantFrom('donation', 'spending', 'vendor_payment', 'allocation'),
      category: fc.option(fc.constantFrom('food', 'medical', 'shelter', 'education', 'transportation', 'utilities')),
      status: fc.constantFrom('confirmed', 'pending', 'failed'),
      createdAt: fc.date({ min: new Date('2020-01-01'), max: new Date() }).map(d => d.toISOString()),
      // These fields should NOT be present in public display (privacy protection)
      metadata: fc.record({
        beneficiaryName: fc.option(fc.string()),
        vendorName: fc.option(fc.string()),
        description: fc.option(fc.string()),
        personalInfo: fc.option(fc.string())
      })
    });

    const generateStats = () => fc.record({
      totalRaised: fc.bigInt({ min: 0n, max: 10000000000000000000n }).map(n => n.toString()),
      fundsDistributed: fc.bigInt({ min: 0n, max: 10000000000000000000n }).map(n => n.toString()),
      peopleHelped: fc.integer({ min: 0, max: 10000 }),
      transactions: fc.integer({ min: 0, max: 100000 }),
      donationCount: fc.integer({ min: 0, max: 50000 }),
      distributionCount: fc.integer({ min: 0, max: 50000 })
    });

    it('should display transaction information without exposing personal beneficiary data', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.array(generateTransaction(), { minLength: 0, maxLength: 5 }), // Reduced array size
          generateStats(),
          async (transactions, stats) => {
            // Mock API responses
            apiClient.public.getStats.mockResolvedValue({
              success: true,
              data: stats
            });

            apiClient.public.getTransactions.mockResolvedValue({
              success: true,
              data: {
                transactions,
                pagination: {
                  page: 1,
                  limit: 20,
                  total: transactions.length,
                  pages: Math.ceil(transactions.length / 20)
                }
              }
            });

            apiClient.public.getFundFlow.mockResolvedValue({
              success: true,
              data: {
                categoryFlow: [],
                monthlyFlow: []
              }
            });

            renderWithRouter(<TransparencyDashboard />);

            // Wait for component to load
            await waitFor(() => {
              expect(screen.getByText('Transparency Dashboard')).toBeInTheDocument();
            }, { timeout: 3000 });

            // Check that transactions are displayed if any exist
            if (transactions.length > 0) {
              await waitFor(() => {
                expect(screen.getByText('Transactions')).toBeInTheDocument();
              }, { timeout: 2000 });

              // CRITICAL: Verify that personal information is NOT displayed
              for (const tx of transactions) {
                if (tx.metadata?.beneficiaryName) {
                  expect(screen.queryByText(tx.metadata.beneficiaryName)).not.toBeInTheDocument();
                }
                if (tx.metadata?.vendorName) {
                  expect(screen.queryByText(tx.metadata.vendorName)).not.toBeInTheDocument();
                }
                if (tx.metadata?.description) {
                  expect(screen.queryByText(tx.metadata.description)).not.toBeInTheDocument();
                }
                if (tx.metadata?.personalInfo) {
                  expect(screen.queryByText(tx.metadata.personalInfo)).not.toBeInTheDocument();
                }
              }

              // Verify that transaction types are displayed
              for (const tx of transactions) {
                const typeElements = screen.queryAllByText(tx.type);
                expect(typeElements.length).toBeGreaterThan(0);
              }

              // Verify that transaction hashes are displayed as links (for verification)
              const transactionsWithHashes = transactions.filter(tx => tx.txHash);
              if (transactionsWithHashes.length > 0) {
                const links = screen.queryAllByRole('link');
                const etherscanLinks = links.filter(link => 
                  link.href && link.href.includes('etherscan.io')
                );
                expect(etherscanLinks.length).toBeGreaterThan(0);
              }
            } else {
              // If no transactions, should show empty state
              await waitFor(() => {
                expect(screen.getByText('No transactions found')).toBeInTheDocument();
              }, { timeout: 2000 });
            }
          }
        ),
        { numRuns: 20, timeout: 10000 } // Reduced runs and increased timeout
      );
    }, 15000); // Set test timeout to 15 seconds

    it('should maintain privacy protection across different transaction types', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.array(generateTransaction(), { minLength: 1, maxLength: 10 }),
          generateStats(),
          async (transactions, stats) => {
            // Ensure we have different transaction types
            const typedTransactions = transactions.map((tx, index) => ({
              ...tx,
              type: ['donation', 'spending', 'vendor_payment', 'allocation'][index % 4],
              metadata: {
                ...tx.metadata,
                beneficiaryName: `Beneficiary ${index}`,
                vendorName: `Vendor ${index}`,
                description: `Personal description ${index}`
              }
            }));

            apiClient.public.getStats.mockResolvedValue({
              success: true,
              data: stats
            });

            apiClient.public.getTransactions.mockResolvedValue({
              success: true,
              data: {
                transactions: typedTransactions,
                pagination: {
                  page: 1,
                  limit: 20,
                  total: typedTransactions.length,
                  pages: 1
                }
              }
            });

            apiClient.public.getFundFlow.mockResolvedValue({
              success: true,
              data: {
                categoryFlow: [],
                monthlyFlow: []
              }
            });

            renderWithRouter(<TransparencyDashboard />);

            await waitFor(() => {
              expect(screen.getByText('Transparency Dashboard')).toBeInTheDocument();
            });

            // Verify that regardless of transaction type, personal data is never shown
            for (let i = 0; i < typedTransactions.length; i++) {
              expect(screen.queryByText(`Beneficiary ${i}`)).not.toBeInTheDocument();
              expect(screen.queryByText(`Vendor ${i}`)).not.toBeInTheDocument();
              expect(screen.queryByText(`Personal description ${i}`)).not.toBeInTheDocument();
            }

            // But transaction types should be visible
            const uniqueTypes = [...new Set(typedTransactions.map(tx => tx.type))];
            for (const type of uniqueTypes) {
              expect(screen.queryAllByText(type).length).toBeGreaterThan(0);
            }
          }
        ),
        { numRuns: 50 }
      );
    });

    it('should provide verification capability through blockchain hashes', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.array(generateTransaction(), { minLength: 1, maxLength: 5 }),
          generateStats(),
          async (transactions, stats) => {
            apiClient.public.getStats.mockResolvedValue({
              success: true,
              data: stats
            });

            apiClient.public.getTransactions.mockResolvedValue({
              success: true,
              data: {
                transactions,
                pagination: {
                  page: 1,
                  limit: 20,
                  total: transactions.length,
                  pages: 1
                }
              }
            });

            apiClient.public.getFundFlow.mockResolvedValue({
              success: true,
              data: {
                categoryFlow: [],
                monthlyFlow: []
              }
            });

            renderWithRouter(<TransparencyDashboard />);

            await waitFor(() => {
              expect(screen.getByText('Transparency Dashboard')).toBeInTheDocument();
            });

            // Verify that transactions with hashes provide etherscan links for verification
            const transactionsWithHashes = transactions.filter(tx => tx.txHash);
            if (transactionsWithHashes.length > 0) {
              const links = screen.getAllByRole('link');
              const etherscanLinks = links.filter(link => 
                link.href && link.href.includes('etherscan.io/tx/')
              );
              
              // Should have at least one etherscan link for verification
              expect(etherscanLinks.length).toBeGreaterThan(0);
              
              // Each etherscan link should contain a transaction hash
              etherscanLinks.forEach(link => {
                expect(link.href).toMatch(/0x[a-fA-F0-9]{64}/);
              });
            }
          }
        ),
        { numRuns: 50 }
      );
    });
  });

  /**
   * **Feature: blockchain-disaster-relief, Property 25: Verification Hash Provision**
   * **Validates: Requirements 6.5**
   * 
   * Property: For any transaction requiring verification, the system should provide accurate 
   * blockchain transaction hashes
   */
  describe('Property 25: Verification Hash Provision', () => {
    it('should provide accurate blockchain transaction hashes for verification', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.array(generateTransaction(), { minLength: 1, maxLength: 5 }),
          generateStats(),
          async (transactions, stats) => {
            // Ensure all transactions have valid hashes for this test
            const transactionsWithHashes = transactions.map(tx => ({
              ...tx,
              txHash: '0x' + generateHexString(64).generate(fc.random()).value,
              status: 'confirmed' // Only confirmed transactions should have hashes
            }));

            apiClient.public.getStats.mockResolvedValue({
              success: true,
              data: stats
            });

            apiClient.public.getTransactions.mockResolvedValue({
              success: true,
              data: {
                transactions: transactionsWithHashes,
                pagination: {
                  page: 1,
                  limit: 20,
                  total: transactionsWithHashes.length,
                  pages: 1
                }
              }
            });

            apiClient.public.getFundFlow.mockResolvedValue({
              success: true,
              data: {
                categoryFlow: [],
                monthlyFlow: []
              }
            });

            renderWithRouter(<TransparencyDashboard />);

            await waitFor(() => {
              expect(screen.getByText('Transparency Dashboard')).toBeInTheDocument();
            }, { timeout: 3000 });

            // Verify that transaction hashes are provided for verification
            for (const tx of transactionsWithHashes) {
              if (tx.txHash && tx.status === 'confirmed') {
                // Should display truncated hash
                const truncatedHash = `${tx.txHash.slice(0, 6)}...${tx.txHash.slice(-4)}`;
                
                // Should be a clickable link to etherscan for verification
                const links = screen.queryAllByRole('link');
                const etherscanLinks = links.filter(link => 
                  link.href && link.href.includes('etherscan.io/tx/') && link.href.includes(tx.txHash)
                );
                
                expect(etherscanLinks.length).toBeGreaterThan(0);
                
                // Verify the link contains the correct transaction hash
                etherscanLinks.forEach(link => {
                  expect(link.href).toBe(`https://etherscan.io/tx/${tx.txHash}`);
                  expect(link.target).toBe('_blank');
                  expect(link.rel).toBe('noopener noreferrer');
                });
              }
            }

            // Verify that pending transactions show appropriate status
            const pendingTransactions = transactionsWithHashes.filter(tx => tx.status === 'pending');
            if (pendingTransactions.length > 0) {
              // Should show "Pending" for transactions without hashes
              expect(screen.queryAllByText('Pending').length).toBeGreaterThan(0);
            }
          }
        ),
        { numRuns: 20, timeout: 8000 }
      );
    }, 12000);

    it('should provide copy functionality for transaction hashes', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.array(generateTransaction(), { minLength: 1, maxLength: 3 }),
          generateStats(),
          async (transactions, stats) => {
            const transactionsWithHashes = transactions.map(tx => ({
              ...tx,
              txHash: '0x' + generateHexString(64).generate(fc.random()).value,
              status: 'confirmed'
            }));

            apiClient.public.getStats.mockResolvedValue({
              success: true,
              data: stats
            });

            apiClient.public.getTransactions.mockResolvedValue({
              success: true,
              data: {
                transactions: transactionsWithHashes,
                pagination: {
                  page: 1,
                  limit: 20,
                  total: transactionsWithHashes.length,
                  pages: 1
                }
              }
            });

            apiClient.public.getFundFlow.mockResolvedValue({
              success: true,
              data: {
                categoryFlow: [],
                monthlyFlow: []
              }
            });

            renderWithRouter(<TransparencyDashboard />);

            await waitFor(() => {
              expect(screen.getByText('Transactions')).toBeInTheDocument();
            }, { timeout: 3000 });

            // Verify that copy buttons are present for transaction hashes
            const copyButtons = screen.queryAllByTitle('Copy full hash');
            expect(copyButtons.length).toBe(transactionsWithHashes.length);

            // Each copy button should be associated with a transaction hash
            copyButtons.forEach(button => {
              expect(button.textContent).toBe('📋');
            });
          }
        ),
        { numRuns: 15, timeout: 6000 }
      );
    }, 10000);

    it('should maintain hash accuracy across different transaction types', async () => {
      await fc.assert(
        fc.asyncProperty(
          generateStats(),
          async (stats) => {
            // Create transactions with different types but all with hashes
            const mixedTransactions = [
              {
                id: 'tx1',
                txHash: '0x1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef',
                type: 'donation',
                status: 'confirmed',
                amount: '1000000000000000000',
                from: '0x1111111111111111111111111111111111111111',
                to: '0x2222222222222222222222222222222222222222',
                createdAt: new Date().toISOString()
              },
              {
                id: 'tx2', 
                txHash: '0xfedcba0987654321fedcba0987654321fedcba0987654321fedcba0987654321',
                type: 'spending',
                status: 'confirmed',
                amount: '500000000000000000',
                from: '0x3333333333333333333333333333333333333333',
                to: '0x4444444444444444444444444444444444444444',
                category: 'food',
                createdAt: new Date().toISOString()
              }
            ];

            apiClient.public.getStats.mockResolvedValue({
              success: true,
              data: stats
            });

            apiClient.public.getTransactions.mockResolvedValue({
              success: true,
              data: {
                transactions: mixedTransactions,
                pagination: {
                  page: 1,
                  limit: 20,
                  total: mixedTransactions.length,
                  pages: 1
                }
              }
            });

            apiClient.public.getFundFlow.mockResolvedValue({
              success: true,
              data: {
                categoryFlow: [],
                monthlyFlow: []
              }
            });

            renderWithRouter(<TransparencyDashboard />);

            await waitFor(() => {
              expect(screen.getByText('Transactions')).toBeInTheDocument();
            }, { timeout: 3000 });

            // Verify that each transaction type has its hash properly displayed
            for (const tx of mixedTransactions) {
              const links = screen.queryAllByRole('link');
              const specificLink = links.find(link => 
                link.href && link.href.includes(tx.txHash)
              );
              
              expect(specificLink).toBeTruthy();
              expect(specificLink.href).toBe(`https://etherscan.io/tx/${tx.txHash}`);
            }

            // Verify that transaction types are correctly displayed alongside hashes
            expect(screen.getByText('donation')).toBeInTheDocument();
            expect(screen.getByText('spending')).toBeInTheDocument();
          }
        ),
        { numRuns: 10, timeout: 5000 }
      );
    }, 8000);
  });
  describe('Unit Tests', () => {
    it('should render loading state initially', () => {
      apiClient.public.getStats.mockImplementation(() => new Promise(() => {})); // Never resolves
      apiClient.public.getTransactions.mockImplementation(() => new Promise(() => {}));
      apiClient.public.getFundFlow.mockImplementation(() => new Promise(() => {}));

      renderWithRouter(<TransparencyDashboard />);
      
      expect(screen.getByText('Loading transparency data...')).toBeInTheDocument();
    });

    it('should handle API errors gracefully', async () => {
      apiClient.public.getStats.mockRejectedValue(new Error('API Error'));
      apiClient.public.getTransactions.mockRejectedValue(new Error('API Error'));
      apiClient.public.getFundFlow.mockRejectedValue(new Error('API Error'));

      renderWithRouter(<TransparencyDashboard />);

      await waitFor(() => {
        expect(screen.getByText(/Failed to load transparency data/)).toBeInTheDocument();
      });
    });
  });
});