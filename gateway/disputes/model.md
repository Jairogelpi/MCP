# Dispute & Chargeback Framework

## 1. Dispute Lifecycle
1.  **OPEN**: Payer challenges a Transaction (Receipt ID).
2.  **EVIDENCE_REQUIRED**: Gateway requests proof from Payee (Provider).
3.  **SUBMITTED**: Payee provides "Evidence Bundle" (Signed Receipt + Trace + Attestation).
4.  **ARBITRATION**: Automated check of signatures + Manual review if needed.
5.  **RESOLVED**:
    - **ACCEPTED**: Chargeback granted (Payer wins).
    - **DENIED**: Transaction valid (Payee wins).

## 2. Evidence Bundle Format
A JSON object containing verifiable proofs:
```json
{
  "dispute_id": "dsp_123",
  "receipt": { ...original_signed_receipt... },
  "trace_summary": { "trace_id": "...", "duration": "120ms" },
  "attestation": { ...notary_signature... },
  "ledger_entry": { "id": "le_999", "status": "SETTLED" }
}
```

## 3. Automation
- If `Receipt` signature is valid AND `Attestation` from trusted Notary is present -> **Auto-Deny** Dispute (Provider protected).
- If `Receipt` missing or signature invalid -> **Auto-Accept** Dispute (Payer refunded).
