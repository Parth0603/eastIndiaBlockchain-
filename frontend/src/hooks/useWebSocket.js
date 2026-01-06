import { useEffect, useRef, useState, useCallback } from 'react';
import { io } from 'socket.io-client';
import { useAuth } from './useAuth';
import toast from 'react-hot-toast';

const useWebSocket = () => {
  const { user, token } = useAuth();
  const socketRef = useRef(null);
  const [isConnected, setIsConnected] = useState(false);
  const [connectionError, setConnectionError] = useState(null);
  const [notifications, setNotifications] = useState([]);
  const listenersRef = useRef(new Map());

  // Initialize WebSocket connection
  useEffect(() => {
    if (!token || !user) {
      return;
    }

    const serverUrl = import.meta.env.VITE_API_URL || 'http://localhost:3001';
    
    socketRef.current = io(serverUrl, {
      auth: {
        token: token
      },
      transports: ['websocket', 'polling'],
      timeout: 20000,
      reconnection: true,
      reconnectionAttempts: 5,
      reconnectionDelay: 1000
    });

    const socket = socketRef.current;

    // Connection event handlers
    socket.on('connect', () => {
      console.log('🔌 WebSocket connected');
      setIsConnected(true);
      setConnectionError(null);
      
      // Join user-specific room
      socket.emit('join-room', `user:${user.id}`);
      
      // Join role-based room
      if (user.role) {
        socket.emit('join-room', `role:${user.role}`);
      }
    });

    socket.on('disconnect', (reason) => {
      console.log('🔌 WebSocket disconnected:', reason);
      setIsConnected(false);
      
      if (reason === 'io server disconnect') {
        // Server disconnected, try to reconnect
        socket.connect();
      }
    });

    socket.on('connect_error', (error) => {
      console.error('🔌 WebSocket connection error:', error);
      setConnectionError(error.message);
      setIsConnected(false);
    });

    // Set up default notification handlers
    setupDefaultNotificationHandlers(socket);

    return () => {
      if (socket) {
        socket.disconnect();
      }
    };
  }, [token, user]);

  // Set up default notification handlers
  const setupDefaultNotificationHandlers = (socket) => {
    // Transaction updates
    socket.on('transaction-update', (data) => {
      addNotification({
        id: `tx-${data.transactionHash}`,
        type: 'transaction',
        title: 'Transaction Update',
        message: `Transaction ${data.status}: ${data.type}`,
        data,
        timestamp: new Date(data.timestamp)
      });

      if (data.status === 'confirmed') {
        toast.success(`Transaction confirmed: ${data.type}`);
      } else if (data.status === 'failed') {
        toast.error(`Transaction failed: ${data.type}`);
      }
    });

    // Donation notifications
    socket.on('donation-confirmed', (data) => {
      addNotification({
        id: `donation-${data.transactionHash}`,
        type: 'donation',
        title: 'Donation Confirmed',
        message: `Your donation of ${data.amount} tokens has been confirmed`,
        data,
        timestamp: new Date(data.timestamp)
      });
      toast.success('Donation confirmed!');
    });

    // Application status updates
    socket.on('application-approved', (data) => {
      addNotification({
        id: `app-approved-${Date.now()}`,
        type: 'application',
        title: 'Application Approved',
        message: data.message,
        data,
        timestamp: new Date(data.timestamp)
      });
      toast.success('Your application has been approved!');
    });

    // Vendor approval notifications
    socket.on('vendor-approved', (data) => {
      addNotification({
        id: `vendor-approved-${Date.now()}`,
        type: 'vendor',
        title: 'Vendor Approved',
        message: data.message,
        data,
        timestamp: new Date(data.timestamp)
      });
      toast.success('Your vendor application has been approved!');
    });

    // Purchase notifications
    socket.on('purchase-processed', (data) => {
      addNotification({
        id: `purchase-${data.transactionHash}`,
        type: 'purchase',
        title: 'Purchase Processed',
        message: data.message,
        data,
        timestamp: new Date(data.timestamp)
      });
      toast.success('Purchase processed successfully!');
    });

    socket.on('payment-received', (data) => {
      addNotification({
        id: `payment-${data.transactionHash}`,
        type: 'payment',
        title: 'Payment Received',
        message: data.message,
        data,
        timestamp: new Date(data.timestamp)
      });
      toast.success('Payment received!');
    });

    // Fraud alerts
    socket.on('fraud-alert', (data) => {
      addNotification({
        id: `fraud-${data.reportId}`,
        type: 'fraud',
        title: 'Fraud Alert',
        message: data.message,
        data,
        timestamp: new Date(data.timestamp),
        priority: 'high'
      });
      toast.error('Fraud alert detected!');
    });

    // System alerts
    socket.on('system-alert', (data) => {
      addNotification({
        id: `system-${Date.now()}`,
        type: 'system',
        title: 'System Alert',
        message: data.message,
        data,
        timestamp: new Date(data.timestamp),
        priority: data.type === 'emergency-pause' ? 'critical' : 'medium'
      });
      
      if (data.type === 'emergency-pause') {
        toast.error(data.message, { duration: 10000 });
      } else {
        toast(data.message);
      }
    });

    // Role-based notifications for admins/verifiers
    if (user?.role === 'admin' || user?.role === 'verifier') {
      socket.on('donation-received', (data) => {
        addNotification({
          id: `donation-received-${data.transactionHash}`,
          type: 'admin',
          title: 'New Donation',
          message: `New donation of ${data.amount} tokens received`,
          data,
          timestamp: new Date(data.timestamp)
        });
      });

      socket.on('beneficiary-approved', (data) => {
        addNotification({
          id: `beneficiary-approved-${data.transactionHash}`,
          type: 'admin',
          title: 'Beneficiary Approved',
          message: `Beneficiary approved with ${data.allocatedAmount} tokens`,
          data,
          timestamp: new Date(data.timestamp)
        });
      });

      socket.on('vendor-approved', (data) => {
        addNotification({
          id: `vendor-approved-admin-${data.transactionHash}`,
          type: 'admin',
          title: 'Vendor Approved',
          message: `New vendor approved: ${data.businessName || 'Unknown'}`,
          data,
          timestamp: new Date(data.timestamp)
        });
      });
    }
  };

  // Add notification to state
  const addNotification = useCallback((notification) => {
    setNotifications(prev => {
      // Remove duplicate notifications
      const filtered = prev.filter(n => n.id !== notification.id);
      // Add new notification at the beginning
      return [notification, ...filtered].slice(0, 50); // Keep only last 50 notifications
    });
  }, []);

  // Join a room
  const joinRoom = useCallback((room) => {
    if (socketRef.current && isConnected) {
      socketRef.current.emit('join-room', room);
    }
  }, [isConnected]);

  // Leave a room
  const leaveRoom = useCallback((room) => {
    if (socketRef.current && isConnected) {
      socketRef.current.emit('leave-room', room);
    }
  }, [isConnected]);

  // Subscribe to custom events
  const subscribe = useCallback((event, handler) => {
    if (!socketRef.current) return;

    socketRef.current.on(event, handler);
    
    // Store listener for cleanup
    if (!listenersRef.current.has(event)) {
      listenersRef.current.set(event, new Set());
    }
    listenersRef.current.get(event).add(handler);

    // Return unsubscribe function
    return () => {
      if (socketRef.current) {
        socketRef.current.off(event, handler);
      }
      
      const eventListeners = listenersRef.current.get(event);
      if (eventListeners) {
        eventListeners.delete(handler);
        if (eventListeners.size === 0) {
          listenersRef.current.delete(event);
        }
      }
    };
  }, []);

  // Emit custom events
  const emit = useCallback((event, data) => {
    if (socketRef.current && isConnected) {
      socketRef.current.emit(event, data);
    }
  }, [isConnected]);

  // Clear notifications
  const clearNotifications = useCallback(() => {
    setNotifications([]);
  }, []);

  // Remove specific notification
  const removeNotification = useCallback((notificationId) => {
    setNotifications(prev => prev.filter(n => n.id !== notificationId));
  }, []);

  // Mark notification as read
  const markAsRead = useCallback((notificationId) => {
    setNotifications(prev => 
      prev.map(n => 
        n.id === notificationId ? { ...n, read: true } : n
      )
    );
  }, []);

  // Get unread count
  const unreadCount = notifications.filter(n => !n.read).length;

  return {
    isConnected,
    connectionError,
    notifications,
    unreadCount,
    joinRoom,
    leaveRoom,
    subscribe,
    emit,
    clearNotifications,
    removeNotification,
    markAsRead
  };
};

export default useWebSocket;