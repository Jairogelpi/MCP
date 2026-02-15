# Runbook: Budget Overrun Spike

**Severity**: HIGH
**Status**: `overrun_total` metric is increasing rapidly.

## Impact
- Financial leakage.
- Tenants exceeding hard limits.

## Diagnostic Steps
1. **Identify Tenant**: Check `ledger_settle_overrun_exceeded` logs in Loki.
2. **Check Pricing**: Verify if a recent pricing tier change caused incorrect calculations.
3. **Audit Ledger**: Look for `REFUND` entries that were missed or `SETTLE` entries > `RESERVE`.

## Recovery Steps
1. **Suspend Tenant**: Update ruleset to `deny` for the offending `tenantId`.
2. **Batch Reconciliation**: Run an offline script to adjust balances in the `accounts` table.
3. **Adjust Hard Limit**: If the overrun is legitimate, increase the `hard_limit` for the account.
