# Alerting Rules (Prometheus/PagerDuty)

## Sev-1: Potential Fraud
- **Alert**: `HighRiskScore`
- **Condition**: `fraud_risk_score > 80`
- **Channel**: #security-ops (Slack)

## Sev-2: Anomalous Activity
- **Alert**: `BurnRateSpike`
- **Condition**: `spend_velocity_1h > budget_threshold`
- **Channel**: #finance-alerts

## Sev-0: Automated Defense Triggered
- **Alert**: `AutoFreezeExecuted`
- **Condition**: `tenant_status == 'FROZEN'`
- **Channel**: PagerDuty (On-Call)
