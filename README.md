# 🌍 Blockchain Disaster Relief System

A transparent, blockchain-based disaster relief distribution system that ensures accountability and efficient aid delivery to those in need.

## 🎯 Overview

The Blockchain Disaster Relief System is a comprehensive platform that leverages blockchain technology to create a transparent, efficient, and accountable disaster relief distribution network. The system connects donors, beneficiaries, vendors, verifiers, and administrators in a trustless environment where every transaction is recorded on the blockchain.

### Key Features

- **🔗 Blockchain Transparency**: All transactions recorded on Ethereum blockchain
- **👥 Multi-Role System**: Donors, beneficiaries, vendors, verifiers, and administrators
- **🔒 Secure Authentication**: Wallet-based authentication with role-based access control
- **📊 Real-time Monitoring**: Live transaction tracking and impact visualization
- **🛡️ Fraud Prevention**: Automated fraud detection and reporting system
- **📱 Responsive UI**: Modern, accessible interface for all user types
- **⚡ Real-time Updates**: WebSocket-powered live notifications and status updates

## 🏗️ Architecture

### System Components

```
┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐
│   Frontend      │    │    Backend      │    │  Smart Contracts│
│   (React)       │◄──►│   (Node.js)     │◄──►│   (Solidity)    │
│                 │    │                 │    │                 │
│ • User Interface│    │ • API Server    │    │ • Access Control│
│ • Wallet Connect│    │ • Database      │    │ • Relief Token  │
│ • Real-time UI  │    │ • WebSocket     │    │ • Distribution  │
└─────────────────┘    └─────────────────┘    └─────────────────┘
```

### Technology Stack

**Frontend:**
- React 18 with Vite
- Tailwind CSS for styling
- MetaMask integration
- Socket.io client for real-time updates
- React Router for navigation
- Recharts for data visualization

**Backend:**
- Node.js with Express
- MongoDB for data storage
- Socket.io for real-time communication
- JWT authentication
- Ethers.js for blockchain interaction
- Multer for file uploads

**Blockchain:**
- Solidity smart contracts
- Hardhat development framework
- OpenZeppelin libraries
- ERC-20 token standard
- Role-based access control

## 🚀 Quick Start

### Prerequisites

- Node.js 18+ and npm
- MongoDB 5.0+
- MetaMask browser extension
- Git

### Installation

1. **Clone the repository**
   ```bash
   git clone https://github.com/your-org/blockchain-disaster-relief.git
   cd blockchain-disaster-relief
   ```

2. **Install dependencies**
   ```bash
   # Install root dependencies
   npm install
   
   # Install backend dependencies
   cd backend && npm install && cd ..
   
   # Install frontend dependencies
   cd frontend && npm install && cd ..
   ```

3. **Set up environment variables**
   ```bash
   # Copy environment templates
   cp .env.example .env
   cp backend/.env.example backend/.env
   cp frontend/.env.example frontend/.env
   
   # Edit the .env files with your configuration
   ```

4. **Start local blockchain (for development)**
   ```bash
   npx hardhat node
   ```

5. **Deploy smart contracts**
   ```bash
   npx hardhat run scripts/deploy.js --network localhost
   npx hardhat run scripts/setup.js --network localhost
   ```

6. **Start the application**
   ```bash
   # Start backend server
   cd backend && npm run dev &
   
   # Start frontend development server
   cd frontend && npm run dev
   ```

7. **Access the application**
   - Frontend: http://localhost:5173
   - Backend API: http://localhost:3001
   - API Documentation: http://localhost:3001/api-docs

## 📖 User Guide

### For Donors

1. **Connect Wallet**: Connect your MetaMask wallet
2. **Make Donation**: Enter amount and optional message
3. **Track Impact**: View real-time impact of your donations
4. **View History**: See all your past donations and their outcomes

### For Beneficiaries

