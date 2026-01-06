import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';
import compression from 'compression';
import rateLimit from 'express-rate-limit';
import { createServer } from 'http';
import { Server } from 'socket.io';
import dotenv from 'dotenv';
import 'express-async-errors';

// Import database
import database from './models/database.js';

// Import blockchain service
import blockchainService from './services/blockchain.js';

// Import WebSocket service
import websocketService from './services/websocket.js';

// Import routes
import authRoutes from './routes/auth.js';
import donorRoutes from './routes/donors.js';
import beneficiaryRoutes from './routes/beneficiaries.js';
import vendorRoutes from './routes/vendors.js';
import adminRoutes from './routes/admin.js';
import publicRoutes from './routes/public.js';
import fraudRoutes from './routes/fraud.js';

// Import middleware
import { errorHandler } from './middleware/errorHandler.js';
import { notFound } from './middleware/notFound.js';

// Load environment variables
dotenv.config();

const app = express();
const server = createServer(app);
const io = new Server(server, {
  cors: {
    origin: process.env.CORS_ORIGIN || "http://localhost:5173",
    methods: ["GET", "POST"]
  }
});

// Connect to database
async function connectDatabase() {
  try {
    await database.connect();
    console.log('✅ Database connected successfully');
  } catch (error) {
    console.error('❌ Failed to connect to database:', error.message);
    console.log('⚠️ Continuing without database - some features may be limited');
    // Don't exit process - continue without database
  }
}

// Initialize blockchain service
async function initializeBlockchain() {
  try {
    await blockchainService.initialize();
  } catch (error) {
    console.error('❌ Failed to initialize blockchain service:', error);
    // Don't exit process - blockchain service can work in degraded mode
  }
}

// Security middleware
app.use(helmet());
app.use(cors({
  origin: process.env.CORS_ORIGIN || "http://localhost:5173",
  credentials: true
}));

// Rate limiting
const limiter = rateLimit({
  windowMs: parseInt(process.env.API_RATE_LIMIT_WINDOW_MS) || 15 * 60 * 1000, // 15 minutes
  max: parseInt(process.env.API_RATE_LIMIT_MAX_REQUESTS) || 100, // limit each IP to 100 requests per windowMs
  message: 'Too many requests from this IP, please try again later.',
  standardHeaders: true,
  legacyHeaders: false,
});
app.use('/api/', limiter);

// General middleware
app.use(compression());
app.use(morgan('combined'));
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));

// Health check endpoint
app.get('/health', (req, res) => {
  res.status(200).json({
    status: 'OK',
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    database: database.isConnected() ? 'connected' : 'disconnected',
    blockchain: blockchainService.isReady() ? 'ready' : 'not ready',
    environment: process.env.NODE_ENV || 'development'
  });
});

// Root route for health check
app.get('/', (req, res) => {
  res.json({
    message: 'ReliefChain Backend API',
    status: 'running',
    version: '1.0.0',
    endpoints: {
      auth: '/api/auth',
      donors: '/api/donors',
      beneficiaries: '/api/beneficiaries',
      vendors: '/api/vendors',
      admin: '/api/admin',
      public: '/api/public',
      fraud: '/api/fraud'
    }
  });
});

// API routes
app.use('/api/auth', authRoutes);
app.use('/api/donors', donorRoutes);
app.use('/api/beneficiaries', beneficiaryRoutes);
app.use('/api/vendors', vendorRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api/public', publicRoutes);
app.use('/api/fraud', fraudRoutes);

// WebSocket connection handling
websocketService.initialize(io);

// Make io and websocket service accessible to routes
app.set('io', io);
app.set('websocket', websocketService);

// Set up blockchain event listeners
if (blockchainService.isReady()) {
  blockchainService.setupEventListeners();
}

// Error handling middleware
app.use(notFound);
app.use(errorHandler);

// Graceful shutdown
process.on('SIGTERM', async () => {
  console.log('🛑 SIGTERM received, shutting down gracefully');
  server.close(async () => {
    await database.disconnect();
    process.exit(0);
  });
});

process.on('SIGINT', async () => {
  console.log('🛑 SIGINT received, shutting down gracefully');
  server.close(async () => {
    await database.disconnect();
    process.exit(0);
  });
});

const PORT = process.env.PORT || 3001;

// Start server
async function startServer() {
  try {
    await connectDatabase();
    await initializeBlockchain();
    
    server.listen(PORT, () => {
      console.log(`🚀 Server running on port ${PORT}`);
      console.log(`📊 Environment: ${process.env.NODE_ENV || 'development'}`);
      console.log(`🔗 CORS enabled for: ${process.env.CORS_ORIGIN || 'http://localhost:5173'}`);
      console.log(`💾 Database: ${database.isConnected() ? 'Connected' : 'Disconnected'}`);
      console.log(`⛓️ Blockchain: ${blockchainService.isReady() ? 'Ready' : 'Not Ready'}`);
    });
  } catch (error) {
    console.error('❌ Failed to start server:', error);
    // Try to start server anyway
    server.listen(PORT, () => {
      console.log(`🚀 Server running on port ${PORT} (degraded mode)`);
      console.log(`📊 Environment: ${process.env.NODE_ENV || 'development'}`);
      console.log(`🔗 CORS enabled for: ${process.env.CORS_ORIGIN || 'http://localhost:5173'}`);
      console.log(`💾 Database: Disconnected`);
      console.log(`⛓️ Blockchain: Not Ready`);
    });
  }
}

startServer();

// Export app for testing
export default app;