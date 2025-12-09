# Viddhana Blockscan - API Reference

Complete API documentation for the KYC Middleware service.

## Base URL

```
http://localhost:3000/api/v1
```

## Authentication

All protected endpoints require an API key passed in the header.

### Header Format

```
Authorization: Bearer <API_KEY>
```

### Example

```bash
curl -H "Authorization: Bearer your-api-key-here" \
  http://localhost:3000/api/v1/kyc/stats
```

### Authentication Errors

| Status | Code | Description |
|--------|------|-------------|
| 401 | `UNAUTHORIZED` | Missing or invalid API key |
| 403 | `FORBIDDEN` | API key lacks required permissions |

---

## Endpoints

### Health Check

Check the API service health status.

#### Request

```
GET /health
```

#### Response

```json
{
  "status": "healthy",
  "timestamp": "2024-01-15T10:30:00.000Z",
  "version": "1.0.0",
  "blockchain": {
    "connected": true,
    "blockNumber": 12345,
    "networkId": 1337
  }
}
```

#### Status Codes

| Status | Description |
|--------|-------------|
| 200 | Service is healthy |
| 503 | Service unavailable (blockchain disconnected) |

---

### Submit KYC Data

Submit KYC information for a user address.

#### Request

```
POST /api/v1/kyc/submit
```

#### Headers

```
Content-Type: application/json
Authorization: Bearer <API_KEY>
```

#### Body

```json
{
  "address": "0x742d35Cc6634C0532925a3b844Bc9e7595f8b234",
  "fullName": "John Doe",
  "documentType": "passport",
  "documentNumber": "AB1234567",
  "dateOfBirth": "1990-05-15",
  "nationality": "US",
  "documentHash": "0x1234567890abcdef...",
  "metadata": {
    "submittedAt": "2024-01-15T10:30:00.000Z",
    "ipAddress": "192.168.1.1"
  }
}
```

#### Parameters

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `address` | string | Yes | Ethereum address (0x prefixed) |
| `fullName` | string | Yes | User's full legal name |
| `documentType` | string | Yes | Type: `passport`, `national_id`, `drivers_license` |
| `documentNumber` | string | Yes | Document identification number |
| `dateOfBirth` | string | Yes | ISO 8601 date format |
| `nationality` | string | Yes | ISO 3166-1 alpha-2 country code |
| `documentHash` | string | Yes | Keccak256 hash of document |
| `metadata` | object | No | Additional metadata |

#### Response - Success

```json
{
  "success": true,
  "message": "KYC submission recorded",
  "data": {
    "address": "0x742d35Cc6634C0532925a3b844Bc9e7595f8b234",
    "status": "pending",
    "transactionHash": "0xabc123...",
    "submittedAt": "2024-01-15T10:30:00.000Z"
  }
}
```

#### Response - Error

```json
{
  "success": false,
  "error": {
    "code": "ALREADY_SUBMITTED",
    "message": "KYC already submitted for this address"
  }
}
```

#### Status Codes

| Status | Description |
|--------|-------------|
| 201 | KYC submitted successfully |
| 400 | Invalid request body |
| 409 | KYC already exists for address |
| 500 | Blockchain transaction failed |

---

### Get KYC Status

Retrieve the KYC verification status for an address.

#### Request

```
GET /api/v1/kyc/status/:address
```

#### Parameters

| Parameter | Type | Description |
|-----------|------|-------------|
| `address` | path | Ethereum address to query |

#### Response - Success

```json
{
  "success": true,
  "data": {
    "address": "0x742d35Cc6634C0532925a3b844Bc9e7595f8b234",
    "status": "verified",
    "level": 2,
    "submittedAt": "2024-01-15T10:30:00.000Z",
    "verifiedAt": "2024-01-15T12:00:00.000Z",
    "expiresAt": "2025-01-15T12:00:00.000Z",
    "verifiedBy": "0xadmin..."
  }
}
```

#### KYC Status Values

