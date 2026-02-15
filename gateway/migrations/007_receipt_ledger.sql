-- Receipt Ledger & Hash Chain
-- Phase 5.5 & 5.6

-- 1. Receipt Storage (WORM / Append-only)
CREATE TABLE IF NOT EXISTS ledger_receipts (
    receipt_id TEXT PRIMARY KEY,
    tenant_id TEXT NOT NULL,
    request_id TEXT NOT NULL,
    created_at INTEGER NOT NULL,
    
    -- The full JSON blob is the source of truth
    receipt_json TEXT NOT NULL, 
    
    -- Indexed fields for fast lookup
    hash TEXT NOT NULL, -- SHA256 of the canonical receipt (before signature, or as defined)
    prev_hash TEXT NOT NULL, -- Link to previous receipt
    signature TEXT NOT NULL -- Ed25519 signature
);

CREATE INDEX IF NOT EXISTS idx_receipts_tenant ON ledger_receipts(tenant_id, created_at);
CREATE INDEX IF NOT EXISTS idx_receipts_request ON ledger_receipts(request_id);

-- 2. Chain State (The Anchor)
-- Tracks the HEAD of the chain for each scope
CREATE TABLE IF NOT EXISTS chain_state (
    scope_id TEXT PRIMARY KEY, -- e.g. 'tenant:acme'
    last_hash TEXT NOT NULL,
    last_receipt_id TEXT NOT NULL,
    updated_at INTEGER NOT NULL,
    sequence INTEGER NOT NULL DEFAULT 0
);
