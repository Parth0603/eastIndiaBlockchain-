# 🔌 API Documentation

This document provides comprehensive documentation for the Blockchain Disaster Relief System API.

## 📋 Table of Contents

- [Authentication](#authentication)
- [Error Handling](#error-handling)
- [Rate Limiting](#rate-limiting)
- [WebSocket Events](#websocket-events)
- [Donor Endpoints](#donor-endpoints)
- [Beneficiary Endpoints](#beneficiary-endpoints)
- [Vendor Endpoints](#vendor-endpoints)
- [Verifier Endpoints](#verifier-endpoints)
- [Admin Endpoints](#admin-endpoints)
- [Public Endpoints](#public-endpoints)
- [Fraud Endpoints](#fraud-endpoints)

## 🔐 Authentication

All API endpoints (except public ones) require JWT authentication obtained through wallet signature verification.

### Login Process

```http
POST /api/auth/login
Content-Type: application/json

{
  "address": "0x742d35Cc6634C0532925a3b8D0C9e3e4C4c4c4c4",
  "signature": "0x...",
  "message": "Login to Disaster Relief System"
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
    "user": {
      "id": "user_id",
      "address": "0x742d35Cc6634C0532925a3b8D0C9e3e4C4c4c4c4",
      "role": "donor"
    }
  }
}
```

### Using Authentication Token

Include the JWT token in the Authorization header:

```http
Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
```

## ❌ Error Handling

All API responses follow a consistent error format:

```json
{
  "success": false,
  "message": "Error description",
  "error": "Detailed error information",
  "code": "ERROR_CODE"
}
```

### HTTP Status Codes

- `200` - Success
- `201` - Created
- `400` - Bad Request
- `401` - Unauthorized
- `403` - Forbidden
- `404` - Not Found
- `429` - Too Many Requests
- `500` - Internal Server Error

## 🚦 Rate Limiting

API requests are rate-limited to prevent abuse:

- **Window**: 15 minutes
- **Limit**: 100 requests per IP address
- **Headers**: Rate limit information is included in response headers

```http
X-RateLimit-Limit: 100
X-RateLimit-Remaining: 95
X-RateLimit-Reset: 1640995200
```

## 🔄 WebSocket Events

Real-time events are broadcast via WebSocket connection.

### Connection

```javascript
const socket = io('http://localhost:3001', {
  auth: {
    token: 'your-jwt-token'
  }
});
```

### Events

#### Transaction Updates
```javascript
socket.on('transaction-update', (data) => {
  // data: { transactionHash, status, type, details }
});
```

#### Donation Events
```javascript
socket.on('donation-confirmed', (data) => {
  // data: { donor, amount, transactionHash, timestamp }
});
```

#### Application Events
```javascript
socket.on('application-approved', (data) => {
  // data: { message, allocatedAmount, timestamp }
});
```

#### Fraud Alerts
```javascript
socket.on('fraud-alert', (data) => {
  // data: { reportId, type, severity, message }
});
```

## 💰 Donor Endpoints

### Process Donation

```http
POST /api/donors/donate
Authorization: Bearer <token>
Content-Type: application/json

{
  "amount": "100.50",
  "transactionHash": "0x...",
  "donor": "0x742d35Cc6634C0532925a3b8D0C9e3e4C4c4c4c4"
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "donationId": "donation_id",
    "amount": "100.50",
    "status": "confirmed",
    "transactionHash": "0x..."
  }
}
```

### Get Donation History

```http
GET /api/donors/history?page=1&limit=20
Authorization: Bearer <token>
```

**Response:**
```json
{
  "success": true,
  "data": {
    "donations": [
      {
        "id": "donation_id",
        "amount": "100.50",
        "timestamp": "2024-01-01T00:00:00Z",
        "transactionHash": "0x...",
        "status": "confirmed"
      }
    ],
    "pagination": {
      "page": 1,
      "limit": 20,
      "total": 50,
      "pages": 3
    }
  }
}
```

### Get Impact Statistics

```http
GET /api/donors/impact
Authorization: Bearer <token>
```

**Response:**
```json
{
  "success": true,
  "data": {
    "totalDonated": "1000.00",
    "beneficiariesHelped": 25,
    "categoriesSupported": ["food", "water", "shelter"],
    "impactMetrics": {
      "mealsProvided": 500,
      "familiesHelped": 25,
      "emergencyKitsDistributed": 10
    }
  }
}
```

## 🏠 Beneficiary Endpoints

### Submit Application

```http
POST /api/beneficiaries/apply
Authorization: Bearer <token>
Content-Type: multipart/form-data

{
  "disasterType": "earthquake",
  "location": "City, Country",
  "requestedAmount": "500.00",
  "description": "Family of 4 lost home in earthquake",
  "priority": "high",
  "documents": [file1, file2]
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "applicationId": "app_id",
    "status": "pending",
    "submittedAt": "2024-01-01T00:00:00Z"
  }
}
```

### Get Balance

```http
GET /api/beneficiaries/balance
Authorization: Bearer <token>
```

**Response:**
```json
{
  "success": true,
  "data": {
    "allocated": "500.00",
    "spent": "150.00",
    "remaining": "350.00",
    "lastUpdated": "2024-01-01T00:00:00Z"
  }
}
```

### Process Spending

```http
POST /api/beneficiaries/spend
Authorization: Bearer <token>
Content-Type: application/json

{
  "vendor": "0x...",
  "amount": "50.00",
  "category": "food",
  "description": "Groceries for family",
  "transactionHash": "0x..."
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "spendingId": "spending_id",
    "amount": "50.00",
    "remainingBalance": "300.00",
    "transactionHash": "0x..."
  }
}
```

## 🏪 Vendor Endpoints

### Register as Vendor

```http
POST /api/vendors/register
Authorization: Bearer <token>
Content-Type: multipart/form-data

{
  "businessName": "Local Grocery Store",
  "businessType": "retail",
  "registrationNumber": "REG123456",
  "categories": ["food", "water"],
  "contactInfo": {
    "email": "vendor@example.com",
    "phone": "+1234567890",
    "address": "123 Main St, City"
  },
  "documents": [license, certificate]
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "vendorId": "vendor_id",
    "status": "pending",
    "submittedAt": "2024-01-01T00:00:00Z"
  }
}
```

### Process Payment

```http
POST /api/vendors/process-payment
Authorization: Bearer <token>
Content-Type: application/json

{
  "beneficiary": "0x...",
  "amount": "50.00",
  "category": "food",
  "description": "Groceries",
  "transactionHash": "0x..."
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "paymentId": "payment_id",
    "amount": "50.00",
    "status": "confirmed",
    "transactionHash": "0x..."
  }
}
```

### Get Transaction History

```http
GET /api/vendors/transactions?page=1&limit=20
Authorization: Bearer <token>
```

**Response:**
```json
{
  "success": true,
  "data": {
    "transactions": [
      {
        "id": "tx_id",
        "beneficiary": "0x...",
        "amount": "50.00",
        "category": "food",
        "timestamp": "2024-01-01T00:00:00Z",
        "status": "confirmed"
      }
    ],
    "pagination": {
      "page": 1,
      "limit": 20,
      "total": 100,
      "pages": 5
    }
  }
}
```

## 🔍 Verifier Endpoints

### Get Pending Applications

```http
GET /api/admin/verifier/applications?status=pending&page=1&limit=20
Authorization: Bearer <token>
```

**Response:**
```json
{
  "success": true,
  "data": {
    "applications": [
      {
        "id": "app_id",
        "applicantAddress": "0x...",
        "applicantName": "John Doe",
        "disasterType": "earthquake",
        "requestedAmount": "500.00",
        "priority": "high",
        "submittedAt": "2024-01-01T00:00:00Z",
        "documents": [...]
      }
    ],
    "pagination": {...}
  }
}
```

### Review Application

```http
POST /api/admin/verifier/applications/:applicationId/review
Authorization: Bearer <token>
Content-Type: application/json

{
  "decision": "approve",
  "comments": "Application approved based on documentation",
  "allocatedAmount": "500.00"
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "applicationId": "app_id",
    "status": "approved",
    "decision": "approve",
    "allocatedAmount": "500.00",
    "reviewedAt": "2024-01-01T00:00:00Z"
  }
}
```

### Monitor Transactions

```http
GET /api/admin/verifier/transactions/monitor?page=1&limit=50&flagged=true
Authorization: Bearer <token>
```

**Response:**
```json
{
  "success": true,
  "data": {
    "transactions": [
      {
        "id": "tx_id",
        "type": "spending",
        "amount": "50.00",
        "from": "0x...",
        "to": "0x...",
        "flagged": true,
        "flagReason": "Unusual spending pattern",
        "timestamp": "2024-01-01T00:00:00Z"
      }
    ],
    "summary": {
      "totalTransactions": 1000,
      "flaggedCount": 5
    }
  }
}
```

## 👑 Admin Endpoints

### Get System Statistics

```http
GET /api/admin/stats
Authorization: Bearer <token>
```

**Response:**
```json
{
  "success": true,
  "data": {
    "overview": {
      "totalUsers": 1000,
      "totalDonations": 500,
      "totalSpending": 300,
      "pendingApplications": 25
    },
    "financial": {
      "totalDonated": "50000.00",
      "totalSpent": "30000.00",
      "availableFunds": "20000.00"
    },
    "categories": [
      {
        "category": "food",
        "totalSpent": "15000.00",
        "transactionCount": 150
      }
    ]
  }
}
```

### Manage User Roles

```http
POST /api/admin/users/:userId/role
Authorization: Bearer <token>
Content-Type: application/json

{
  "role": "verifier",
  "action": "grant"
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "userId": "user_id",
    "userAddress": "0x...",
    "newRole": "verifier",
    "action": "grant"
  }
}
```

### Emergency Controls

```http
POST /api/admin/emergency/pause
Authorization: Bearer <token>
Content-Type: application/json

{
  "pause": true,
  "reason": "Security incident detected"
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "emergencyState": {
      "isPaused": true,
      "pausedAt": "2024-01-01T00:00:00Z",
      "reason": "Security incident detected"
    }
  }
}
```

### WebSocket Statistics

```http
GET /api/admin/websocket/stats
Authorization: Bearer <token>
```

**Response:**
```json
{
  "success": true,
  "data": {
    "totalConnections": 150,
    "authenticatedUsers": 145,
    "uniqueUsers": 140,
    "roomCounts": {
      "role:admin": 5,
      "role:verifier": 10,
      "role:beneficiary": 80,
      "role:vendor": 30,
      "role:donor": 20
    },
    "timestamp": "2024-01-01T00:00:00Z"
  }
}
```

## 🌍 Public Endpoints

### Get Public Statistics

```http
GET /api/public/stats
```

**Response:**
```json
{
  "success": true,
  "data": {
    "totalDonations": "100000.00",
    "totalBeneficiaries": 500,
    "totalVendors": 50,
    "totalDistributed": "80000.00",
    "activeDisasters": 3
  }
}
```

### Search Transactions

```http
GET /api/public/transactions?search=0x...&page=1&limit=20
```

**Response:**
```json
{
  "success": true,
  "data": {
    "transactions": [
      {
        "id": "tx_id",
        "type": "donation",
        "amount": "100.00",
        "timestamp": "2024-01-01T00:00:00Z",
        "transactionHash": "0x...",
        "verified": true
      }
    ],
    "pagination": {...}
  }
}
```

## 🛡️ Fraud Endpoints

### Submit Fraud Report

```http
POST /api/fraud/report
Authorization: Bearer <token>
Content-Type: application/json

{
  "reportedEntity": "0x...",
  "entityType": "vendor",
  "reportType": "suspicious_activity",
  "severity": "high",
  "description": "Vendor charging excessive prices",
  "evidence": [
    {
      "type": "screenshot",
      "description": "Price comparison",
      "data": "base64_image_data"
    }
  ],
  "isAnonymous": false
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "reportId": "FR-2024-001",
    "status": "submitted",
    "priority": "high"
  }
}
```

### Get Fraud Reports (Admin/Verifier)

```http
GET /api/fraud/reports?status=pending&severity=high&page=1&limit=20
Authorization: Bearer <token>
```

**Response:**
```json
{
  "success": true,
  "data": {
    "reports": [
      {
        "reportId": "FR-2024-001",
        "entityType": "vendor",
        "reportType": "suspicious_activity",
        "severity": "high",
        "status": "under_investigation",
        "createdAt": "2024-01-01T00:00:00Z"
      }
    ],
    "summary": {
      "pending": 5,
      "under_investigation": 3,
      "resolved": 10
    }
  }
}
```

### Get Flagged Transactions

```http
GET /api/fraud/flagged-transactions?riskLevel=high&page=1&limit=20
Authorization: Bearer <token>
```

**Response:**
```json
{
  "success": true,
  "data": {
    "flaggedTransactions": [
      {
        "id": "tx_id",
        "txHash": "0x...",
        "from": "0x...",
        "to": "0x...",
        "amount": "500.00",
        "riskLevel": "high",
        "fraudFlags": ["unusual_amount", "new_vendor"],
        "requiresReview": true,
        "createdAt": "2024-01-01T00:00:00Z"
      }
    ],
    "pagination": {...}
  }
}
```

## 📊 Response Formats

### Success Response
```json
{
  "success": true,
  "data": {
    // Response data
  },
  "message": "Optional success message"
}
```

### Error Response
```json
{
  "success": false,
  "message": "Error description",
  "error": "Detailed error information",
  "code": "ERROR_CODE"
}
```

### Pagination Format
```json
{
  "pagination": {
    "page": 1,
    "limit": 20,
    "total": 100,
    "pages": 5,
    "hasNext": true,
    "hasPrev": false
  }
}
```

## 🔧 Development

### Testing API Endpoints

Use tools like Postman, curl, or HTTPie to test endpoints:

```bash
# Login and get token
curl -X POST http://localhost:3001/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"address":"0x...","signature":"0x...","message":"Login"}'

# Use token for authenticated requests
curl -X GET http://localhost:3001/api/donors/history \
  -H "Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
```

### Environment Variables

Key environment variables for API configuration:

```bash
PORT=3001
JWT_SECRET=your-secret-key
MONGODB_URI=mongodb://localhost:27017/disaster-relief
CORS_ORIGIN=http://localhost:5173
API_RATE_LIMIT_MAX_REQUESTS=100
```

## 📝 Notes

- All amounts are in string format to preserve precision
- Timestamps are in ISO 8601 format (UTC)
- Addresses are Ethereum addresses in hexadecimal format
- Transaction hashes are Ethereum transaction hashes
- File uploads use multipart/form-data encoding
- WebSocket events require authentication
- Rate limiting applies to all endpoints
- Pagination is zero-indexed (page starts from 1)

For more information, see the main [README.md](README.md) file.