| Status | Description |
|--------|-------------|
| `none` | No KYC record exists |
| `pending` | Submitted, awaiting verification |
| `verified` | Successfully verified |
| `rejected` | Verification rejected |
| `expired` | Verification has expired |
| `suspended` | Account suspended |

#### KYC Levels

| Level | Description |
|-------|-------------|
| 0 | Unverified |
| 1 | Basic verification |
| 2 | Full verification |
| 3 | Enhanced verification |

#### Status Codes

| Status | Description |
|--------|-------------|
| 200 | Status retrieved successfully |
| 400 | Invalid address format |
| 404 | No KYC record found |

---

### Verify User (Admin)

Approve a pending KYC submission.

#### Request

```
POST /api/v1/kyc/verify
```

#### Headers

```
Content-Type: application/json
Authorization: Bearer <ADMIN_API_KEY>
```

#### Body

```json
{
  "address": "0x742d35Cc6634C0532925a3b844Bc9e7595f8b234",
  "level": 2,
  "expiryDays": 365,
  "notes": "Documents verified successfully"
}
```

#### Parameters

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `address` | string | Yes | Address to verify |
| `level` | number | Yes | KYC level (1-3) |
| `expiryDays` | number | No | Days until expiry (default: 365) |
| `notes` | string | No | Admin notes |

#### Response - Success

```json
{
  "success": true,
  "message": "User verified successfully",
  "data": {
    "address": "0x742d35Cc6634C0532925a3b844Bc9e7595f8b234",
    "status": "verified",
    "level": 2,
    "transactionHash": "0xdef456...",
    "verifiedAt": "2024-01-15T12:00:00.000Z",
    "expiresAt": "2025-01-15T12:00:00.000Z"
  }
}
```

#### Status Codes

| Status | Description |
|--------|-------------|
| 200 | User verified successfully |
| 400 | Invalid request body |
| 403 | Not authorized (admin only) |
| 404 | No pending KYC found |
| 500 | Blockchain transaction failed |

---

### Reject User (Admin)

Reject a pending KYC submission.

#### Request

```
POST /api/v1/kyc/reject
```

#### Headers

```
Content-Type: application/json
Authorization: Bearer <ADMIN_API_KEY>
```

#### Body

```json
{
  "address": "0x742d35Cc6634C0532925a3b844Bc9e7595f8b234",
  "reason": "INVALID_DOCUMENT",
  "message": "Document image is unclear. Please resubmit with a clearer image."
}
```

#### Parameters

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `address` | string | Yes | Address to reject |
| `reason` | string | Yes | Rejection reason code |
| `message` | string | No | Human-readable message |

#### Rejection Reason Codes

| Code | Description |
|------|-------------|
| `INVALID_DOCUMENT` | Document is invalid or unreadable |
| `EXPIRED_DOCUMENT` | Document has expired |
| `MISMATCH` | Information doesn't match document |
| `FRAUD_SUSPECTED` | Suspected fraudulent submission |
| `INCOMPLETE` | Missing required information |
| `OTHER` | Other reason (specify in message) |

#### Response - Success

```json
{
  "success": true,
  "message": "User KYC rejected",
  "data": {
    "address": "0x742d35Cc6634C0532925a3b844Bc9e7595f8b234",
    "status": "rejected",
    "reason": "INVALID_DOCUMENT",
    "transactionHash": "0xghi789...",
    "rejectedAt": "2024-01-15T12:00:00.000Z"
  }
}
```

#### Status Codes

| Status | Description |
|--------|-------------|
| 200 | User rejected successfully |
| 400 | Invalid request body |
| 403 | Not authorized (admin only) |
| 404 | No pending KYC found |
| 500 | Blockchain transaction failed |

---

### Suspend User (Admin)

Suspend a verified user's KYC status.

#### Request

```
POST /api/v1/kyc/suspend
```

#### Headers

```
Content-Type: application/json
Authorization: Bearer <ADMIN_API_KEY>
```

