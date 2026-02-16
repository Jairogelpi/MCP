-- Migration 016: Auth Expansion
-- Adds email and password_hash to iam_users to support real login/register.

-- SQLite / Postgres compatible expansion
ALTER TABLE iam_users ADD COLUMN email TEXT;
ALTER TABLE iam_users ADD COLUMN password_hash TEXT;

-- For Postgres, we would add the unique constraint. 
-- For SQLite, we might need a unique index.
CREATE UNIQUE INDEX IF NOT EXISTS idx_iam_users_email ON iam_users(email);
