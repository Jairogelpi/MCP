# Security Requirements for Partners

## 1. Data Protection
- **Encryption**: TLS 1.3 required for all traffic.
- **Data Residency**: Must respect tenant locality (EU/US) if handling PII.
- **Logs**: PII must be redacted from application logs (see `compliance/gdpr_pack.md`).

## 2. Access Control
- **Principle of Least Privilege**: API Keys must be scoped to specific resources.
- **Rotation**: Keys must be rotated every 90 days.

## 3. Incident Reporting
- Partners must report security incidents affecting MCP Gateway data within 24 hours to `security@mcp-financial.com`.
