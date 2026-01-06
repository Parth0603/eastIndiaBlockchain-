import jwt from 'jsonwebtoken';

class WebSocketService {
  constructor() {
    this.io = null;
    this.authenticatedUsers = new Map(); // socketId -> user info
    this.userSockets = new Map(); // userId -> Set of socketIds
  }

  initialize(io) {
    this.io = io;
    this.setupMiddleware();
    this.setupEventHandlers();
  }

  setupMiddleware() {
    // Authentication middleware for WebSocket connections
    this.io.use(async (socket, next) => {
      try {
        const token = socket.handshake.auth.token || socket.handshake.headers.authorization?.replace('Bearer ', '');
        
        if (!token) {
          return next(new Error('Authentication token required'));
        }

        const decoded = jwt.verify(token, process.env.JWT_SECRET);
        const user = {
          id: decoded.id,
          address: decoded.address,
          role: decoded.role
        };

        socket.user = user;
        next();
      } catch (error) {
        next(new Error('Invalid authentication token'));
      }
    });
  }

  setupEventHandlers() {
    this.io.on('connection', (socket) => {
      const user = socket.user;
      console.log(`🔌 Authenticated user connected: ${user.address} (${user.role})`);

      // Store user connection
      this.authenticatedUsers.set(socket.id, user);
      
      if (!this.userSockets.has(user.id)) {
        this.userSockets.set(user.id, new Set());
      }
      this.userSockets.get(user.id).add(socket.id);

      // Join role-based rooms
      socket.join(`role:${user.role}`);
      socket.join(`user:${user.id}`);

      // Handle room joining
      socket.on('join-room', (room) => {
        // Validate room access based on user role
        if (this.canJoinRoom(user, room)) {
          socket.join(room);
          console.log(`👤 User ${user.address} joined room ${room}`);
          socket.emit('room-joined', { room, success: true });
        } else {
          socket.emit('room-joined', { room, success: false, error: 'Access denied' });
        }
      });

      // Handle room leaving
      socket.on('leave-room', (room) => {
        socket.leave(room);
        console.log(`👤 User ${user.address} left room ${room}`);
        socket.emit('room-left', { room });
      });

      // Handle user status updates
      socket.on('update-status', (status) => {
        this.broadcastToRole(user.role, 'user-status-updated', {
          userId: user.id,
          address: user.address,
          status,
          timestamp: new Date().toISOString()
        });
      });

      // Handle disconnect
      socket.on('disconnect', () => {
        console.log(`🔌 User disconnected: ${user.address}`);
        
        // Clean up user connections
        this.authenticatedUsers.delete(socket.id);
        
        const userSocketSet = this.userSockets.get(user.id);
        if (userSocketSet) {
          userSocketSet.delete(socket.id);
          if (userSocketSet.size === 0) {
            this.userSockets.delete(user.id);
          }
        }
      });
    });
  }

  canJoinRoom(user, room) {
    // Define room access rules based on user roles
    const roomAccessRules = {
      'admin': ['admin', 'verifier', 'beneficiary', 'vendor', 'donor', 'public'],
      'verifier': ['verifier', 'beneficiary', 'vendor', 'public'],
      'beneficiary': ['beneficiary', 'public'],
      'vendor': ['vendor', 'public'],
      'donor': ['donor', 'public']
    };

    const allowedRooms = roomAccessRules[user.role] || ['public'];
    
    // Check if room matches allowed patterns
    return allowedRooms.some(allowedRoom => {
      if (room.startsWith(`${allowedRoom}:`)) return true;
      if (room === allowedRoom) return true;
      if (room === 'public') return true;
      if (room === `user:${user.id}`) return true;
      return false;
    });
  }

  // Notification methods
  notifyUser(userId, event, data) {
    const userSocketSet = this.userSockets.get(userId);
    if (userSocketSet) {
      userSocketSet.forEach(socketId => {
        const socket = this.io.sockets.sockets.get(socketId);
        if (socket) {
          socket.emit(event, {
            ...data,
            timestamp: new Date().toISOString()
          });
        }
      });
    }
  }

