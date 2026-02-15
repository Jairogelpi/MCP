# Fraud Models & Heuristics

## 1. Anomaly Detection
### 1.1 Burn Rate Spikes
- **Rule**: If `hourly_spend > 5 * moving_avg_24h`, Trigger Warning.
- **Rule**: If `hourly_spend > 20 * moving_avg_24h`, Trigger Auto-Freeze.

### 1.2 Tool Abuse
- **Rule**: High failure rate (>50%) on expensive tools (Scanning/probing).
- **Rule**: Rapid calls to `stripe_payout` > 1/sec (Structuring attempt).

### 1.3 Collusion Patterns
- **Pattern**: Agency A and Client B share same IP/Fingerprint but distinct DIDs.
- **Pattern**: Circular flows: A -> B -> C -> A.

## 2. Risk Scoring (0-100)
| Factor | Weight | Description |
| :--- | :--- | :--- |
| **New Account** | +20 | < 7 days old |
| **Sudden Volume** | +40 | Spending jumps from $10 to $1000 |
| **Geo Mismatch** | +30 | IP Country != Billing Country |
| **Failed KYB** | +100 | Immediate Block |

## 3. Replay Clusters
- **Detection**: Hash same `prompt` + `response` appearing across different Tenants.
- **Action**: Invalidate receipts, Flag for investigation.