1. **Apply for Aid**: Submit application with required documents
2. **Wait for Approval**: Verifiers review your application
3. **Receive Allocation**: Get tokens allocated to your wallet
4. **Spend Funds**: Purchase essentials from approved vendors
5. **Track Spending**: Monitor your spending history and remaining balance

### For Vendors

1. **Register Business**: Submit vendor application with business documents
2. **Get Verified**: Wait for verifier approval
3. **Process Payments**: Accept payments from beneficiaries
4. **Track Transactions**: View all payment history and analytics

### For Verifiers

1. **Review Applications**: Evaluate beneficiary and vendor applications
2. **Approve/Reject**: Make decisions based on provided documentation
3. **Monitor Transactions**: Watch for suspicious activity
4. **Generate Reports**: Create audit reports and analytics

### For Administrators

1. **System Overview**: Monitor overall system health and statistics
2. **User Management**: Manage user roles and permissions
3. **Emergency Controls**: Pause/resume system in emergencies
4. **Fraud Management**: Handle fraud reports and investigations

## 🔧 Configuration

### Environment Variables

Key environment variables to configure:

```bash
# Smart Contract Addresses (set after deployment)
ACCESS_CONTROL_ADDRESS=0x...
RELIEF_TOKEN_ADDRESS=0x...
RELIEF_DISTRIBUTION_ADDRESS=0x...

# Database
MONGODB_URI=mongodb://localhost:27017/disaster-relief

# Security
JWT_SECRET=your-secure-secret
PRIVATE_KEY=0x... # For server operations

# Network
NETWORK=localhost # or sepolia, mainnet
RPC_URL=http://localhost:8545
```

### Smart Contract Configuration

The system uses three main smart contracts:

1. **AccessControl**: Manages user roles and permissions
2. **ReliefToken**: ERC-20 token for aid distribution
3. **ReliefDistribution**: Main contract handling donations and distributions

## 🧪 Testing

### Running Tests

```bash
# Run all tests
npm test

# Run backend tests
cd backend && npm test

# Run frontend tests
cd frontend && npm test

# Run smart contract tests
npx hardhat test

# Run with coverage
npm run test:coverage
```

### Test Categories

- **Unit Tests**: Individual component/function testing
- **Integration Tests**: API endpoint and contract interaction testing
- **Property Tests**: Blockchain property verification using fast-check
- **End-to-End Tests**: Complete user workflow testing

## 📊 API Documentation

### Authentication

All API endpoints require JWT authentication obtained through wallet signature verification.

```javascript
// Authentication flow
POST /api/auth/login
{
  "address": "0x...",
  "signature": "0x...",
  "message": "Login message"
}
```

### Key Endpoints

**Donor Endpoints:**
- `POST /api/donors/donate` - Process donation
- `GET /api/donors/history` - Get donation history
- `GET /api/donors/impact` - Get impact statistics

**Beneficiary Endpoints:**
- `POST /api/beneficiaries/apply` - Submit application
- `GET /api/beneficiaries/balance` - Get token balance
- `POST /api/beneficiaries/spend` - Process spending

**Vendor Endpoints:**
- `POST /api/vendors/register` - Register as vendor
- `POST /api/vendors/process-payment` - Process beneficiary payment
- `GET /api/vendors/transactions` - Get transaction history

**Admin Endpoints:**
- `GET /api/admin/stats` - System statistics
- `POST /api/admin/users/:id/role` - Manage user roles
- `GET /api/admin/audit/logs` - Audit logs

## 🔒 Security

### Security Measures

- **Wallet Authentication**: Cryptographic signature verification
- **Role-Based Access**: Smart contract enforced permissions
- **Rate Limiting**: API request throttling
- **Input Validation**: Comprehensive data validation
- **Fraud Detection**: Automated suspicious activity detection
- **Audit Logging**: Complete transaction and action logging

### Security Best Practices

