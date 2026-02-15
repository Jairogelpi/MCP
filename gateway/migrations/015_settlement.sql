-- Migration 015: Settlement & Payouts
-- Phase 10.2

-- 1. Settlement Batches (Reconciliation Units)
CREATE TABLE IF NOT EXISTS settlement_batches (
    batch_id TEXT PRIMARY KEY,
    tenant_id TEXT NOT NULL,
    period_id TEXT NOT NULL, -- Links to billing_periods
    status TEXT NOT NULL CHECK(status IN ('OPEN', 'PROCESSING', 'SETTLED', 'FAILED')),
    total_amount INTEGER NOT NULL DEFAULT 0, -- Micro-USD
    currency TEXT NOT NULL DEFAULT 'USD',
    created_at INTEGER NOT NULL,
    settled_at INTEGER
);

-- 2. Payouts (Transfer to Payees)
CREATE TABLE IF NOT EXISTS payouts (
    payout_id TEXT PRIMARY KEY,
    batch_id TEXT NOT NULL,
    payee_id TEXT NOT NULL, -- DID or internal ID
    amount INTEGER NOT NULL,
    currency TEXT NOT NULL,
    status TEXT NOT NULL DEFAULT 'PENDING',
    external_ref TEXT, -- Stripe Payout ID, Tx Hash etc.
    created_at INTEGER NOT NULL,
    FOREIGN KEY(batch_id) REFERENCES settlement_batches(batch_id)
);

-- 3. Payment Intents (Collection from Payers)
CREATE TABLE IF NOT EXISTS payment_intents (
    intent_id TEXT PRIMARY KEY,
    batch_id TEXT NOT NULL,
    payer_id TEXT NOT NULL,
    amount INTEGER NOT NULL,
    currency TEXT NOT NULL,
    status TEXT NOT NULL DEFAULT 'PENDING',
    external_ref TEXT, -- Stripe PaymentIntent ID
    created_at INTEGER NOT NULL,
    FOREIGN KEY(batch_id) REFERENCES settlement_batches(batch_id)
);
