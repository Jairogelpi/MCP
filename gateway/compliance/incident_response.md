# Incident Response Runbook

## 1. Detection
- **Trigger**: Alert on `rate_limit_exceeded` or `SSRF_BLOCKED` spikes.
- **Query**: `SELECT * FROM audit_events WHERE status = "blocked" AND created_at > now - 1h`.

## 2. Analysis
- **Identify Actor**: Determine the `key_id` and `user_id` from the audit log.
- **Trace Impact**: Use `Forensic Export` to see all actions performed by the suspicious identity in the last 24 hours.

## 3. Containment
- **Immediate Action**: Disable the compromised API key via Admin UI/DB (`UPDATE iam_keys SET status = "revoked" WHERE key_id = ?`).
- **Isolation**: Update tenant `egress_policy` to block the targeted upstream URL.

## 4. Post-Incident
- **Evidence Collection**: Generate Forensic Export and sign it for legal preservation.
- **Root Cause**: Review `threat_model.md` and implement new mitigations if necessary.
