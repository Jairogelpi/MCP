# MCP Financial Rails Contract (V2.0)

## 1. Terminology
- **Payer**: The entity initiating the Tool Call (the "Consumer").
- **Payee**: The entity executing the Tool via an MCP Server (the "Provider").
- **Settlement**: The irreversible transfer of value from Payer to Payee.
- **Payout**: A diverse aggregation of Receipts settled in a single transaction.

## 2. Settlement Lifecycle
The flow of value follows these states:
1.  **Authorized**: Payer's budget checked, funds reserved (`PENDING`).
2.  **Captured**: Tool execution complete, Receipt produced (`SETTLED` in Ledger).
3.  **Aggregated**: `SETTLED` entries are grouped by Payee for a billing period.
4.  **Disbursed**: Funds transferred via external rail (Stripe/Wise/Crypto).

## 3. Settlement Identity
- **Payer ID**: `did:mcp:payer:<uuid>`
- **Payee ID**: `did:mcp:payee:<uuid>` (Must be linked to a Payout Method).

## 4. Windows & Timing
- **Standard**: **T+30** (Monthly Net 30).
- **Accelerated**: **T+7** (Weekly).
- **Instant**: **T+0** (Per-request, requires pre-funded wallet).

## 5. Currency & FX
- **Base Currency**: The Rails operate in **Micro-USD** (1/1,000,000 USD) for precision.
- **Presentation**: Gateways MAY display local currency (EUR/GBP).
- **FX Risk**: Borne by the Payer at the moment of Authorization (Spot Rate).

## 6. Taxes
- **Place of Supply**: Determined by Payee's jurisdiction.
- **Calculation**: Tax is calculated *on top* of the Tool Price.
- **Remittance**: Payee is responsible for remittance unless Marketplace Facilitator laws apply.
