# SENTRA Trust Scoring API

AI-driven Trust Scoring API for fintech fraud prevention using Nokia as Code CAMARA sandbox.

## Getting Started

### Prerequisites

- Node.js (latest LTS)
- npm

### Installation

```bash
npm install
```

### Environment Setup

Copy `.env` and configure:

- `API_KEY`: Your API key for authentication
- `NOKIA_API_KEY`: Nokia as Code sandbox API key
- `NOKIA_BASE_URL`: https://sandbox.api.nokia-as-code.com

### Development

```bash
npm run dev
```

Server starts at http://localhost:3000

### Production

```bash
npm run build
npm start
```

## API Documentation

Visit http://localhost:3000/docs for Swagger UI.

## Key Endpoints

- `POST /v1/trust/evaluate` - Evaluate trust score
- `POST /v1/transaction/initiate` - Initiate transaction with trust check
- `POST /v1/auth/silent-verify` - Silent auth verification
- `POST /v1/auth/device-bind` - Device binding
- `POST /v1/kyc/check` - KYC eligibility check
- `GET /v1/kyc/auto-fill` - Auto-fill KYC data
- `POST /v1/security/pre-auth-check` - Pre-auth security check
- `POST /v1/security/geofence` - Geofence check
- `POST /v1/escrow/create` - Create escrow
- `POST /v1/escrow/release` - Release escrow

## Testing

```bash
npm test
```

## Architecture

- TypeScript
- Fastify framework
- Zod validation
- Pino logging
- Nokia as Code CAMARA integration

## Learn More

To learn Fastify, check out the [Fastify documentation](https://fastify.dev/docs/latest/).
