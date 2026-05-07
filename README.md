# SENTRA Gateway API

Production-grade Trust Scoring API for Fintech Fraud Prevention.

## Quick Start

### 1. Prerequisites
- Node.js v20+
- Supabase (PostgreSQL)
- Nokia Network-as-Code Credentials (optional for standalone)

### 2. Setup
```bash
# Install dependencies
npm install

# Configure environment
cp .env.example .env
# Fill in your SUPABASE_URL and SUPABASE_ANON_KEY

# Run in development mode
npm run dev
```

## API Endpoints

### POST `/v1/trust/evaluate`
Evaluates the risk of a transaction based on phone number and context.

**Request:**
```bash
curl -X POST http://localhost:3000/v1/trust/evaluate \
  -H "X-API-Key: YOUR_SENTRA_API_KEY" \
  -H "Content-Type: application/json" \
  -d '{
    "phone_number": "+237612345678",
    "transaction_amount": 150000,
    "transaction_currency": "XAF",
    "sender_phone": "+237698765432",
    "device_id": "d3f1a9c2b4e5f6g7h8i9j0",
    "device_trusted": true,
    "sender_location": {
      "latitude": 3.848,
      "longitude": 11.502,
      "country_code": "CM"
    },
    "timestamp": "2025-05-07T14:32:00Z"
  }'
```

### GET `/v1/trust/explain/:phoneNumber`
Returns the full signal history and detailed audit trail for a phone number.

### GET `/health`
Check API status.

## Architecture
- **Pure Scoring Engine**: The core risk logic is decoupled from side effects, making it 100% testable and auditable.
- **Signal Extraction**: Bridges real network APIs (Nokia) and community data (Supabase).
- **Security**: Rate-limited, API-key protected, and GDPR-compliant (hashes phone numbers in logs).

## Testing
```bash
# Run unit tests for scoring logic
npm test test/scorer.test.ts
```

For a detailed explanation of the risk model, see [SCORING_MODEL_CARD.md](./SCORING_MODEL_CARD.md).
