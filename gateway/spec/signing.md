# Signing Specification (Spec v0.1.0)

## Overview
Digital signatures ensure the authenticity and integrity of receipts. By using asymmetric cryptography (Ed25519), the Gateway provides a "Proof of Execution" that cannot be forged or denied.

## 1. Algorithm: Ed25519
- **Selection**: Edwards-curve Digital Signature Algorithm (EdDSA) using Curve25519.
- **Why**: High performance, small keys (32 bytes), small signatures (64 bytes), and resilience against side-channel attacks.
- **Encoding**: Public keys and signatures MUST be stored as **Base64** strings.

## 2. Signature Payload
The signature is calculated over the **Canonical Receipt Object** (as per `spec/canonicalization.md`), with one critical exception:
- **Exclusion**: The `signature.sig` field MUST be empty or omitted during hashing/signing. The `key_id` and `alg` fields ARE included.

## 3. Key Management
- **Identity**: Every signature MUST include a `key_id`.
- **Registry**: Public keys are stored in the `key_registry` table, mapping `key_id` to the public key and status (active/rotated).
- **Security**: Private keys MUST NEVER be committed to the repository. They should be loaded via Environment Variables or a Secure Vault.

## 4. Non-Repudiation
Once a receipt is signed and stored in the append-only `ledger_receipts` table:
- The Gateway cannot claim it didn't process the request.
- The User has cryptographic proof of the settled cost and result.

---
**Freeze Gate**: `signing-v0.1.0`
