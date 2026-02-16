# MCP Gateway Billing Export Specification

This document defines the standardized formats for financial and audit trails exported by the gateway.

## 1. Usage Daily Export (`usage_daily.csv`)
Aggregates settled amounts per day to detect anomalies and trends.

| Column | Type | Description |
|---|---|---|
| `day` | Date | YYYY-MM-DD |
| `type` | String | `RESERVE` or `SETTLE` |
| `total_amount` | Decimal | Sum of units/cost for that day. |

## 2. Audit Receipts Export (`receipts.ndjson`)
Full cryptographic audit trail in Newline-Delimited JSON. Each line is a valid CSP-signed receipt following the MCP-RCP-001 protocol.

## 3. Invoice Lines Export (`invoice_lines.csv`)
Optimized for direct import into billing systems (Stripe, Chargebee).

| Column | Description |
|---|---|
| `tenant` | Unique identifier for the customer. |
| `period` | Billing cycle (e.g., `2026-02`). |
| `concept` | Item description (e.g., "AI Tool Execution Units"). |
| `qty` | Total settled units. |
| `unit_price` | Price per unit (as per `pricing.yaml`). |
| `total` | Grand total for the tenant's invoice line. |

---
**Freeze Gate**: `billing-exports-v0.1.0`
