
-- Sentra Nexus: Collective Intelligence Schema
-- Run this in your Supabase SQL Editor

-- Table for Anonymized Identities
CREATE TABLE IF NOT EXISTS identities (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    phone_hash TEXT UNIQUE NOT NULL, -- SHA-256
    global_trust_score FLOAT DEFAULT 100.0,
    is_blacklisted BOOLEAN DEFAULT FALSE,
    last_seen TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Table for Risk Signals
CREATE TABLE IF NOT EXISTS identity_signals (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    identity_id UUID REFERENCES identities(id) ON DELETE CASCADE,
    signal_type TEXT NOT NULL, 
    severity_level INT DEFAULT 1,
    metadata JSONB,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Table for Community Fraud Reports
CREATE TABLE IF NOT EXISTS fraud_reports (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    reporter_client_id TEXT NOT NULL,
    identity_id UUID REFERENCES identities(id) ON DELETE CASCADE,
    fraud_type TEXT NOT NULL,
    description TEXT,
    severity INT CHECK (severity BETWEEN 1 AND 5),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Trigger for Auto-Scoring
CREATE OR REPLACE FUNCTION update_global_trust_score()
RETURNS TRIGGER AS $$
DECLARE
    new_score FLOAT := 100.0;
    signal_penalty FLOAT;
    fraud_penalty FLOAT;
BEGIN
    -- Penalties from signals
    SELECT COALESCE(SUM(severity_level * 2.0), 0) INTO signal_penalty 
    FROM identity_signals WHERE identity_id = NEW.identity_id;

    -- Penalties from fraud reports
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
$$ LANGUAGE plpgsql;

-- Set up triggers
DROP TRIGGER IF EXISTS trg_update_score_on_signal ON identity_signals;
CREATE TRIGGER trg_update_score_on_signal 
AFTER INSERT ON identity_signals FOR EACH ROW EXECUTE FUNCTION update_global_trust_score();

DROP TRIGGER IF EXISTS trg_update_score_on_report ON fraud_reports;
CREATE TRIGGER trg_update_score_on_report 
AFTER INSERT ON fraud_reports FOR EACH ROW EXECUTE FUNCTION update_global_trust_score();

-- Table for Secure Device Binding
CREATE TABLE IF NOT EXISTS device_bindings (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    phone_number TEXT NOT NULL,
    device_id TEXT NOT NULL,
    last_used TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(phone_number, device_id)
);

CREATE INDEX idx_device_bindings_phone ON device_bindings(phone_number);
