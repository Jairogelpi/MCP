# Critical Infrastructure Contract (V3.0)

## 1. Availability & Reliability
- **Target**: 99.99% (Four Nines). Max downtime: ~52 min/year.
- **Maintenance**: Zero-downtime upgrades required (Blue/Green or Rolling).
- **Capacity**: Must handle 10x burst traffic without degradation > 200ms p99.

## 2. Data Durability (RPO/RTO)
- **RPO (Recovery Point Objective)**: < 1 second.
  - *Strategy*: Sync replication to >1 AZ.
- **RTO (Recovery Time Objective)**: < 15 minutes.
  - *Strategy*: Automated failover to hot standby region.

## 3. Incident Severity Levels
| Severity | Definition | Response Time | Example |
| :--- | :--- | :--- | :--- |
| **SEV-0** | Critical Data Loss or Security Breach | < 5 min | Private Key Leak, Ledger Corruption |
| **SEV-1** | Global Outage (All Tenants) | < 15 min | DB Down, DNS Failure |
| **SEV-2** | Partial Outage (Some Tenants/Features) | < 1 hour | Slow Payouts, Webhook Failures |
| **SEV-3** | Minor Bug / Cosmetic | < 24 hours | UI Glitch, Typo in Logs |

## 4. Emergency Procedures
### 4.1 Key Compromise ("Break Glass")
1.  **Revoke**: Publish CRL entry for compromised DID/Key immediately.
2.  **Rotate**: Issue new Root Keys from offline cold storage.
3.  **Re-sign**: (Optional) Timestamp-based invalidation of old signatures.

### 4.2 Ledger Corruption
1.  **Freeze**: Stop all Settlement processing.
2.  **Verify**: Run `verify_integrity` on last known good snapshot.
3.  **Replay**: Re-process Audit Logs from last checkpoint to reconstruct Ledger State.
