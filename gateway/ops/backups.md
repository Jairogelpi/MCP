# Disaster Recovery & Backup Policy

## 1. Backup Strategy
- **Mechanism**: Atomic `VACUUM INTO` for the SQLite database to ensure consistency without downtime.
- **Frequency**:
  - **Incremental**: Every 4 hours (Audit logs, receipts).
  - **Full**: Every 24 hours.
- **Retention**: Keep daily backups for 30 days; monthly for 1 year.

## 2. Recovery Objectives (RTO/RPO)
- **RTO (Recovery Time Objective)**: < 15 minutes to restore the primary gateway instance.
- **RPO (Recovery Point Objective)**: < 4 hours (maximum data loss in case of total failure).

## 3. Verification Post-Restore
Every restore operation MUST be followed by the `verify_integrity` script which checks:
- **Receipt Chain**: All `prev_hash` links are intact.
- **Signatures**: All receipts and audit signatures are valid.
- **Ledger Invariants**: Sum of settlements matches account balances.
