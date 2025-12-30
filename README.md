# 🌍 Blockchain Disaster Relief Distribution System

> Transparent, accountable disaster relief funding using blockchain technology and stablecoins

[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
[![Node.js](https://img.shields.io/badge/Node.js-18+-green.svg)](https://nodejs.org/)
[![React](https://img.shields.io/badge/React-18+-blue.svg)](https://reactjs.org/)
[![Solidity](https://img.shields.io/badge/Solidity-0.8+-purple.svg)](https://soliditylang.org/)

## 🚀 Problem Statement

Traditional disaster relief systems suffer from:
- **Lack of transparency** in fund distribution
- **Corruption and mismanagement** of donations
- **Slow and bureaucratic** distribution processes
- **No accountability** for fund usage
- **Limited tracking** of impact and effectiveness

## 💡 Our Solution

A blockchain-based platform that ensures:
- ✅ **Complete transparency** - All transactions publicly auditable
- ✅ **Smart contract automation** - Eliminates human error and corruption
- ✅ **Stablecoin payments** - Fast, borderless, and stable value transfers
- ✅ **Role-based access** - Secure permissions for all stakeholders
- ✅ **Spending restrictions** - Funds only used for essential categories
- ✅ **Real-time tracking** - Live updates on fund distribution and usage

## 🏗️ Tech Stack

### Frontend
- **React 18** with **Vite** - Fast, modern UI development
- **Tailwind CSS** - Utility-first styling framework
- **MetaMask Integration** - Seamless wallet connectivity
- **React Router** - Client-side routing
- **Socket.io Client** - Real-time updates

### Backend
- **Node.js** with **Express** - RESTful API server
- **MongoDB** - Document database for off-chain data
- **Socket.io** - WebSocket real-time communication
- **JWT Authentication** - Secure user sessions
- **Web3.js** - Blockchain interaction layer

### Blockchain
- **Solidity** - Smart contract development
- **Hardhat** - Development framework and testing
- **OpenZeppelin** - Security-audited contract libraries
- **Ethereum Testnet** - Deployment target (Sepolia/Goerli)

## 📁 Project Structure

```
blockchain-disaster-relief/
├── 📂 frontend/                 # React frontend application
│   ├── 📂 src/
│   │   ├── 📂 components/      # Reusable UI components
│   │   │   ├── 📂 common/     # Shared components
│   │   │   ├── 📂 donor/      # Donor-specific components
│   │   │   ├── 📂 beneficiary/ # Beneficiary components
│   │   │   ├── 📂 admin/      # Admin panel components
│   │   │   └── 📂 public/     # Public dashboard components
│   │   ├── 📂 pages/          # Page-level components
│   │   ├── 📂 hooks/          # Custom React hooks
│   │   ├── 📂 utils/          # Utility functions
│   │   ├── 📄 App.jsx         # Main app component
│   │   └── 📄 main.jsx        # Entry point
│   ├── 📂 public/             # Static assets
│   └── 📄 package.json
├── 📂 backend/                  # Node.js backend
│   ├── 📂 controllers/        # Request handlers
│   ├── 📂 routes/             # API routes
│   ├── 📂 services/           # Business logic
│   ├── 📂 middleware/         # Express middleware
│   ├── 📂 models/             # Database models
│   └── 📄 server.js           # Server entry point
├── 📂 contracts/               # Solidity smart contracts
│   ├── 📄 ReliefToken.sol     # ERC-20 stablecoin
│   ├── 📄 ReliefDistribution.sol # Main distribution logic
│   └── 📄 AccessControl.sol   # Role management
├── 📂 scripts/                # Deployment scripts
├── 📂 test/                   # Test files
├── 📄 hardhat.config.js       # Hardhat configuration
├── 📄 .gitignore             # Git ignore rules
└── 📄 README.md              # This file
```

## 🎯 Key Features

### For Donors 💰
- Connect wallet and donate stablecoins
- Track donation history and impact
- Real-time transparency dashboard
- Verify fund usage on blockchain

### For Beneficiaries 🏠
- Apply for relief funds with verification
- Receive allocated funds to wallet
- Spend only on essential categories
- View spending history and balance

### For Verifiers 👥
- Review and approve beneficiary applications
- Validate vendor legitimacy
- Monitor transactions for audit
- Flag suspicious activities

### For Admins 🛡️
- Manage system configuration
- Add/remove verifiers and vendors
- Monitor system health and statistics
- Emergency controls and system pause

### For Vendors 🏪
- Register and get verified
- Accept payments from beneficiaries
- View transaction history
- Fraud prevention measures

### For Public 🌐
- View aggregate donation statistics
- Search and filter transactions
- Verify blockchain records
- Export audit reports

## 🔧 Quick Start

### Prerequisites
- Node.js 18+
- npm or yarn
- MetaMask browser extension
- Git

### Installation

1. **Clone the repository**
```bash
git clone https://github.com/yourusername/blockchain-disaster-relief.git
cd blockchain-disaster-relief
```

2. **Install dependencies**
```bash
# Install root dependencies
npm install

# Install frontend dependencies
cd frontend && npm install && cd ..

# Install backend dependencies
cd backend && npm install && cd ..
```

3. **Set up environment variables**
```bash
# Copy environment templates
cp .env.example .env
cp frontend/.env.example frontend/.env
cp backend/.env.example backend/.env

# Edit the .env files with your configuration
```

4. **Start local blockchain**
```bash
npx hardhat node
```

5. **Deploy smart contracts**
```bash
npx hardhat run scripts/deploy.js --network localhost
```

6. **Start the backend server**
```bash
cd backend && npm run dev
```

7. **Start the frontend application**
```bash
cd frontend && npm run dev
```

8. **Open your browser**
Navigate to `http://localhost:5173` and connect your MetaMask wallet.

## 🧪 Testing

### Run Smart Contract Tests
```bash
npx hardhat test
```

### Run Backend Tests
```bash
cd backend && npm test
```

### Run Frontend Tests
```bash
cd frontend && npm test
```

### Run All Tests
```bash
npm run test:all
```

## 📊 Smart Contract Architecture

### ReliefToken.sol
- ERC-20 compliant stablecoin
- Controlled minting for disaster relief
- Transfer restrictions based on roles
- Burn functionality for completed distributions

### ReliefDistribution.sol
- Main business logic contract
- Beneficiary registration and approval
- Fund allocation and spending validation
- Vendor management and payment processing
- Emergency controls and system pause

### AccessControl.sol
- Role-based permission system
- Admin, Verifier, Beneficiary, Vendor roles
- Secure role assignment and revocation
- Permission enforcement across all functions

## 🔐 Security Features

- **Multi-signature wallets** for admin functions
- **Role-based access control** for all operations
- **Spending category restrictions** enforced by smart contracts
- **Fraud detection algorithms** for suspicious transactions
- **Emergency pause functionality** for system protection
- **Audit trails** for all transactions and state changes

## 🌟 Future Roadmap

### Phase 1 (Current)
- ✅ Core smart contract functionality
- ✅ Basic frontend interface
- ✅ Backend API development
- ✅ MetaMask integration

### Phase 2 (Next 3 months)
- 🔄 Mobile application development
- 🔄 Multi-language support
- 🔄 Advanced analytics dashboard
- 🔄 Integration with major stablecoin providers

### Phase 3 (6 months)
- 🔄 Cross-chain compatibility
- 🔄 AI-powered fraud detection
- 🔄 Automated disaster response triggers
- 🔄 Partnership with NGOs and governments

### Phase 4 (1 year)
- 🔄 Decentralized governance (DAO)
- 🔄 Insurance integration
- 🔄 Predictive disaster modeling
- 🔄 Global disaster relief network

## 🤝 Contributing

We welcome contributions from the community! Please read our [Contributing Guidelines](CONTRIBUTING.md) for details on how to submit pull requests, report issues, and suggest improvements.

### Development Workflow
1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 🏆 Hackathon Submission

### Team Information
- **Team Name**: [Your Team Name]
- **Team Members**: [List team members]
- **Contact**: [Contact information]

### Submission Details
- **Category**: Blockchain for Social Good
- **Demo URL**: [Live demo link]
- **Video Demo**: [Video demonstration link]
- **Presentation**: [Presentation slides link]

### Technical Achievements
- ✅ Complete smart contract implementation
- ✅ Full-stack web application
- ✅ MetaMask wallet integration
- ✅ Real-time transaction monitoring
- ✅ Comprehensive testing suite
- ✅ Production-ready deployment

## 📞 Support & Contact

- **Documentation**: [Link to detailed docs]
- **Discord**: [Community Discord server]
- **Email**: [Contact email]
- **Twitter**: [@YourProject](https://twitter.com/yourproject)

---

**Built with ❤️ for transparent disaster relief**

*Making every donation count, every transaction transparent, and every beneficiary empowered.*