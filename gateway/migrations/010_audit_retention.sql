-- Audit & Retention Enhancements
ALTER TABLE ledger_receipts ADD COLUMN status TEXT DEFAULT 'active'; -- active, archived, deleted
ALTER TABLE ledger_receipts ADD COLUMN legal_hold INTEGER DEFAULT 0; -- 0 or 1
ALTER TABLE ledger_receipts ADD COLUMN purge_at INTEGER; -- Optional: hard delete timestamp