#### Body

```json
{
  "address": "0x742d35Cc6634C0532925a3b844Bc9e7595f8b234",
  "reason": "SUSPICIOUS_ACTIVITY",
  "message": "Account under review for suspicious activity"
}
```

#### Response - Success

```json
{
  "success": true,
  "message": "User suspended",
  "data": {
    "address": "0x742d35Cc6634C0532925a3b844Bc9e7595f8b234",
    "status": "suspended",
    "transactionHash": "0xjkl012...",
    "suspendedAt": "2024-01-15T12:00:00.000Z"
  }
}
```

---

### Get KYC Statistics

Retrieve overall KYC statistics.

#### Request

```
GET /api/v1/kyc/stats
```

#### Headers

```
Authorization: Bearer <API_KEY>
```

#### Response

```json
{
  "success": true,
  "data": {
    "total": 1500,
    "pending": 45,
    "verified": 1200,
    "rejected": 230,
    "suspended": 15,
    "expired": 10,
    "byLevel": {
      "level1": 400,
      "level2": 650,
      "level3": 150
    },
    "last24Hours": {
      "submitted": 25,
      "verified": 18,
      "rejected": 5
    }
  }
}
```

#### Status Codes

| Status | Description |
|--------|-------------|
| 200 | Statistics retrieved successfully |
| 401 | Unauthorized |

---

### List Pending KYC (Admin)

List all pending KYC submissions.

#### Request

```
GET /api/v1/kyc/pending
```

#### Query Parameters

| Parameter | Type | Default | Description |
|-----------|------|---------|-------------|
| `page` | number | 1 | Page number |
| `limit` | number | 20 | Items per page (max 100) |
| `sortBy` | string | `submittedAt` | Sort field |
| `order` | string | `asc` | Sort order (`asc` or `desc`) |

#### Response

```json
{
  "success": true,
  "data": {
    "items": [
      {
        "address": "0x742d35Cc6634C0532925a3b844Bc9e7595f8b234",
        "fullName": "John Doe",
        "documentType": "passport",
        "submittedAt": "2024-01-15T10:30:00.000Z"
      }
    ],
    "pagination": {
      "page": 1,
      "limit": 20,
      "total": 45,
      "pages": 3
    }
  }
}
```

---

### Batch Verify (Admin)

Verify multiple users in a single transaction.

#### Request

```
POST /api/v1/kyc/batch/verify
```

#### Body

```json
{
  "addresses": [
    "0x742d35Cc6634C0532925a3b844Bc9e7595f8b234",
    "0x853e46Dd7735D1632926b4c9b955F8c345f9c345"
  ],
  "level": 2,
  "expiryDays": 365
}
```

#### Response

```json
{
  "success": true,
  "message": "Batch verification completed",
  "data": {
    "verified": 2,
    "failed": 0,
    "transactionHash": "0xmno345...",
    "results": [
      {
        "address": "0x742d35...",
        "success": true
      },
      {
        "address": "0x853e46...",
        "success": true
      }
    ]
  }
}
```

---

## Error Codes

### Standard Error Response

```json
{
  "success": false,
  "error": {
    "code": "ERROR_CODE",
    "message": "Human-readable error message",
    "details": {}
  }
}
```

### Error Code Reference

| Code | HTTP Status | Description |
|------|-------------|-------------|
| `INVALID_ADDRESS` | 400 | Invalid Ethereum address format |
| `INVALID_REQUEST` | 400 | Malformed request body |
| `MISSING_FIELD` | 400 | Required field missing |
| `UNAUTHORIZED` | 401 | Invalid or missing API key |
| `FORBIDDEN` | 403 | Insufficient permissions |
| `NOT_FOUND` | 404 | Resource not found |
| `ALREADY_SUBMITTED` | 409 | KYC already exists for address |
| `ALREADY_VERIFIED` | 409 | User already verified |
| `INVALID_STATE` | 409 | Invalid state transition |
| `RATE_LIMITED` | 429 | Too many requests |
| `BLOCKCHAIN_ERROR` | 500 | Blockchain interaction failed |
| `INTERNAL_ERROR` | 500 | Internal server error |