1. **Never share private keys**
2. **Use hardware wallets for production**
3. **Regularly update dependencies**
4. **Monitor for suspicious activity**
5. **Implement proper backup strategies**
6. **Use HTTPS in production**
7. **Regular security audits**

## 🚀 Deployment

### Production Deployment

1. **Prepare Environment**
   ```bash
   # Set production environment variables
   export NODE_ENV=production
   export MONGODB_URI=mongodb://your-production-db
   export JWT_SECRET=your-production-secret
   ```

2. **Deploy Smart Contracts**
   ```bash
   # Deploy to testnet (Sepolia)
   npx hardhat run scripts/deploy.js --network sepolia
   
   # Verify contracts
   npx hardhat run scripts/verify.js --network sepolia
   ```

3. **Build Applications**
   ```bash
   # Build frontend
   cd frontend && npm run build
   
   # Build backend (if needed)
   cd backend && npm run build
   ```

4. **Deploy to Cloud**
   - Frontend: Deploy to Vercel, Netlify, or AWS S3
   - Backend: Deploy to AWS EC2, Google Cloud, or Heroku
   - Database: Use MongoDB Atlas or self-hosted MongoDB

### Docker Deployment

```bash
# Build and run with Docker Compose
docker-compose up -d
```

## 📈 Monitoring

### System Monitoring

- **Application Metrics**: Response times, error rates, throughput
- **Blockchain Metrics**: Transaction success rates, gas usage
- **Business Metrics**: Donation amounts, beneficiary counts, vendor activity
- **Security Metrics**: Failed authentication attempts, fraud alerts

### Logging

- **Application Logs**: Server logs with structured logging
- **Audit Logs**: All user actions and system changes
- **Transaction Logs**: Blockchain transaction records
- **Error Logs**: Application errors and exceptions

## 🤝 Contributing

We welcome contributions! Please see our [Contributing Guide](CONTRIBUTING.md) for details.

### Development Workflow

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Add tests for new functionality
5. Ensure all tests pass
6. Submit a pull request

### Code Standards

- **JavaScript**: ESLint with Airbnb config
- **Solidity**: Solhint for smart contracts
- **Testing**: Minimum 80% code coverage
- **Documentation**: JSDoc for functions and APIs

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 🆘 Support

### Getting Help

- **Documentation**: Check this README and inline code comments
- **Issues**: Create a GitHub issue for bugs or feature requests
- **Discussions**: Use GitHub Discussions for questions
- **Email**: Contact us at support@disaster-relief.org

### Common Issues

**MetaMask Connection Issues:**
- Ensure MetaMask is installed and unlocked
- Check that you're on the correct network
- Clear browser cache and try again

**Transaction Failures:**
- Check gas fees and wallet balance
- Ensure contracts are deployed and addresses are correct
- Verify network connectivity

**API Errors:**
- Check backend server is running
- Verify environment variables are set correctly
- Check database connectivity

## 🗺️ Roadmap

### Phase 1 (Current)
- ✅ Core system implementation
- ✅ Basic fraud detection
- ✅ Real-time notifications
- ✅ Multi-role dashboard

### Phase 2 (Next)
- 🔄 Mobile application
- 🔄 Advanced analytics
- 🔄 Multi-language support
- 🔄 Integration with external aid organizations

### Phase 3 (Future)
- 📋 Cross-chain compatibility
- 📋 AI-powered fraud detection
- 📋 Automated compliance reporting
- 📋 Global disaster response network

## 📊 Statistics

Current system capabilities:
- **Users**: Unlimited with role-based access
- **Transactions**: Real-time blockchain processing
- **Scalability**: Horizontal scaling support
- **Uptime**: 99.9% target availability
- **Security**: Multi-layer security implementation

---

**Built with ❤️ for disaster relief and humanitarian aid**

For more information, visit our [website](https://disaster-relief.org) or contact us at [info@disaster-relief.org](mailto:info@disaster-relief.org).