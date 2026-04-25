---
description: You are a senior backend engineer building a production-grade fintech API.  Build a complete Node.js backend using Fastify for a project called "SENTRA" — an AI-driven Trust Scoring API for fintech fraud prevention.
---

# 🧠 CORE OBJECTIVE

Create a secure, scalable REST API that evaluates user trust scores based on simulated telecom signals (CAMARA APIs), and enforces transaction decisions (allow, step-up auth, block, escrow).

---

# 🏗️ TECH STACK

- Node.js (latest LTS)
- Fastify
- TypeScript
- Zod (validation)
- JWT (auth)
- Swagger (OpenAPI 3.0)
- dotenv
- pino (logging)

---

# 📁 PROJECT STRUCTURE

Use clean architecture:

- src/
  - app.ts
  - server.ts
  - modules/
    - auth/
    - kyc/
    - trust/
    - security/
    - transaction/
    - escrow/

  - plugins/
  - middleware/
  - utils/
  - config/

- tests/

---

# 🔐 SECURITY REQUIREMENTS

- API Key authentication via header `x-api-key`
- Rate limiting (basic)
- Input validation on ALL routes
- Centralized error handler
- Do not expose stack traces in production
- Use environment variables

---

# ⚙️ CORE FEATURE: TRUST ENGINE

Implement:

POST /v1/trust/evaluate

Logic:

- Simulate CAMARA signals:
  - simSwap (boolean)
  - deviceChanged (boolean)
  - roaming (boolean)

- Compute Trust Score:
  score = 100
  if simSwap → -40
  if deviceChanged → -25
  if roaming → -20

- Return:
  {
  trustScore: number,
  riskLevel: "low" | "medium" | "high",
  decision: "ALLOW" | "STEP_UP_AUTH" | "BLOCK",
  signals: {...},
  reasons: string[]
  }

---

# 💳 TRANSACTION SYSTEM

POST /v1/transaction/initiate

- Calls trust engine
- Applies rules:
  - score > 85 → ALLOW
  - 40–85 → STEP_UP_AUTH
  - <40 → BLOCK

Return decision + trustScore

---

# 🧾 OTHER ENDPOINTS

Auth:

- POST /v1/auth/silent-verify
- POST /v1/auth/device-bind

KYC:

- POST /v1/kyc/check
- GET /v1/kyc/auto-fill

Security:

- POST /v1/security/pre-auth-check
- POST /v1/security/geofence

Escrow:

- POST /v1/escrow/create
- POST /v1/escrow/release

---

# 🔔 WEBHOOK SYSTEM

Implement webhook dispatcher:

- POST /webhooks/trust.alert
- POST /webhooks/transaction.blocked
- POST /webhooks/transaction.step_up
- POST /webhooks/escrow.created
- POST /webhooks/escrow.released

When:

- score < 40 → trigger trust.alert
- decision BLOCK → transaction.blocked
- decision STEP_UP → transaction.step_up

Use async background trigger (non-blocking)

---

# 📄 SWAGGER

- Generate OpenAPI docs automatically
- Serve at /docs
- Group endpoints by tags
- Include request/response schemas

---

# 🧪 TESTING

- Add at least basic unit tests for trust scoring
- Add one integration test for /transaction/initiate

---

# 📦 OUTPUT REQUIREMENTS

- Fully working project
- Ready to run: `npm install && npm run dev`
- Clean, readable, modular code
- No pseudo-code — real implementation only

---

# ⚠️ IMPORTANT

- This is a hackathon MVP but must look production-ready
- Focus on clarity, structure, and reliability
- Avoid overengineering, but keep code clean and scalable

---

# 🎯 FINAL GOAL

The API must be stable, demo-safe, and capable of handling live requests without failure.

---