---

## Rate Limiting

API requests are rate limited to prevent abuse.

### Limits

| Endpoint Type | Limit |
|---------------|-------|
| Read endpoints | 100 requests/minute |
| Write endpoints | 20 requests/minute |
| Admin endpoints | 50 requests/minute |

### Rate Limit Headers

```
X-RateLimit-Limit: 100
X-RateLimit-Remaining: 95
X-RateLimit-Reset: 1705315800
```

### Rate Limit Exceeded Response

```json
{
  "success": false,
  "error": {
    "code": "RATE_LIMITED",
    "message": "Too many requests. Please try again later.",
    "details": {
      "retryAfter": 60
    }
  }
}
```

---

## Webhooks

Configure webhooks to receive real-time notifications.

### Webhook Events

| Event | Description |
|-------|-------------|
| `kyc.submitted` | New KYC submission received |
| `kyc.verified` | User verified |
| `kyc.rejected` | User rejected |
| `kyc.suspended` | User suspended |
| `kyc.expired` | User verification expired |

### Webhook Payload

```json
{
  "event": "kyc.verified",
  "timestamp": "2024-01-15T12:00:00.000Z",
  "data": {
    "address": "0x742d35Cc6634C0532925a3b844Bc9e7595f8b234",
    "status": "verified",
    "level": 2,
    "transactionHash": "0xabc123..."
  },
  "signature": "sha256=..."
}
```

### Webhook Security

Verify webhook signatures using HMAC-SHA256:

```javascript
const crypto = require('crypto');

function verifyWebhook(payload, signature, secret) {
  const expected = crypto
    .createHmac('sha256', secret)
    .update(payload)
    .digest('hex');
  return `sha256=${expected}` === signature;
}
```

---

## SDK Examples

### JavaScript/Node.js

```javascript
const axios = require('axios');

const api = axios.create({
  baseURL: 'http://localhost:3000/api/v1',
  headers: {
    'Authorization': 'Bearer your-api-key',
    'Content-Type': 'application/json'
  }
});

// Submit KYC
async function submitKYC(data) {
  const response = await api.post('/kyc/submit', data);
  return response.data;
}

// Check status
async function getStatus(address) {
  const response = await api.get(`/kyc/status/${address}`);
  return response.data;
}
```

### Python

```python
import requests

BASE_URL = 'http://localhost:3000/api/v1'
API_KEY = 'your-api-key'

headers = {
    'Authorization': f'Bearer {API_KEY}',
    'Content-Type': 'application/json'
}

def submit_kyc(data):
    response = requests.post(
        f'{BASE_URL}/kyc/submit',
        json=data,
        headers=headers
    )
    return response.json()

def get_status(address):
    response = requests.get(
        f'{BASE_URL}/kyc/status/{address}',
        headers=headers
    )
    return response.json()
```

### cURL

```bash
# Submit KYC
curl -X POST http://localhost:3000/api/v1/kyc/submit \
  -H "Authorization: Bearer your-api-key" \
  -H "Content-Type: application/json" \
  -d '{
    "address": "0x742d35Cc6634C0532925a3b844Bc9e7595f8b234",
    "fullName": "John Doe",
    "documentType": "passport",
    "documentNumber": "AB1234567",
    "dateOfBirth": "1990-05-15",
    "nationality": "US",
    "documentHash": "0x1234..."
  }'

# Get status
curl -X GET http://localhost:3000/api/v1/kyc/status/0x742d35Cc6634C0532925a3b844Bc9e7595f8b234 \
  -H "Authorization: Bearer your-api-key"
```

---

## Changelog

### v1.0.0 (2024-01-15)
- Initial release
- KYC submission and verification endpoints
- Admin management endpoints
- Batch operations support
- Webhook notifications
