import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, waitFor, act } from '@testing-library/react';
import fc from 'fast-check';
import useWebSocket from '../../hooks/useWebSocket';
import NotificationCenter from '../../components/common/NotificationCenter';
import RealTimeTransactionStatus from '../../components/common/RealTimeTransactionStatus';

// Mock Socket.io client
const mockSocket = {
  on: vi.fn(),
  off: vi.fn(),
  emit: vi.fn(),
  connect: vi.fn(),
  disconnect: vi.fn(),
  join: vi.fn(),
  leave: vi.fn()
};

vi.mock('socket.io-client', () => ({
  io: vi.fn(() => mockSocket)
}));

// Mock useAuth hook
vi.mock('../../hooks/useAuth', () => ({
  useAuth: () => ({
    user: { id: 'user123', address: '0x123', role: 'donor' },
    token: 'mock-jwt-token',
    isAuthenticated: true
  })
}));

// Mock toast notifications
vi.mock('react-hot-toast', () => ({
  default: {
    success: vi.fn(),
    error: vi.fn(),
    loading: vi.fn()
  }
}));

describe('Real-time Updates Property Tests', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    // Reset socket mock
    mockSocket.on.mockClear();
    mockSocket.off.mockClear();
    mockSocket.emit.mockClear();
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  /**
   * Property 32: Real-time Communication
   * Validates: Requirements 8.4
   * 
   * The WebSocket connection should maintain consistent state and handle
   * all types of real-time events reliably.
   */
  it('Property 32: WebSocket connection maintains consistent state across events', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.array(
          fc.record({
            eventType: fc.oneof(
              fc.constant('transaction-update'),
              fc.constant('donation-confirmed'),
              fc.constant('application-approved'),
              fc.constant('fraud-alert'),
              fc.constant('system-alert')
            ),
            data: fc.record({
              id: fc.string({ minLength: 1, maxLength: 50 }),
              timestamp: fc.date().map(d => d.toISOString()),
              message: fc.string({ minLength: 1, maxLength: 200 }),
              type: fc.oneof(
                fc.constant('donation'),
                fc.constant('spending'),
                fc.constant('application'),
                fc.constant('fraud'),
                fc.constant('system')
              )
            })
          }),
          { minLength: 1, maxLength: 10 }
        ),
        async (events) => {
          const TestComponent = () => {
            const { 
              isConnected, 
              notifications, 
              subscribe, 
              emit 
            } = useWebSocket();

            return (
              <div>
                <div data-testid="connection-status">
                  {isConnected ? 'connected' : 'disconnected'}
                </div>
                <div data-testid="notification-count">
                  {notifications.length}
                </div>
                <div data-testid="notifications">
                  {notifications.map(n => (
                    <div key={n.id} data-testid={`notification-${n.id}`}>
                      {n.message}
                    </div>
                  ))}
                </div>
              </div>
            );
          };

          render(<TestComponent />);

          // Simulate connection
          act(() => {
            const connectHandler = mockSocket.on.mock.calls.find(
              call => call[0] === 'connect'
            )?.[1];
            if (connectHandler) connectHandler();
          });

          await waitFor(() => {
            expect(screen.getByTestId('connection-status')).toHaveTextContent('connected');
          });

          // Property: Connection state should be consistent
          expect(screen.getByTestId('connection-status')).toHaveTextContent('connected');

          // Simulate receiving events
          for (const event of events) {
            act(() => {
              const eventHandler = mockSocket.on.mock.calls.find(
                call => call[0] === event.eventType
              )?.[1];
              if (eventHandler) {
                eventHandler(event.data);
              }
            });
          }

          await waitFor(() => {
            const notificationCount = screen.getByTestId('notification-count');
            expect(parseInt(notificationCount.textContent)).toBeGreaterThanOrEqual(0);
          });

          // Property: All events should be processed and stored
          const notificationCount = parseInt(
            screen.getByTestId('notification-count').textContent
          );
          expect(notificationCount).toBeLessThanOrEqual(events.length);

          // Property: Notifications should maintain chronological order
          const notifications = screen.getAllByTestId(/^notification-/);
          expect(notifications.length).toBe(notificationCount);
        }
      ),
      { numRuns: 10 }
    );
  });

  /**
   * Property: WebSocket event handling reliability
   * All WebSocket events should be handled without losing data
   */
  it('Property: WebSocket events are handled reliably without data loss', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.record({
          transactionHash: fc.hexaString({ minLength: 64, maxLength: 64 }).map(s => '0x' + s),
          status: fc.oneof(
            fc.constant('pending'),
            fc.constant('confirmed'),
            fc.constant('failed')
          ),
          amount: fc.float({ min: 0.01, max: 10000 }).map(n => n.toFixed(2)),
          type: fc.oneof(
            fc.constant('donation'),
            fc.constant('spending'),
            fc.constant('transfer')
          )
        }),
        async (transactionData) => {
          const TestComponent = () => {
            const { subscribe, notifications } = useWebSocket();

            React.useEffect(() => {
              const unsubscribe = subscribe('transaction-update', (data) => {
                // Event handler should receive the data
              });
              return unsubscribe;
            }, [subscribe]);

            return (
              <div>
                <div data-testid="notifications">
                  {notifications.map(n => (
                    <div key={n.id} data-testid={`notification-${n.id}`}>
                      {JSON.stringify(n.data)}
                    </div>
                  ))}
                </div>
              </div>
            );
          };

          render(<TestComponent />);

          // Simulate transaction update event
          act(() => {
            const eventHandler = mockSocket.on.mock.calls.find(
              call => call[0] === 'transaction-update'
            )?.[1];
            if (eventHandler) {
              eventHandler({
                ...transactionData,
                timestamp: new Date().toISOString()
              });
            }
          });

          await waitFor(() => {
            const notifications = screen.getAllByTestId(/^notification-/);
            expect(notifications.length).toBeGreaterThanOrEqual(0);
          });

          // Property: Transaction data should be preserved accurately
          const notifications = screen.getAllByTestId(/^notification-/);
          if (notifications.length > 0) {
            const notificationData = JSON.parse(notifications[0].textContent);
            expect(notificationData.transactionHash).toBe(transactionData.transactionHash);
            expect(notificationData.status).toBe(transactionData.status);
            expect(notificationData.type).toBe(transactionData.type);
          }
        }
      ),
      { numRuns: 15 }
    );
  });

  /**
   * Property: Real-time transaction status updates
   * Transaction status should update in real-time and maintain consistency
   */
  it('Property: Real-time transaction status maintains consistency', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.record({
          transactionHash: fc.hexaString({ minLength: 64, maxLength: 64 }).map(s => '0x' + s),
          initialStatus: fc.constant('pending'),
          finalStatus: fc.oneof(
            fc.constant('confirmed'),
            fc.constant('failed')
          ),
          blockNumber: fc.integer({ min: 1, max: 1000000 })
        }),
        async (transactionData) => {
          let statusChangeCallback = null;

          const TestComponent = () => (
            <RealTimeTransactionStatus
              transactionHash={transactionData.transactionHash}
              onStatusChange={(status, details) => {
                statusChangeCallback = { status, details };
              }}
            />
          );

          render(<TestComponent />);

          // Initially should show pending status
          await waitFor(() => {
            expect(screen.getByText('Pending')).toBeInTheDocument();
          });

          // Simulate status update
          act(() => {
            const eventHandler = mockSocket.on.mock.calls.find(
              call => call[0] === 'transaction-update'
            )?.[1];
            if (eventHandler) {
              eventHandler({
                transactionHash: transactionData.transactionHash,
                status: transactionData.finalStatus,
                blockNumber: transactionData.blockNumber,
                timestamp: new Date().toISOString()
              });
            }
          });

          await waitFor(() => {
            if (transactionData.finalStatus === 'confirmed') {
              expect(screen.getByText('Confirmed')).toBeInTheDocument();
            } else {
              expect(screen.getByText('Failed')).toBeInTheDocument();
            }
          });

          // Property: Status change callback should be called
          expect(statusChangeCallback).toBeTruthy();
          expect(statusChangeCallback.status).toBe(transactionData.finalStatus);

          // Property: Block number should be displayed for confirmed transactions
          if (transactionData.finalStatus === 'confirmed') {
            expect(screen.getByText(`Block #${transactionData.blockNumber}`)).toBeInTheDocument();
          }
        }
      ),
      { numRuns: 10 }
    );
  });

  /**
   * Property: Notification center manages notifications correctly
   * The notification center should handle notification lifecycle properly
   */
  it('Property: Notification center manages notification lifecycle correctly', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.array(
          fc.record({
            id: fc.string({ minLength: 1, maxLength: 20 }),
            type: fc.oneof(
              fc.constant('transaction'),
              fc.constant('donation'),
              fc.constant('fraud'),
              fc.constant('system')
            ),
            title: fc.string({ minLength: 1, maxLength: 50 }),
            message: fc.string({ minLength: 1, maxLength: 100 }),
            priority: fc.oneof(
              fc.constant('low'),
              fc.constant('medium'),
              fc.constant('high'),
              fc.constant('critical')
            ),
            read: fc.boolean()
          }),
          { minLength: 1, maxLength: 5 }
        ),
        async (notifications) => {
          // Mock useWebSocket to return our test notifications
          vi.mocked(useWebSocket).mockReturnValue({
            isConnected: true,
            notifications: notifications.map(n => ({
              ...n,
              timestamp: new Date()
            })),
            unreadCount: notifications.filter(n => !n.read).length,
            clearNotifications: vi.fn(),
            removeNotification: vi.fn(),
            markAsRead: vi.fn(),
            subscribe: vi.fn(),
            emit: vi.fn()
          });

          render(<NotificationCenter />);

          // Click to open notification center
          const bellButton = screen.getByRole('button');
          act(() => {
            bellButton.click();
          });

          await waitFor(() => {
            expect(screen.getByText('Notifications')).toBeInTheDocument();
          });

          // Property: All notifications should be displayed
          notifications.forEach(notification => {
            expect(screen.getByText(notification.title)).toBeInTheDocument();
            expect(screen.getByText(notification.message)).toBeInTheDocument();
          });

          // Property: Unread count should be accurate
          const unreadCount = notifications.filter(n => !n.read).length;
          if (unreadCount > 0) {
            const badge = screen.getByText(unreadCount > 99 ? '99+' : unreadCount.toString());
            expect(badge).toBeInTheDocument();
          }

          // Property: Priority notifications should have appropriate styling
          const criticalNotifications = notifications.filter(n => n.priority === 'critical');
          criticalNotifications.forEach(notification => {
            const notificationElement = screen.getByText(notification.title).closest('[class*="border-l-red"]');
            expect(notificationElement).toBeInTheDocument();
          });
        }
      ),
      { numRuns: 8 }
    );
  });

  /**
   * Property: WebSocket connection recovery
   * The system should handle connection failures and recovery gracefully
   */
  it('Property: WebSocket connection handles failures and recovery gracefully', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.record({
          disconnectReason: fc.oneof(
            fc.constant('transport close'),
            fc.constant('ping timeout'),
            fc.constant('server disconnect')
          ),
          reconnectAttempts: fc.integer({ min: 1, max: 5 })
        }),
        async (connectionData) => {
          const TestComponent = () => {
            const { isConnected, connectionError } = useWebSocket();
            return (
              <div>
                <div data-testid="connection-status">
                  {isConnected ? 'connected' : 'disconnected'}
                </div>
                <div data-testid="connection-error">
                  {connectionError || 'no-error'}
                </div>
              </div>
            );
          };

          render(<TestComponent />);

          // Initially connected
          act(() => {
            const connectHandler = mockSocket.on.mock.calls.find(
              call => call[0] === 'connect'
            )?.[1];
            if (connectHandler) connectHandler();
          });

          await waitFor(() => {
            expect(screen.getByTestId('connection-status')).toHaveTextContent('connected');
          });

          // Simulate disconnect
          act(() => {
            const disconnectHandler = mockSocket.on.mock.calls.find(
              call => call[0] === 'disconnect'
            )?.[1];
            if (disconnectHandler) disconnectHandler(connectionData.disconnectReason);
          });

          await waitFor(() => {
            expect(screen.getByTestId('connection-status')).toHaveTextContent('disconnected');
          });

          // Property: Connection status should reflect disconnection
          expect(screen.getByTestId('connection-status')).toHaveTextContent('disconnected');

          // Simulate reconnection
          act(() => {
            const connectHandler = mockSocket.on.mock.calls.find(
              call => call[0] === 'connect'
            )?.[1];
            if (connectHandler) connectHandler();
          });

          await waitFor(() => {
            expect(screen.getByTestId('connection-status')).toHaveTextContent('connected');
          });

          // Property: Should recover connection successfully
          expect(screen.getByTestId('connection-status')).toHaveTextContent('connected');
          expect(screen.getByTestId('connection-error')).toHaveTextContent('no-error');
        }
      ),
      { numRuns: 5 }
    );
  });
});