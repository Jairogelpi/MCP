# Active-Active Multi-Region Architecture

## 1. Toplogy
- **Regions**: US-EAST-1 (Primary), EU-WEST-1 (Secondary/Active).
- **Partitioning**: Tenants are pinned to a "Home Region" for Writes.
- **Replication**: Async replication (e.g., Postgres Logical Replication / DynamoDB Global Tables) for Reads.

## 2. Failover Strategy (RTO < 15m)
1.  **Detection**: 3 missed heartbeats from Region A.
2.  **Evacuation**: Update Global DNS / Routing Layer to point Region A tenants to Region B.
3.  **Promotion**: Region B assumes "Write Leader" role for evacuated tenants.
4.  **Reconciliation**: Post-incident sync of any "in-flight" writes that didn't replicate (Potential Data Loss window = RPO).

## 3. Consistency Model
- **Normal Ops**: Strong Consistency within Home Region.
- **Failover**: Eventual Consistency. Some recent `Receipts` might be missing in Region B (Sev0 if Financial Impact).
