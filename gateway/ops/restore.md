# Restore Procedure

## 1. Prerequisites
- Target environment must have the same Node.js and SQLite binaries.
- The `mcp_backup_*.sqlite` file must be accessible.

## 2. Steps
1. **Stop Services**: Stop the MCP Gateway (`node.exe`).
2. **Move Existing DB**: Rename the current `mcp.sqlite` to `mcp.sqlite.old`.
3. **Copy Backup**: Replace `mcp.sqlite` with the chosen backup file.
4. **Start Gateway**: Run `npm start` or the `start_gateway.ps1` script.

## 3. Post-Restore Validation
Run the integrity check:
```bash
npx tsx src/core/ops/verify_integrity.ts
```
Ensure all chain links and ledger invariants return `OK`.
