# Contributing to Blockchain Disaster Relief System

Thank you for your interest in contributing to our blockchain disaster relief platform! This document provides guidelines for contributing to the project.

## 🤝 How to Contribute

### Reporting Issues

1. **Check existing issues** first to avoid duplicates
2. **Use the issue template** when creating new issues
3. **Provide detailed information** including:
   - Steps to reproduce
   - Expected vs actual behavior
   - Environment details (OS, browser, Node.js version)
   - Screenshots or error logs if applicable

### Submitting Pull Requests

1. **Fork the repository** and create your branch from `main`
2. **Follow the naming convention**: `feature/description` or `fix/description`
3. **Make your changes** following our coding standards
4. **Add tests** for new functionality
5. **Update documentation** if needed
6. **Ensure all tests pass** before submitting
7. **Submit a pull request** with a clear description

## 🛠️ Development Setup

### Prerequisites

- Node.js 18+
- npm or yarn
- Git
- MetaMask browser extension

### Local Development

```bash
# Clone your fork
git clone https://github.com/yourusername/blockchain-disaster-relief.git
cd blockchain-disaster-relief

# Install dependencies
npm run install:all

# Set up environment variables
cp .env.example .env
cp frontend/.env.example frontend/.env
cp backend/.env.example backend/.env

# Start development servers
npm run dev
```

## 📝 Coding Standards

### JavaScript/React

- Use ES6+ features
- Follow ESLint configuration
- Use functional components with hooks
- Write descriptive variable and function names
- Add JSDoc comments for complex functions

### Solidity

- Follow Solidity style guide
- Use latest stable version (0.8.20+)
- Include comprehensive NatSpec documentation
- Implement proper access controls
- Add events for important state changes

### Git Commit Messages

Follow conventional commits format:

```
type(scope): description

[optional body]

[optional footer]
```

Types:
- `feat`: New feature
- `fix`: Bug fix
- `docs`: Documentation changes
- `style`: Code style changes
- `refactor`: Code refactoring
- `test`: Adding or updating tests
- `chore`: Maintenance tasks

Examples:
```
feat(frontend): add donor dashboard with donation history
fix(contracts): resolve reentrancy vulnerability in purchase function
docs(readme): update installation instructions
```

## 🧪 Testing Guidelines

### Smart Contracts

- Write comprehensive unit tests using Hardhat
- Test both success and failure scenarios
- Include gas usage tests for optimization
- Test access control and permissions
- Use property-based testing where applicable

### Frontend

- Write component tests using React Testing Library
- Test user interactions and state changes
- Mock external dependencies (Web3, API calls)
- Test responsive design on different screen sizes

### Backend

- Write API tests using Jest and Supertest
- Test authentication and authorization
- Test error handling and edge cases
- Mock blockchain interactions for unit tests

## 🔒 Security Guidelines

### Smart Contract Security

- Follow OpenZeppelin security practices
- Implement proper access controls
- Use reentrancy guards where needed
- Validate all inputs and state changes
- Consider front-running and MEV attacks

### Backend Security

- Validate and sanitize all inputs
- Use parameterized queries for database operations
- Implement proper authentication and authorization
- Use HTTPS in production
- Keep dependencies updated

### Frontend Security

- Sanitize user inputs to prevent XSS
- Validate data from APIs
- Use secure communication with backend
- Handle private keys securely (never store in code)

## 📚 Documentation

### Code Documentation

- Add JSDoc comments for functions and classes
- Document complex algorithms and business logic
- Include examples in documentation
- Keep README files updated

### API Documentation

- Document all endpoints with request/response examples
- Include authentication requirements
- Document error codes and messages
- Use OpenAPI/Swagger specification

## 🎯 Feature Development Process

### 1. Planning Phase

- Discuss feature requirements in GitHub issues
- Create technical design document if needed
- Get approval from maintainers before starting

### 2. Development Phase

- Create feature branch from `main`
- Implement feature following coding standards
- Write comprehensive tests
- Update documentation

### 3. Review Phase

- Submit pull request with detailed description
- Address review feedback promptly
- Ensure CI/CD checks pass
- Get approval from at least one maintainer

### 4. Deployment Phase

- Merge to `main` branch
- Deploy to staging environment for testing
- Deploy to production after validation

## 🐛 Bug Fix Process

### 1. Identification

- Reproduce the bug consistently
- Identify root cause
- Assess impact and priority

### 2. Fix Development

- Create fix branch from `main`
- Implement minimal fix
- Add regression tests
- Verify fix doesn't break existing functionality

### 3. Testing

- Test fix in isolation
- Run full test suite
- Test on different environments
- Get peer review

## 🚀 Release Process

### Version Numbering

We follow Semantic Versioning (SemVer):
- `MAJOR.MINOR.PATCH`
- Major: Breaking changes
- Minor: New features (backward compatible)
- Patch: Bug fixes (backward compatible)

### Release Steps

1. Update version numbers in package.json files
2. Update CHANGELOG.md with release notes
3. Create release branch
4. Run full test suite
5. Deploy to staging for final testing
6. Create GitHub release with tag
7. Deploy to production
8. Announce release

## 📞 Getting Help

### Communication Channels

- **GitHub Issues**: Bug reports and feature requests
- **GitHub Discussions**: General questions and discussions
- **Discord**: Real-time chat with community
- **Email**: security@yourproject.com for security issues

### Maintainers

- [@maintainer1](https://github.com/maintainer1) - Lead Developer
- [@maintainer2](https://github.com/maintainer2) - Smart Contract Specialist
- [@maintainer3](https://github.com/maintainer3) - Frontend Lead

## 📄 License

By contributing to this project, you agree that your contributions will be licensed under the MIT License.

## 🙏 Recognition

Contributors will be recognized in:
- README.md contributors section
- Release notes for significant contributions
- Annual contributor appreciation posts

Thank you for helping make disaster relief more transparent and effective! 🌍❤️