# Disaster Recovery (DR) Plan

## 1. Severity Levels
- **L1 (Instance failure)**: Restart or replace one node.
- **L2 (DB Corruption)**: Perform restore from the most recent atomic backup.
- **L3 (Region failure)**: Deploy infrastructure in a secondary region and restore the latest full backup.

## 2. Roles & Responsibilities
- **Operations Team**: Trigger the backup/restore jobs.
- **Security Team**: Verify the integrity of the record chain post-recovery.

## 3. Communication
- Threshold for triggering RTO: 5 minutes without a successful health check.
- Notification to tenants: Required if RPO exceeds 1 hour.
