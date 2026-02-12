CREATE TABLE IF NOT EXISTS pricing_tiers (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    provider TEXT NOT NULL,
    model TEXT NOT NULL,
    endpoint TEXT NOT NULL,
    region TEXT NOT NULL,
    tier TEXT NOT NULL,
    input_price REAL NOT NULL,
    output_price REAL NOT NULL,
    flat_fee REAL NOT NULL,
    effective_from INTEGER NOT NULL,
    effective_to INTEGER,
    created_at INTEGER NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_pricing_lookup ON pricing_tiers (provider, model, endpoint, region, tier);
