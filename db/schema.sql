
-- ═══════════════════════════════════════════════════════════════════════
-- Sentra Nexus: Collective Intelligence Schema (Security-Hardened)
-- Run this in your Supabase SQL Editor
-- ═══════════════════════════════════════════════════════════════════════

-- ── Anonymized Identity Nexus ─────────────────────────────────────────
CREATE TABLE IF NOT EXISTS identities (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    phone_hash TEXT UNIQUE NOT NULL, -- SHA-256 of phone number — NEVER store plaintext
    global_trust_score FLOAT DEFAULT 100.0 CHECK (global_trust_score BETWEEN 0 AND 100),
    is_blacklisted BOOLEAN DEFAULT FALSE,
    last_seen TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- ── Risk Signals ──────────────────────────────────────────────────────
-- [VM-5 FIX] signal_type is now constrained to known values only
CREATE TABLE IF NOT EXISTS identity_signals (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    identity_id UUID REFERENCES identities(id) ON DELETE CASCADE,
    signal_type TEXT NOT NULL CHECK (
        signal_type IN ('sim_swap', 'device_change', 'roaming', 'velocity_abuse', 'geo_anomaly')
    ),
    severity_level INT DEFAULT 1 CHECK (severity_level BETWEEN 1 AND 10),
    metadata JSONB,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- ── Community Fraud Reports ───────────────────────────────────────────
CREATE TABLE IF NOT EXISTS fraud_reports (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    reporter_client_id TEXT NOT NULL,
    identity_id UUID REFERENCES identities(id) ON DELETE CASCADE,
    fraud_type TEXT NOT NULL CHECK (
        fraud_type IN ('account_takeover', 'scam', 'payment_fraud', 'identity_theft')
    ),
    description TEXT CHECK (char_length(description) <= 1000),
    severity INT CHECK (severity BETWEEN 1 AND 5),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- ── Auto-Scoring Trigger ──────────────────────────────────────────────
CREATE OR REPLACE FUNCTION update_global_trust_score()
RETURNS TRIGGER AS $$
DECLARE
    new_score FLOAT := 100.0;
    signal_penalty FLOAT;
    fraud_penalty FLOAT;
BEGIN
    SELECT COALESCE(SUM(severity_level * 2.0), 0) INTO signal_penalty
    FROM identity_signals WHERE identity_id = NEW.identity_id;

    SELECT COALESCE(SUM(severity * 15.0), 0) INTO fraud_penalty
    FROM fraud_reports WHERE identity_id = NEW.identity_id;

    new_score := GREATEST(0, 100.0 - signal_penalty - fraud_penalty);

    UPDATE identities
    SET global_trust_score = new_score,
        last_seen = CURRENT_TIMESTAMP,
        is_blacklisted = (new_score < 20)
    WHERE id = NEW.identity_id;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS trg_update_score_on_signal ON identity_signals;
CREATE TRIGGER trg_update_score_on_signal
AFTER INSERT ON identity_signals FOR EACH ROW EXECUTE FUNCTION update_global_trust_score();

DROP TRIGGER IF EXISTS trg_update_score_on_report ON fraud_reports;
CREATE TRIGGER trg_update_score_on_report
AFTER INSERT ON fraud_reports FOR EACH ROW EXECUTE FUNCTION update_global_trust_score();

-- ── Device Bindings ───────────────────────────────────────────────────
-- [CVE-5 FIX] Stores phone_number_hash (SHA-256) — NOT the raw phone number
-- This was storing PII (phone numbers) in plaintext — GDPR/PCI-DSS violation
CREATE TABLE IF NOT EXISTS device_bindings (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    phone_number_hash TEXT NOT NULL,   -- SHA-256 of phone number
    device_id TEXT NOT NULL CHECK (char_length(device_id) <= 256),
    owner_id TEXT NOT NULL,            -- Supabase user UID — scopes binding to a tenant
    last_used TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(phone_number_hash, device_id)
);

CREATE INDEX IF NOT EXISTS idx_device_bindings_phone_hash ON device_bindings(phone_number_hash);
CREATE INDEX IF NOT EXISTS idx_device_bindings_owner ON device_bindings(owner_id);

-- ── Escrow Transactions ───────────────────────────────────────────────
-- [CVE-7 FIX] Escrows need to be persisted and ownership-tracked
CREATE TABLE IF NOT EXISTS escrows (
    id UUID PRIMARY KEY,               -- UUID from crypto.randomUUID()
    sender_phone TEXT NOT NULL,        -- Could also be hashed in a stricter implementation
    receiver_phone TEXT NOT NULL,
    amount NUMERIC(15, 2) NOT NULL CHECK (amount > 0 AND amount <= 1000000),
    owner_id TEXT NOT NULL,            -- Supabase user UID — only owner can release
    status TEXT NOT NULL DEFAULT 'PENDING' CHECK (status IN ('PENDING', 'RELEASED', 'REFUNDED')),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    released_at TIMESTAMP WITH TIME ZONE
);

CREATE INDEX IF NOT EXISTS idx_escrows_owner ON escrows(owner_id);
CREATE INDEX IF NOT EXISTS idx_escrows_status ON escrows(status);

-- ── Row Level Security (RLS) ──────────────────────────────────────────
-- Enable RLS on all tables — users can only access their own data

ALTER TABLE device_bindings ENABLE ROW LEVEL SECURITY;
ALTER TABLE escrows ENABLE ROW LEVEL SECURITY;

-- Escrow RLS: users can only see/modify their own escrows
CREATE POLICY escrow_owner_policy ON escrows
    USING (owner_id = auth.uid()::text);

-- Device binding RLS: users can only see their own bindings
CREATE POLICY device_binding_owner_policy ON device_bindings
    USING (owner_id = auth.uid()::text);

-- Identities and signals use service role only (no user-level RLS)
-- These are accessed only via the server with the service_role key

-- ── Per-Tenant Webhook Endpoints ─────────────────────────────────────
-- Each API customer configures their own webhook URL in the Sentra dashboard.
-- SENTRA dispatches events to each customer's backend — they receive the data
-- and do whatever they want with it (update their DB, send alerts, etc.)
-- This is the standard B2B model used by Stripe, Twilio, GitHub, etc.
CREATE TABLE IF NOT EXISTS webhook_endpoints (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id TEXT NOT NULL,             -- Supabase user UID (the API key owner)
    url TEXT NOT NULL                  -- Customer's HTTPS endpoint
        CHECK (url LIKE 'https://%'),
    -- HMAC-SHA256 signing secret: Sentra signs every payload with this secret.
    -- The customer verifies the X-Sentra-Signature header on their side.
    -- This prevents a 3rd party from spoofing webhook events to the customer.
    signing_secret TEXT NOT NULL,
    -- Which events this endpoint subscribes to
    events TEXT[] NOT NULL DEFAULT ARRAY[
        'trust.alert',
        'transaction.blocked',
        'transaction.step_up',
        'escrow.created',
        'escrow.released'
    ],
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    last_triggered_at TIMESTAMP WITH TIME ZONE,
    UNIQUE(user_id, url)
);

CREATE INDEX IF NOT EXISTS idx_webhook_endpoints_user ON webhook_endpoints(user_id);
CREATE INDEX IF NOT EXISTS idx_webhook_endpoints_active ON webhook_endpoints(is_active)
    WHERE is_active = TRUE;

ALTER TABLE webhook_endpoints ENABLE ROW LEVEL SECURITY;
CREATE POLICY webhook_endpoints_owner_policy ON webhook_endpoints
    USING (user_id = auth.uid()::text);

-- ── Webhook Delivery Logs ───────────────────────────────────────────
-- Tracks every attempt to deliver a webhook.
CREATE TABLE IF NOT EXISTS webhook_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    url TEXT NOT NULL,
    event TEXT NOT NULL,
    status INT,                        -- HTTP response status (200, 404, etc.)
    error TEXT,                        -- Exception message if any
    payload JSONB,                     -- The actual data sent
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_webhook_logs_created ON webhook_logs(created_at DESC);

-- ── Persistent API Keys ─────────────────────────────────────────────
-- Replaces InMemoryDB to ensure client access is durable.
CREATE TABLE IF NOT EXISTS api_keys (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id TEXT NOT NULL,             -- Owner (Supabase UID)
    name TEXT NOT NULL,                -- Descriptive name (e.g., "Prod Key")
    key_hash TEXT UNIQUE NOT NULL,     -- SHA-256 of the key
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    last_used_at TIMESTAMP WITH TIME ZONE,
    is_revoked BOOLEAN DEFAULT FALSE
);

CREATE INDEX IF NOT EXISTS idx_api_keys_hash ON api_keys(key_hash);
CREATE INDEX IF NOT EXISTS idx_api_keys_user ON api_keys(user_id);

ALTER TABLE api_keys ENABLE ROW LEVEL SECURITY;
CREATE POLICY api_keys_owner_policy ON api_keys
    USING (user_id = auth.uid()::text);

-- ── API Usage & Billing Logs ────────────────────────────────────────
-- Tracks every B2B request for usage-based billing and analytics.
CREATE TABLE IF NOT EXISTS api_usage_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    api_key_id UUID REFERENCES api_keys(id),
    user_id TEXT NOT NULL,
    endpoint TEXT NOT NULL,
    method TEXT NOT NULL,
    status_code INT NOT NULL,
    response_time INT NOT NULL,        -- in milliseconds
    timestamp TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_api_usage_logs_user ON api_usage_logs(user_id);
CREATE INDEX IF NOT EXISTS idx_api_usage_logs_time ON api_usage_logs(timestamp DESC);

ALTER TABLE api_usage_logs ENABLE ROW LEVEL SECURITY;
CREATE POLICY api_usage_logs_owner_policy ON api_usage_logs
    USING (user_id = auth.uid()::text);

-- ── Idempotency Keys ────────────────────────────────────────────────
-- Prevents duplicate execution of sensitive operations (Escrow, Transactions).
-- Standard B2B practice (Stripe-style idempotence).
CREATE TABLE IF NOT EXISTS idempotency_keys (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id TEXT NOT NULL,
    idempotency_key TEXT NOT NULL,
    request_path TEXT NOT NULL,
    response_code INT NOT NULL,
    response_body JSONB NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    expires_at TIMESTAMP WITH TIME ZONE DEFAULT (CURRENT_TIMESTAMP + INTERVAL '24 hours'),
    UNIQUE(user_id, idempotency_key)
);

CREATE INDEX IF NOT EXISTS idx_idempotency_lookup ON idempotency_keys(user_id, idempotency_key);
