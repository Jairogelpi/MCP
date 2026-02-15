# Regulatory & Payments Compliance

## 1. Payment Service Provider (PSP) Strategy
- **Role**: MCP Gateway is NOT a bank. We integrate with regulated EMI/PSP partners (Stripe Connect, Adyen for Platforms).
- **Funds Flow**:
  - `Payer` -> `PSP Custody` -> `Payee`
  - Gateway never touches raw funds (Compliance Shield).

## 2. KYC / KYB Requirements
Before receiving a Payout, a Provider (Payee) must pass:
1.  **Identity Verification**: Passport/ID upload via PSP hosted flow.
2.  **Business Verification**: Company Registry extract (if B2B).
3.  **Sanctions Screening**: OFAC/PEPs checks.

## 3. AML (Anti-Money Laundering) Policy
- **Transaction Monitoring**: Real-time screening of Payouts.
- **Red Flags**:
  - Structuring (multiple payouts just under $10k).
  - Rapid velocity (high volume of small txs to new payee).
  - Geolocation mismatch (IP vs Registered Address).
