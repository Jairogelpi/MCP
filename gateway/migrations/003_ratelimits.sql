CREATE TABLE IF NOT EXISTS rate_limits (
    key TEXT PRIMARY KEY, -- e.g. "agent:zero:tokens_min", "tenant:acme:cost_hour"
    count REAL NOT NULL DEFAULT 0.0,
    window_start INTEGER NOT NULL,
    expires_at INTEGER NOT NULL -- when this window becomes stale
);
