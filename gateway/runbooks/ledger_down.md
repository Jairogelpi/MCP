# Runbook: Ledger Service Unavailable

**Severity**: CRITICAL
**Status**: Ledger database is offline or read-only.

## Impact
- All Tool requests will fail in **FAIL-CLOSED** mode (500 Internal Server Error).
- Requests will bypass the ledger in **FAIL-OPEN** mode (Virtual Success), potentially leading to unrecorded usage.

## Diagnostic Steps
1. **Check Logs**: Search for `ledger_reserve_failed` or `ledger_settle_failed`.
2. **Check DB Connectivity**:
   ```powershell
   # Verify SQLite file exists and is writable
   ls gateway/mcp_gateway.db
   ```
3. **Verify File Permissions**: Ensure the process has write access to the `.db` and `-journal` files.

## Recovery Steps
1. **Switch to Fail-Open**: If the DB is corrupted and HA is prioritized:
   - Update `process.env.LEDGER_FAIL_MODE = 'open'` and restart.
2. **Restore from Backup**:
   - Locate the latest `.sql` dump or `.db` backup.
   - Replace the corrupted file.
3. **Internal Check**: Restart the Gateway and verify initialization logs.
