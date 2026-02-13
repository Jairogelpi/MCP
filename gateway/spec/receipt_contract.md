# Receipt Contract (Spec v0.1.0)

## Overview
A **Receipt** is an immutable cryptographic proof of a processed request. It seals the input (request), the output (response), the policy decision, and the final economic settlement into a single signed document.

## 1. Receipt Schema (JSON)

```json
{
  "receipt_id": "UUID",
  "request_id": "UUID",
  "meta": {
    "tenant_id": "string",
    "project_id": "string",
    "agent_id": "string",
    "session_id": "string",
    "upstream_server_id": "string"
  },
  "operation": {
    "tool_name": "string",
    "mcp_method": "string"
  },
  "proof": {
    "request_hash": "SHA256(Base64)",
    "response_hash": "SHA256(Base64)",
    "nonce": "string",
    "prev_receipt_hash": "SHA256(Base64)"
  },
  "decision": {
    "effect": "allow | deny | transform",
    "reason_codes": ["string"],
    "patch_applied": boolean
  },
  "economic": {
    "cost_settled": 0.0,
    "currency": "EUR",
    "usage": {
      "input_tokens": 0,
      "output_tokens": 0,
      "tool_fees": 0,
      "surcharges": 0
    },
    "pricing_version": "string"
  },
  "timestamps": {
    "created_at": "ISO8601",
    "started_at": "ISO8601",
    "ended_at": "ISO8601"
  },
  "signature": {
    "alg": "ed25519",
    "key_id": "string",
    "sig": "Base64"
  }
}
```

## 2. Canonicalization
To ensure the signature is reproducible, the JSON must be **sorted by keys alphabetically** and stringified without whitespace before hashing.

**Hash Input Order**:
1. `receipt_id`
2. `request_id`
3. `meta` (sorted)
4. `operation` (sorted)
5. `proof.request_hash`
6. `proof.response_hash`
7. `proof.nonce`
8. `proof.prev_receipt_hash`
9. `decision` (sorted)
10. `economic` (sorted)
11. `timestamps` (sorted)

## 3. Receipt Reason Codes
Receipts MUST include the relevant reason codes from the policy/economic layer:
- `BUDGET_HARD_LIMIT`
- `PII_DETECTED`
- `SSRF_BLOCKED`
- `APPROVAL_REQUIRED`
- `DEFAULT_ALLOW`
- `TENANT_SCOPE_VIOLATION`
- `OVERRUN_EXCEEDED` (New for Phase 5)

## 4. Sequence
1. **Request Received** -> `01_parse_validate` -> `04_economic` (`ledger.reserve`)
2. **Upstream Call** -> `05_forward`
3. **Usage Capture** -> `06_capture`
4. **Settlement** -> `09_settlement` (`ledger.settle`)
5. **Receipt Emission** -> `07_receipt` (Sign & Store)

## 5. Persistence
Receipts are stored in the `ledger_receipts` table. This table is **APPEND-ONLY**.
- No `UPDATE` allowed.
- Deletions are forbidden by database policy (or handled via tombstones in next phases).

---
**Freeze Gate**: `receipt-contract-v0.1.0`
