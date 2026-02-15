# Ledger Invariants & Properties

## 1. The Golden Equation
For any closed system (Scope/Tenant), at any transaction boundary `t`:
```
Sum(All Account Balances) = 0
```
*Note: This implies "System Liquidity" accounts exist to balance user deposits.*

Alternatively, for a standard Double-Entry system:
```
Sum(Debits) == Sum(Credits)
```
for *every* transaction batch.

## 2. Properties
1.  **No Negative Balances**: Unless explicitly allowed (Overdraft protection).
2.  **Monotonicity**: `created_at` timestamps must be non-decreasing for a sequence of linked transactions.
3.  **Idempotency**: Replaying the same `tx_id` yields the exact same state (no double spend).
4.  **Chain Continuity**: `prev_hash` of Entry N matches `hash` of Entry N-1.

## 3. Fuzzing Strategy
- **Random Inputs**:
  - Valid Transfers
  - Invalid Transfers (insufficient funds, wrong currency)
  - Concurrent Transfers (race conditions)
- **Check**: assert invariants after every batch.
