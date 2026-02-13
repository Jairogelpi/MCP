-- Key Registry for Ed25519 Signatures
CREATE TABLE IF NOT EXISTS key_registry (
    key_id TEXT PRIMARY KEY,
    public_key TEXT NOT NULL, -- Base64 encoded Ed25519 public key
    status TEXT DEFAULT 'active', -- active, rotated, revoked
    created_at INTEGER NOT NULL,
    revoked_at INTEGER
);
