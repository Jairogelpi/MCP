# Selective Disclosure (Privacy-Preserving Proofs)

## 1. Goal
Prove that a transaction occurred and adhered to policy (e.g., Cost < $50) WITHOUT revealing the confidential Prompt or Response content.

## 2. Mechanism: Salted Hashing
Instead of storing/sharing raw fields, we share a "Redacted Receipt" where sensitive fields are replaced by their Hash + Salt.

## 3. Structure
**Original**:
```json
{ "prompt": "Buy 100 shares of AAPL", "cost": 100 }
```

**Redacted & Proved**:
```json
{
  "visible": { "cost": 100 },
  "hidden_hashes": {
    "prompt": "sha256(salt + 'Buy 100...')"
  },
  "verification_proof": "RootHash_Signed_By_Notary"
}
```

## 4. Verification
The verifier cannot read the prompt, but can verify the "Integrated Cost" matches the ledger and the "Root Hash" matches the signed Receipt.
