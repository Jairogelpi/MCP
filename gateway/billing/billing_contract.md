# Billing Contract & Period Governance

## 1. Principles
- **Ledger-based Settlement**: All billing is derived from `ledger_entries` where `status = "SETTLED"`.
- **Monthly Periods**: Billing periods open on the 1st and close on the last day of each month.
- **Sealing**: Once a period is SEALED, no further ledger entries can be associated with it. Any late settlements move to the next OPEN period.

## 2. Invoice Generation
- **Aggregation**: `SUM(amount)` from ledger entries within `[start_date, end_date]`.
- **References**: Each invoice line must link to a `ledger_id`.
- **Consistency**: `Invoice.total_amount` MUST match `AggregatedSettlements(period)`.

## 3. Multi-Currency
- Settlements are recorded in their original currency.
- Invoices are issued in the Tenant's primary account currency (default EUR).
- Exchange rates are fixed at the moment of `closePeriod`.
