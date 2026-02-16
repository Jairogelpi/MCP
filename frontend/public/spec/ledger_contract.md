# Ledger Contract Specification v0.1.0

## 1. Overview
The Ledger system provides ACID-compliant, 2-Phase Accounting for tracking economic consumption. It ensures zero double-spending, accurate cost tracking, and auditability via a state machine.

## 2. State Machine
Every economic operation (identified by `request_id`) transitions through the following states:

1.  **RESERVED**: Budget has been reserved based on estimation. Funds are "held" but not yet permanently deducted.
2.  **SETTLED**: Operation completed successfully. Actual cost is finalized.
3.  **REFUNDED**: Operation failed or cost was 0. Reserved funds are returned to the budget.
4.  **VOIDED**: Reservation expired or was explicitly cancelled (e.g. timeout) before settlement.
5.  **(Optional) OVERRUN**: Flagged state when `actual_cost > reserved_amount`. System still settles, but triggers an "Overrun" event for policy review.

### Transitions
- `(Start)` -> `RESERVED` (via `reserve()`)
- `RESERVED` -> `SETTLED` (via `settle()` with cost > 0)
- `RESERVED` -> `REFUNDED` (via `settle()` with cost 0 or error, or explicit `refund()`)
- `RESERVED` -> `VOIDED` (via `void()` or TTL expiry)

## 3. Operations

### 3.1 Reserve
Attempts to reserve budget for an estimated cost.

**Inputs:**
- `tenant_id`: string
- `project_id`: string (Scope)
- `agent_id`: string (Scope)
- `session_id`: string (optional)
- `request_id`: string (Idempotency Key)
- `amount_est`: number (Estimated Cost)
- `currency`: string (e.g. 'EUR')
- `pricing_version`: string (e.g. 'v0.1.0')
- `tool_name`: string
- `upstream_server_id`: string

**Outputs (Success):**
- `reserve_id`: string (ULID/UUID)
- `reserved_amount`: number
- `remaining_budget_after`: number (Snapshot)
- `expires_at`: number (Timestamp)

**Outputs (Failure):**
- Error: `BUDGET_EXCEEDED`
- Error: `LEDGER_CONFLICT_RETRY` (Opt-concurrency)

### 3.2 Settle
Finalizes the transaction with actual cost.

**Inputs:**
- `request_id`: string
- `amount_real`: number (Actual Cost)
- `breakdown`: object
    - `input_tokens`: number
    - `output_tokens`: number
    - `tool_fees`: number
    - `surcharges`: number
- `response_status`: 'ok' | 'error'
- `timestamp`: number

**Outputs:**
- `settled_amount`: number
- `refund_amount`: number (if `reserved > real`)
- `overrun_amount`: number (if `real > reserved`)
- `final_state`: 'SETTLED' | 'REFUNDED'

### 3.3 Void / Refund
Cancels a reservation.

**Inputs:**
- `request_id`: string
- `reason`: string

**Outputs:**
- `final_state`: 'VOIDED' | 'REFUNDED'

## 4. Error Codes

| Code | Status | Description |
| :--- | :--- | :--- |
| `BUDGET_EXCEEDED` | 402 | Hard limit reached. Reservation denied. |
| `IDEMPOTENCY_REPLAY` | 200/409 | Request ID already processed. Return previous result (if 200) or Conflict. |
| `LEDGER_CONFLICT_RETRY` | 409 | Optimistic locking failure. Client should retry. |
| `LEDGER_UNAVAILABLE` | 503 | Database down or locked. Fail-closed by default. |

## 5. Idempotency
- `reserve()` must be idempotent. Repeating the same `request_id` should return the existing `reserve_id` without double-reserving.
- `settle()` must be idempotent. Repeating `settle` on a `SETTLED` transaction is a no-op.
