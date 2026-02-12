# Pricing Schema Specification (v0.1.0)

## Overview
This document defines the schema for the Pricing Engine, which serves as the "Source of Truth" for all economic calculations in the gateway.

## Versioning
- **Schema Version**: `v0.1.0`
- **Config Versioning**: Semver string in YAML config header.

## Data Model

### Table: `pricing_tiers`

| Column | Type | Nullable | Description |
| :--- | :--- | :--- | :--- |
| `id` | INTEGER PK | No | Auto-increment ID |
| `provider` | TEXT | No | Provider name (e.g., `openai`, `anthropic`, `internal`) |
| `model` | TEXT | No | Model identifier (e.g., `gpt-4`, `claude-3`) or `*` |
| `endpoint` | TEXT | No | API Endpoint or Tool Name (e.g., `completion`, `search_op`) or `*` |
| `region` | TEXT | No | Region code (e.g., `eu-west-1`, `us-east-1`, `global`) |
| `tier` | TEXT | No | Formatting tier (e.g., `standard`, `premium`) |
| `input_price` | REAL | No | Cost per 1k input tokens (EUR) |
| `output_price` | REAL | No | Cost per 1k output tokens (EUR) |
| `flat_fee` | REAL | No | Flat fee per call (EUR) |
| `effective_from` | INTEGER | No | Timestamp (ms) start of validity |
| `effective_to` | INTEGER | Yes | Timestamp (ms) end of validity (NULL = forever) |
| `created_at` | INTEGER | No | Import timestamp |

## YAML Configuration Format

The `admin/pricing_import` script reads files matching `config/pricing/*.yaml`.

```yaml
version: "0.1.0"
rates:
  - provider: "openai"
    model: "gpt-4"
    endpoint: "*"
    region: "global"
    tier: "standard"
    input_price: 0.03
    output_price: 0.06
    flat_fee: 0.0

  - provider: "internal"
    model: "*"
    endpoint: "search_op"
    region: "global"
    tier: "standard"
    input_price: 0.0
    output_price: 0.0
    flat_fee: 0.01
```

## Lookup Logic
Query by `(provider, model, endpoint, region, tier)` ordering by specificity:
1. Exact match all fields.
2. Wildcard `endpoint=*`.
3. Wildcard `model=*`.
4. Wildcard `region=global` (if not exact).

If no match found -> `PRICING_NOT_FOUND` (Deny).
