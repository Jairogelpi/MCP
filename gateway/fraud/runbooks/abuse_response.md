# Runbook: Handling Tenant Abuse (Sev-1/Sev-0)

## 1. Triage
1.  **Check Dashboard**: View `Risk Score` breakdown in Grafana.
2.  **Verify Context**: Is this a known launch event? (Check `marketing-calendar`).

## 2. Containment
IF **Confirmed Abuse**:
1.  **Hard Freeze**:
    ```bash
    mcp-admin tenant freeze <tenant_id> --reason "Suspected Fraud: Burn Spike"
    ```
2.  **Revoke Keys**: Invalidate all active API keys.
3.  **Drain**: Cancel pending Payouts in Settlement Engine.

## 3. Investigation
1.  **Trace Analysis**: Pull traces for the last hour.
    ```bash
    mcp-trace query --tenant <tenant_id> --last 1h
    ```
2.  **Collusion Check**: Look for shared IPs or payee addresses.

## 4. Resolution
- **False Positive**: Unfreeze and adjust thresholds (allow-list).
- **Confirmed**: Permanent Ban, report to Stripe/Police if needed.