  notifyUserByAddress(address, event, data) {
    // Find user by address
    for (const [socketId, user] of this.authenticatedUsers.entries()) {
      if (user.address === address) {
        const socket = this.io.sockets.sockets.get(socketId);
        if (socket) {
          socket.emit(event, {
            ...data,
            timestamp: new Date().toISOString()
          });
        }
      }
    }
  }

  broadcastToRole(role, event, data) {
    this.io.to(`role:${role}`).emit(event, {
      ...data,
      timestamp: new Date().toISOString()
    });
  }

  broadcastToRoom(room, event, data) {
    this.io.to(room).emit(event, {
      ...data,
      timestamp: new Date().toISOString()
    });
  }

  broadcastToAll(event, data) {
    this.io.emit(event, {
      ...data,
      timestamp: new Date().toISOString()
    });
  }

  // Transaction-specific notifications
  notifyTransactionUpdate(transactionHash, status, details = {}) {
    this.broadcastToAll('transaction-update', {
      transactionHash,
      status,
      ...details
    });
  }

  notifyDonationReceived(donation) {
    // Notify admins and verifiers
    this.broadcastToRole('admin', 'donation-received', donation);
    this.broadcastToRole('verifier', 'donation-received', donation);
    
    // Notify the donor
    this.notifyUserByAddress(donation.donor, 'donation-confirmed', donation);
  }

  notifyBeneficiaryApproved(beneficiary) {
    // Notify the beneficiary
    this.notifyUserByAddress(beneficiary.address, 'application-approved', {
      message: 'Your application has been approved!',
      allocatedAmount: beneficiary.allocatedAmount
    });

    // Notify admins
    this.broadcastToRole('admin', 'beneficiary-approved', beneficiary);
  }

  notifyVendorApproved(vendor) {
    // Notify the vendor
    this.notifyUserByAddress(vendor.address, 'vendor-approved', {
      message: 'Your vendor application has been approved!',
      businessName: vendor.businessName
    });

    // Notify admins and verifiers
    this.broadcastToRole('admin', 'vendor-approved', vendor);
    this.broadcastToRole('verifier', 'vendor-approved', vendor);
  }

  notifyPurchaseProcessed(purchase) {
    // Notify the beneficiary
    this.notifyUserByAddress(purchase.beneficiary, 'purchase-processed', {
      message: 'Your purchase has been processed',
      amount: purchase.amount,
      vendor: purchase.vendorName,
      transactionHash: purchase.transactionHash
    });

    // Notify the vendor
    this.notifyUserByAddress(purchase.vendor, 'payment-received', {
      message: 'Payment received for purchase',
      amount: purchase.amount,
      beneficiary: purchase.beneficiaryName,
      transactionHash: purchase.transactionHash
    });

    // Notify verifiers for monitoring
    this.broadcastToRole('verifier', 'purchase-processed', purchase);
  }

  notifyFraudAlert(fraudReport) {
    // Notify admins and verifiers immediately
    this.broadcastToRole('admin', 'fraud-alert', {
      message: 'Fraud alert detected',
      type: fraudReport.type,
      severity: fraudReport.severity,
      reportId: fraudReport._id
    });

    this.broadcastToRole('verifier', 'fraud-alert', {
      message: 'Fraud alert detected',
      type: fraudReport.type,
      severity: fraudReport.severity,
      reportId: fraudReport._id
    });
  }

  notifySystemAlert(alert) {
    // Notify all admins
    this.broadcastToRole('admin', 'system-alert', alert);
  }

  // Get connection statistics
  getConnectionStats() {
    return {
      totalConnections: this.io.sockets.sockets.size,
      authenticatedUsers: this.authenticatedUsers.size,
      uniqueUsers: this.userSockets.size,
      roomCounts: this.getRoomCounts()
    };
  }

  getRoomCounts() {
    const roomCounts = {};
    for (const [roomName, room] of this.io.sockets.adapter.rooms) {
      if (!roomName.startsWith('user:')) { // Exclude individual user rooms from stats
        roomCounts[roomName] = room.size;
      }
    }
    return roomCounts;
  }
}

export default new WebSocketService();