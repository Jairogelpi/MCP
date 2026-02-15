# GDPR Compliance Pack

## 1. Data Inventory (Data Map)
- **Personal Data**: User IDs, API Keys (pseudonymized via hashes), PII in tool arguments (automatically redacted).
- **Processing Purpose**: Financial settlement of MCP tool calls.
- **Legal Basis**: Performance of contract / Legitimate interest.

## 2. Minimization Strategy
- **Audit Logs**: Store only necessary metadata. Redact sensitive payloads in logs.
- **Retention**: Automated deletion of traces after 30 days and logs after 12 months.

## 3. DPA Hooks (Processor Requirements)
- **Sub-processor List**: Upstream MCP tool servers (must be vetted).
- **Security**: Technical and organizational measures documented in `security_controls.md`.
- **Data Subject Rights**: `RetentionManager.purge(userId)` for Right to Erasure.
