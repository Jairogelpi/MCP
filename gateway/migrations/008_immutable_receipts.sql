-- Enforce Immutability on Ledger Receipts
-- Phase 5.6

-- Prevent UPDATE
CREATE TRIGGER IF NOT EXISTS prevent_receipt_update
BEFORE UPDATE ON ledger_receipts
BEGIN
    SELECT RAISE(ABORT, 'Receipts are immutable: UPDATE not allowed');
END;

-- Prevent DELETE
CREATE TRIGGER IF NOT EXISTS prevent_receipt_delete
BEFORE DELETE ON ledger_receipts
BEGIN
    SELECT RAISE(ABORT, 'Receipts are immutable: DELETE not allowed');
END;
